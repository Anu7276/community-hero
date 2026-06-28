const express = require('express');
const router = express.Router();
const {
  getIssues,
  getIssue,
  getComments,
  addComment,
  setVote,
  updateIssue,
  streamImage,
} = require('../db/init');

// GET all issues with filters
router.get('/', async (req, res) => {
  const { severity, type, status, limit = 50 } = req.query;
  let issues = await getIssues();

  if (severity) issues = issues.filter(i => i.severity === severity);
  if (type) issues = issues.filter(i => i.issue_type === type);
  if (status) issues = issues.filter(i => i.status === status);

  issues = issues
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, parseInt(limit));

  // Safe JSON parse for proactive_insights
  issues = issues.map(i => ({
    ...i,
    proactive_insights: (() => {
      try {
        return typeof i.proactive_insights === 'string'
          ? JSON.parse(i.proactive_insights || '[]')
          : (i.proactive_insights || [])
      } catch { return [] }
    })()
  }));

  res.json(issues);
});

// GET stats — WIN FEATURE #1: added totalPeopleProtected, totalCostPrevented, avgResolutionDays
router.get('/meta/stats', async (req, res) => {
  const issues = await getIssues();
  const sessionId = req.query.sessionId || null;
  const now = new Date();
  const yesterday = new Date(now - 24 * 60 * 60 * 1000);

  const byType = {};
  const bySeverity = {};
  const reporterScores = {};

  issues.forEach(i => {
    byType[i.issue_type] = (byType[i.issue_type] || 0) + 1;
    bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;

    const name = i.reporter_name || 'Anonymous';
    if (!reporterScores[name]) reporterScores[name] = 0;
    reporterScores[name] += 10;
    if (i.status === 'resolved') reporterScores[name] += 20;
    if (i.severity === 'CRITICAL') reporterScores[name] += 15;
    if (i.upvotes >= 5) reporterScores[name] += 10;
  });

  const topReporters = Object.entries(reporterScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, score], i) => ({
      name, score,
      badge: ['Hero Reporter', 'Issue Verifier', 'Quick Responder'][i],
      medal: ['🥇', '🥈', '🥉'][i]
    }));

  const myIssues = issues.filter(i => i.session_id === sessionId);
  const myScore = myIssues.reduce((acc, i) => {
    let s = 10;
    if (i.status === 'resolved') s += 20;
    if (i.severity === 'CRITICAL') s += 15;
    if (i.upvotes >= 5) s += 10;
    return acc + s;
  }, 0);

  // WIN FEATURE #1: live impact counters
  const totalPeopleProtected = issues.reduce((acc, i) => acc + (i.affected_population || 0), 0);
  const totalCostPrevented = issues
    .filter(i => i.status === 'resolved')
    .reduce((acc, i) => acc + (i.estimated_cost_inr || 0), 0);
  const resolvedWithDays = issues.filter(i => i.status === 'resolved' && i.estimated_fix_days);
  const avgResolutionDays = resolvedWithDays.length > 0
    ? Math.round(resolvedWithDays.reduce((acc, i) => acc + i.estimated_fix_days, 0) / resolvedWithDays.length)
    : 0;

  res.json({
    total: issues.length,
    critical: issues.filter(i => i.severity === 'CRITICAL').length,
    resolved: issues.filter(i => i.status === 'resolved').length,
    pending: issues.filter(i => i.status === 'pending').length,
    byType: Object.entries(byType).map(([issue_type, count]) => ({ issue_type, count })),
    bySeverity: Object.entries(bySeverity).map(([severity, count]) => ({ severity, count })),
    recent: issues.filter(i => new Date(i.created_at) > yesterday).slice(0, 5),
    topReporters,
    myScore,
    myIssuesCount: myIssues.length,
    totalPeopleProtected,
    totalCostPrevented,
    avgResolutionDays,
  });
});

