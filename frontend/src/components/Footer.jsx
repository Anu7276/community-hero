import { Heart, Shield } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="mt-auto mb-16 sm:mb-0 border-t border-gray-800 bg-black">
      <div className="gov-stripe gov-stripe-footer">
        <div className="gov-stripe-saffron" />
        <div className="gov-stripe-white" />
        <div className="gov-stripe-green" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1e40af]/20 border border-[#1e40af]/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Community Hero</p>
              <p className="text-[11px] text-gray-400">Citizen-first public grievance platform</p>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <p className="text-sm text-gray-300 flex items-center justify-center sm:justify-end gap-1.5 flex-wrap">
              Created with
              <Heart className="w-3.5 h-3.5 text-[#FF0000] fill-[#FF0000] inline" />
              by <span className="font-semibold text-white">Anurag</span> for our country
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              Serving Bharat · One report at a time 🇮🇳
            </p>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-gray-500">
          <span>© {new Date().getFullYear()} Community Hero · Public Issue Portal</span>
          <span className="hidden sm:inline">Made for citizens, by citizens</span>
        </div>
      </div>
    </footer>
  )
}
