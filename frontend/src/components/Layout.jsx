import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Sparkles } from 'lucide-react'

const pageTitles = {
  '/': 'Dashboard',
  '/customers': 'Customers',
  '/segments': 'Segments',
  '/campaigns': 'Campaigns',
  '/analytics': 'Analytics',
}

export default function Layout() {
  const location = useLocation()
  const title = Object.entries(pageTitles)
    .reverse()
    .find(([path]) => location.pathname.startsWith(path))?.[1] || 'BrewCo CRM'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-60 flex flex-col min-h-screen overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100 sticky top-0 z-30">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-primary-50 text-primary-600 px-3 py-1.5 rounded-full text-xs font-semibold">
              <Sparkles size={12} />
              AI Copilot Active
            </div>
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:bg-primary-600 transition-colors">
              AD
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="page-enter p-8 min-h-full" key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