// WIN FEATURE #3: Hotspot Pattern Detection — MUST be before /:id
router.get('/meta/hotspots', async (req, res) => {
  try {
    const issues = await getIssues();
    const issuesWithCoords = issues.filter(i => i.latitude && i.longitude);

    if (issuesWithCoords.length < 2) {
      return res.json({ hotspots: [] });
    }

    function haversine(lat1, lon1, lat2, lon2) {
      const R = 6371000;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 +
        Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    const hotspots = [];
    const visited = new Set();

    issuesWithCoords.forEach((issue, idx) => {
      if (visited.has(idx)) return;
      const cluster = [issue];
      visited.add(idx);

      issuesWithCoords.forEach((other, i) => {
        if (i === idx || visited.has(i)) return;
        const dist = haversine(issue.latitude, issue.longitude, other.latitude, other.longitude);
        if (dist <= 500) {
          cluster.push(other);
          visited.add(i);
        }
      });

      if (cluster.length >= 2) {
        const types = [...new Set(cluster.map(i => i.issue_type))];
        const severities = cluster.map(i => i.severity);
        const hasCritical = severities.includes('CRITICAL');
        const hasHigh = severities.includes('HIGH');
        const totalAffected = cluster.reduce((acc, i) => acc + (i.affected_population || 0), 0);
        const dominantType = cluster.reduce((acc, i) => {
          acc[i.issue_type] = (acc[i.issue_type] || 0) + 1;
          return acc;
        }, {});
        const topType = Object.entries(dominantType).sort((a,b) => b[1]-a[1])[0][0];

        hotspots.push({
          id: `hotspot-${idx}`,
          center_lat: cluster.reduce((acc, i) => acc + i.latitude, 0) / cluster.length,
          center_lng: cluster.reduce((acc, i) => acc + i.longitude, 0) / cluster.length,
          issue_count: cluster.length,
          types,
          dominant_type: topType,
          severity: hasCritical ? 'CRITICAL' : hasHigh ? 'HIGH' : 'MEDIUM',
          total_affected: totalAffected,
          area_description: cluster[0].issue_address || cluster[0].area_description || 'Unknown area',
          recommendation: cluster.length >= 4
            ? 'Systematic infrastructure failure detected. Full area audit recommended.'
            : cluster.length >= 3
            ? 'Multiple related issues detected. Coordinated repair recommended.'
            : 'Cluster of issues detected. Joint inspection recommended.',
          issue_ids: cluster.map(i => i.id),
        });
      }
    });

    res.json({ hotspots: hotspots.sort((a, b) => b.issue_count - a.issue_count) });
  } catch (err) {
    console.error('Hotspot detection error:', err);
    res.json({ hotspots: [] }); // never crash — return empty
  }
});

// GET single issue
router.get('/images/:fileName', async (req, res) => {
  try {
    await streamImage(req.params.fileName, res)
  } catch (err) {
    console.error('Image load error:', err)
    if (!res.headersSent) res.status(500).json({ error: 'Failed to load image' })
  }
});

// GET single issue
router.get('/:id', async (req, res) => {
  const issue = await getIssue(req.params.id);
  if (!issue) return res.status(404).json({ error: 'Issue not found' });

  const comments = await getComments(issue.id);

  const parsedIssue = {
    ...issue,
    proactive_insights: (() => {
      try {
        return typeof issue.proactive_insights === 'string'
          ? JSON.parse(issue.proactive_insights || '[]')
          : (issue.proactive_insights || [])
      } catch { return [] }
    })()
  };

  res.json({ ...parsedIssue, comments });
});

// POST vote
router.post('/:id/vote', async (req, res) => {
  const { voteType, sessionId } = req.body;

  if (!['up', 'down'].includes(voteType)) {
    return res.status(400).json({ error: 'Invalid vote type' });
  }

  const result = await setVote(req.params.id, sessionId, voteType);
  if (!result) return res.status(404).json({ error: 'Issue not found' });

  const { issue, upvotes, downvotes } = result;
  req.app.get('io').emit('issue_updated', issue);
  res.json({ success: true, upvotes, downvotes });
});

// PATCH status — Admin protected
router.patch('/:id/status', async (req, res) => {
  const ADMIN_KEY = process.env.ADMIN_KEY || 'community-hero-admin';
  const providedKey = req.headers['x-admin-key'];
  if (providedKey !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { status } = req.body;
  const allowed = ['pending', 'verified', 'in_progress', 'resolved'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const issue = await updateIssue(req.params.id, current => ({
    ...current,
    status,
    updated_at: new Date().toISOString(),
  }));
  if (!issue) return res.status(404).json({ error: 'Not found' });

  req.app.get('io').emit('issue_updated', issue);
  res.json({ success: true, issue });
});

// POST comment
router.post('/:id/comments', async (req, res) => {
  const { commenterName, comment } = req.body;
  if (!comment?.trim()) return res.status(400).json({ error: 'Comment required' });

  if (comment.trim().length > 1000) {
    return res.status(400).json({ error: 'Comment too long' });
  }

  const newComment = {
    id: Date.now(),
    issue_id: parseInt(req.params.id),
    commenter_name: commenterName || 'Anonymous',
    comment: comment.trim(),
    created_at: new Date().toISOString(),
  };

  await addComment(newComment);
  res.json({ success: true, id: newComment.id });
});

router.post('/:id/resolve-photo', async (req, res) => {
  try {
    const { resolvePhoto, resolvedBy } = req.body
    if (!resolvePhoto) return res.status(400).json({ error: 'Photo required' })
    const issue = await updateIssue(req.params.id, current => ({
      ...current,
      resolve_photo: resolvePhoto,
      resolved_by: resolvedBy || 'Authority',
      resolved_at: new Date().toISOString(),
      status: 'resolved',
      updated_at: new Date().toISOString(),
    }))
    if (!issue) return res.status(404).json({ error: 'Issue not found' })
    req.app.get('io').emit('issue_updated', issue)
    res.json({ success: true, issue })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update' })
  }
})

module.exports = router;
