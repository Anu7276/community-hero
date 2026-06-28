import { Link, useLocation } from 'react-router-dom'
import { Shield, Map, FilePlus, LayoutDashboard, Bell } from 'lucide-react'
import { useLanguage } from '../hooks/useLanguage'
import { usePushNotifications } from '../hooks/usePushNotifications'

export default function Navbar() {
  const { pathname } = useLocation()
  const { lang, toggleLang } = useLanguage()
  const { supported, permission, requestPermission } = usePushNotifications()

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/report', icon: FilePlus, label: 'Report Issue' },
    { to: '/map', icon: Map, label: 'Map View' },
  ]

  return (
    <div className="sticky top-0 z-50 m-0 pt-0 pb-1 px-3 sm:px-4">
      <header className="rounded-2xl overflow-hidden bg-white/80 backdrop-blur-xl shadow-[0_4px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/50">
        <div className="gov-stripe gov-stripe-nav">
          <div className="gov-stripe-saffron" />
          <div className="gov-stripe-white" />
          <div className="gov-stripe-green" />
        </div>

        <div className="border-b border-slate-200/60 bg-transparent">
          <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-500">
            <span>Government of India · Citizen Services Portal</span>
            <span className="hidden sm:inline">AI-Assisted Public Grievance Reporting</span>
          </div>
        </div>

        <nav className="bg-transparent">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-[#1e40af]/10 rounded-lg flex items-center justify-center border border-[#1e40af]/15 group-hover:bg-[#1e40af]/15 transition-colors">
                <Shield className="text-[#1e40af] w-5 h-5" />
              </div>
              <div>
                <span className="block font-bold text-slate-900 text-sm leading-tight">Community Hero</span>
                <span className="block text-[10px] text-slate-500 font-medium uppercase tracking-wider">Public Issue Portal</span>
              </div>
            </Link>

            <div className="hidden sm:flex items-center gap-1">
              {navItems.map(({ to, icon: Icon, label }) => {
                const active = pathname === to || (to !== '/' && pathname.startsWith(to))
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
                      active
                        ? 'bg-[#1e40af] text-white border-[#1e40af] shadow-sm'
                        : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-white/60 hover:border-slate-200/80'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </Link>
                )
              })}
              <button
                onClick={toggleLang}
                title={lang === 'en' ? 'Switch to Hindi' : 'Switch to English'}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-400 transition-all touch-manipulation min-h-[36px] text-sm font-medium ml-1"
              >
                <span className="text-base">{lang === 'en' ? '🇮🇳' : '🇬🇧'}</span>
                <span className="hidden sm:inline text-xs">{lang === 'en' ? 'हिं' : 'EN'}</span>
              </button>
              {supported && permission !== 'granted' && (
                <button
                  onClick={requestPermission}
                  title="Enable notifications"
                  className="relative flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200/80 bg-white/40 text-slate-600 hover:text-slate-900 hover:bg-white/70 transition-all"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-[#FF9933] rounded-full" />
                </button>
              )}
            </div>
          </div>
        </nav>
      </header>
    </div>
  )
}
