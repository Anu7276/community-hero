import axios from 'axios'

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`,
  timeout: 35000, // 35s — slightly more than Gemini 30s timeout
})

// Global response interceptor for network errors
api.interceptors.response.use(
  res => res,
  err => {
    if (!err.response && err.code === 'ECONNABORTED') {
      err.message = 'Request timed out. Please try again.'
    } else if (!err.response) {
      err.message = 'Network error. Check your connection.'
    }
    return Promise.reject(err)
  }
)

export const issuesAPI = {
  getAll: (params) => api.get('/issues', { params }),
  getOne: (id) => api.get(`/issues/${id}`),
  vote: (id, voteType, sessionId) => api.post(`/issues/${id}/vote`, { voteType, sessionId }),
  updateStatus: (id, status, adminKey) => api.patch(`/issues/${id}/status`, { status }, {
    headers: { 'x-admin-key': adminKey }
  }),
  addComment: (id, data) => api.post(`/issues/${id}/comments`, data),
  getStats: (sessionId) => api.get('/issues/meta/stats', { params: { sessionId } }),
  getHotspots: () => api.get('/issues/meta/hotspots'),
  resolvePhoto: (id, resolvePhoto, resolvedBy) => api.post(`/issues/${id}/resolve-photo`, { resolvePhoto, resolvedBy }),
}

export const analyzeAPI = {
  analyze: (formData) => api.post('/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 40000, // Extra time for image upload + Gemini processing
  })
}

export default api

export function shareOnWhatsApp(title, url) {
  const text = encodeURIComponent(`🚨 Community Issue: ${title}\nView & verify: ${url}`)
  window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
}

export function shareIssue(title, url) {
  if (navigator.share) {
    navigator.share({ title, text: 'Check this community issue!', url }).catch(() => shareOnWhatsApp(title, url))
  } else {
    shareOnWhatsApp(title, url)
  }
}
