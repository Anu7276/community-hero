import { useState, createContext, useContext } from 'react'

const translations = {
  en: {
    appName: 'Community Hero',
    tagline: 'AI-powered issue reporting for your neighbourhood',
    reportIssue: 'Report Issue',
    issuesReported: 'Issues Reported',
    resolved: 'Resolved',
    peopleProtected: 'People Protected',
    avgResolution: 'Avg Resolution',
    total: 'Total',
    critical: 'Critical',
    pending: 'Pending',
    home: 'Home',
    map: 'Map',
    report: 'Report',
    back: 'Back',
    share: 'Share',
    confirm: 'Confirm',
    dispute: 'Dispute',
    noIssues: 'No issues found',
    analyzing: 'Analyzing with Gemini AI...',
    analyzeBtn: 'Analyze with AI',
    tapUpload: 'Tap to upload photo',
    yourName: 'Your Name',
    describe: 'Describe the issue',
    captureGPS: 'Capture GPS Location',
    filters: 'Filters',
    refresh: 'Refresh',
    viewNow: 'View Issue Now',
    issueReported: 'Issue Reported Successfully!',
    noComments: 'No updates yet. Be the first!',
  },
  hi: {
    appName: 'कम्युनिटी हीरो',
    tagline: 'आपके मोहल्ले के लिए AI-संचालित समस्या रिपोर्टिंग',
    reportIssue: 'समस्या रिपोर्ट करें',
    issuesReported: 'रिपोर्ट की गई समस्याएं',
    resolved: 'हल हुई',
    peopleProtected: 'लोग सुरक्षित',
    avgResolution: 'औसत समाधान',
    total: 'कुल',
    critical: 'गंभीर',
    pending: 'लंबित',
    home: 'होम',
    map: 'नक्शा',
    report: 'रिपोर्ट',
    back: 'वापस',
    share: 'शेयर',
    confirm: 'पुष्टि करें',
    dispute: 'विवाद करें',
    noIssues: 'कोई समस्या नहीं मिली',
    analyzing: 'Gemini AI से विश्लेषण हो रहा है...',
    analyzeBtn: 'AI से विश्लेषण करें',
    tapUpload: 'फोटो अपलोड करने के लिए टैप करें',
    yourName: 'आपका नाम',
    describe: 'समस्या बताएं',
    captureGPS: 'GPS स्थान कैप्चर करें',
    filters: 'फ़िल्टर',
    refresh: 'रीफ्रेश',
    viewNow: 'समस्या देखें',
    issueReported: 'समस्या सफलतापूर्वक रिपोर्ट हुई!',
    noComments: 'अभी तक कोई अपडेट नहीं। पहले शेयर करें!',
  }
}

export const LanguageContext = createContext(null)

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}

export function useLanguageProvider() {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en')
  function toggleLang() {
    const next = lang === 'en' ? 'hi' : 'en'
    setLang(next)
    localStorage.setItem('lang', next)
  }
  const t = translations[lang]
  return { lang, toggleLang, t }
}
