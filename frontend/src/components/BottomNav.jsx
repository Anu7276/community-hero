import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Map, FilePlus, Shield } from 'lucide-react'

export default function BottomNav() {
  const { pathname } = useLocation()

  const items = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/report', icon: FilePlus, label: 'Report', primary: true },
    { to: '/map', icon: Map, label: 'Map' },
    { to: '/authority', icon: Shield, label: 'Authority' },
  ]

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 safe-area-pb shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-around h-16 px-2">
        {items.map(({ to, icon: Icon, label, primary }) => {
          const active = pathname === to || (to !== '/' && pathname.startsWith(to))
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 touch-manipulation ${
                active ? 'text-[#1e40af]' : 'text-slate-500'
              }`}
            >
              {primary ? (
                <div className="flex flex-col items-center gap-0.5">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                    active ? 'bg-[#1e40af] shadow-md' : 'bg-[#1e40af]/10'
                  }`}>
                    <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-[#1e40af]'}`} />
                  </div>
                  <span className="text-[10px] font-semibold">Report</span>
                </div>
              ) : (
                <>
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{label}</span>
                </>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
