const express = require('express');
const multer = require('multer');
const router = express.Router();
const { analyzeImage } = require('../controllers/geminiController');
const { readDB, writeDB } = require('../db/init');

// Memory storage — no disk writes
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/jpeg|jpg|png|webp/.test(file.mimetype)) cb(null, true);
    else if (/mp4|mov|avi|webm|quicktime/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image or video files allowed'));
  }
});

// Simple in-memory rate limiter (15s cooldown per IP)
const rateMap = new Map();

// Clean old entries every 10 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, last] of rateMap.entries()) {
    if (now - last > 60000) rateMap.delete(ip);
  }
}, 10 * 60 * 1000);

const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const last = rateMap.get(ip) || 0;
  if (now - last < 15000) {
    const wait = Math.ceil((15000 - (now - last)) / 1000);
    return res.status(429).json({ error: `Please wait ${wait} seconds before analyzing again` });
  }
  rateMap.set(ip, now);
  next();
};

router.post('/', rateLimiter, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const isVideo = req.file.mimetype.startsWith('video/')
    if (!isVideo && req.file.size > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image too large. Maximum size is 2MB.' })
    }
    if (isVideo && req.file.size > 20 * 1024 * 1024) {
      return res.status(400).json({ error: 'Video too large. Maximum size is 20MB.' })
    }

    // Input validation
    if (req.body.userContext && req.body.userContext.length > 500) {
      return res.status(400).json({ error: 'Context too long' });
    }
    if (req.body.userLat && isNaN(parseFloat(req.body.userLat))) {
      return res.status(400).json({ error: 'Invalid latitude' });
    }
    if (req.body.userLng && isNaN(parseFloat(req.body.userLng))) {
      return res.status(400).json({ error: 'Invalid longitude' });
    }
    const reporterName = (req.body.reporterName || 'Anonymous').slice(0, 50).replace(/[<>]/g, '');
    const issueAddress = (req.body.issueAddress || '').trim().slice(0, 300).replace(/[<>]/g, '') || null;
    const { userContext, userLat, userLng } = req.body;

    if (req.body.issueAddress && req.body.issueAddress.length > 300) {
      return res.status(400).json({ error: 'Address too long' });
    }

    // Pass buffer + mimeType to analyzer
    const analysis = await analyzeImage(req.file.buffer, req.file.mimetype, userContext || '');

    // Override with GPS if provided
    if (userLat && userLng && analysis.location_information) {
      analysis.location_information.estimated_latitude = parseFloat(userLat);
      analysis.location_information.estimated_longitude = parseFloat(userLng);
      analysis.location_information.geo_confidence = 1.0;
    }

    let savedId = null;
    let autoAlert = null;

    if (analysis.issue_detection?.issue_found) {
      const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

      const db = readDB();
      const locationLabel = issueAddress || analysis.location_information?.area_description || 'Unknown Location';
      const newIssue = {
        id: db._nextId++,
        title: `${analysis.issue_detection?.issue_type || 'ISSUE'} — ${locationLabel}`,
        description: analysis.visual_analysis?.description || '',
        issue_type: analysis.issue_detection?.issue_type || 'OTHER',
        severity: analysis.severity_assessment?.severity_level || 'MEDIUM',
        status: 'pending',
        latitude: analysis.location_information?.estimated_latitude || null,
        longitude: analysis.location_information?.estimated_longitude || null,
        issue_address: issueAddress,
        area_description: analysis.location_information?.area_description || null,
        image_path: base64Image,
        reporter_name: reporterName,
        session_id: req.body.sessionId || null,
        confidence_overall: analysis.metadata?.confidence_overall || 0,
        authenticity_score: analysis.verification?.authenticity_score || 0,
        affected_population: analysis.impact_assessment?.estimated_affected_people || 0,
        risk_level: analysis.impact_assessment?.risk_level || 'MEDIUM',
        required_authority: analysis.resolution_guidance?.required_authority || null,
        estimated_fix_days: analysis.resolution_guidance?.estimated_fix_days || null,
        estimated_cost_inr: analysis.resolution_guidance?.estimated_cost_inr || null,
        ai_reasoning: analysis.issue_detection?.reasoning || null,
        proactive_insights: JSON.stringify(analysis.proactive_insights || []),
        alert_urgency: analysis.community_alert?.alert_urgency || null,
        upvotes: 0,
        downvotes: 0,
        verified_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      db.issues.push(newIssue);
      await writeDB(db);
      savedId = newIssue.id;

      req.app.get('io').emit('new_issue', {
        ...newIssue,
        proactive_insights: analysis.proactive_insights || []
      });

      // WIN FEATURE #4: Auto-alert agent for CRITICAL issues
      if (analysis.severity_assessment?.severity_level === 'CRITICAL') {
        autoAlert = {
          generated_at: new Date().toISOString(),
          alert_type: 'CRITICAL_INFRASTRUCTURE_ALERT',
          draft_message: `URGENT: A critical infrastructure issue has been reported at ${
            issueAddress || analysis.location_information?.area_description || 'Unknown Location'
          }. Issue Type: ${analysis.issue_detection?.issue_type || 'CRITICAL'}. ${
            analysis.severity_assessment?.reasoning || ''
          } Immediate action required within ${
            analysis.community_alert?.recommended_response_time || '1 hour'
          }. Estimated ${
            analysis.impact_assessment?.estimated_affected_people || 'many'
          } people affected. Recommended authority: ${
            analysis.resolution_guidance?.required_authority?.replace(/_/g, ' ') || 'Municipal Corporation'
          }. Please dispatch team immediately.`,
          escalation_path: [
            'Ward Officer',
            'Municipal Corporation',
            analysis.resolution_guidance?.required_authority?.replace(/_/g, ' ') || 'Concerned Authority',
          ],
          sla: analysis.community_alert?.recommended_response_time || '1 hour',
          issue_id: savedId,
        };
      }
    }

    res.json({ success: true, analysis, _savedId: savedId, autoAlert });
  } catch (err) {
    console.error('Analysis error:', err.message || err);
    // Provide user-friendly error messages based on error type
    if (err.message?.includes('API_KEY') || err.message?.includes('API key') || err.status === 401 || err.status === 403) {
      return res.status(500).json({ error: 'AI service is not configured correctly. Please contact support.' });
    }
    if (err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED') || err.status === 429) {
      return res.status(429).json({ error: 'AI service quota exceeded. Please try again in a few minutes.' });
    }
    if (err.message?.includes('timed out') || err.message?.includes('timeout') || err.message?.includes('DEADLINE_EXCEEDED')) {
      return res.status(500).json({ error: 'AI analysis timed out. Please try again with a smaller or clearer image.' });
    }
    if (err.message?.includes('overloaded') || err.status === 503) {
      return res.status(500).json({ error: 'AI service is temporarily overloaded. Please try again in a moment.' });
    }
    res.status(500).json({ error: err.message || 'Analysis failed. Please try again.' });
  }
});

// Handle multer errors with clean JSON responses
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 2MB for images and 20MB for videos.' });
  }
  if (err.message === 'Only image files allowed' || err.message === 'Only image or video files allowed') {
    return res.status(400).json({ error: 'Invalid file type. Only images (JPG/PNG/WebP) or videos (MP4/MOV) are allowed.' });
  }
  console.error('Unexpected error:', err.message);
  return res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

module.exports = router;
