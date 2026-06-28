import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import BottomNav from './components/BottomNav'
import ErrorBoundary from './components/ErrorBoundary'
import Dashboard from './pages/Dashboard'
import ReportIssue from './pages/ReportIssue'
import MapView from './pages/MapView'
import IssueDetail from './pages/IssueDetail'
import { LanguageContext, useLanguageProvider } from './hooks/useLanguage'
import AuthorityDashboard from './pages/AuthorityDashboard'

function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 bg-white">
      <div className="text-center fade-in rounded-xl bg-white border border-slate-200 p-8 shadow-sm">
        <p className="text-6xl mb-4">🛡️</p>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Page Not Found</h1>
        <p className="text-slate-500 mb-6 text-sm">The page you're looking for doesn't exist.</p>
        <Link to="/" className="btn-primary inline-flex">Go Home</Link>
      </div>
    </div>
  )
}

function AppContent() {
  const { pathname } = useLocation()
  const isMapPage = pathname === '/map'

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className={`flex-1 bg-white ${isMapPage ? 'pb-16 sm:pb-0 overflow-hidden' : 'pb-16 sm:pb-0'}`}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/report" element={<ReportIssue />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/issues/:id" element={<IssueDetail />} />
          <Route path="/authority" element={<AuthorityDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isMapPage && <Footer />}
      <BottomNav />
    </div>
  )
}

export default function App() {
  const langCtx = useLanguageProvider()

  return (
    <ErrorBoundary>
      <LanguageContext.Provider value={langCtx}>
        <BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#F8FAFC',
              color: '#0F172A',
              border: '1px solid #CBD5E1',
              borderRadius: '16px',
              fontSize: '14px',
              maxWidth: '340px',
            },
            duration: 3000,
          }}
        />
        <AppContent />
        </BrowserRouter>
      </LanguageContext.Provider>
    </ErrorBoundary>
  )
}
