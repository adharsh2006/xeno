import { NavLink, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, Users, Tag, Megaphone, BarChart3, 
  Zap, Sparkles
} from 'lucide-react'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/segments', label: 'Segments', icon: Tag },
  { path: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-gray-900 flex flex-col z-40 select-none">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-800">
        <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center flex-shrink-0 shadow-lg">
          <Zap size={16} className="text-white" />
        </div>
        <div>
          <div className="font-bold text-white text-sm leading-tight">BrewCo CRM</div>
          <div className="text-gray-500 text-xs">AI-Native Platform</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = path === '/' 
            ? location.pathname === '/' 
            : location.pathname.startsWith(path)

          return (
            <NavLink
              key={path}
              to={path}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group
                ${isActive 
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-white rounded-r-full" />
              )}
              <Icon size={17} className={isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'} />
              {label}
            </NavLink>
          )
        })}
      </nav>

      {/* AI Copilot badge */}
      <div className="px-4 pb-5">
        <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2.5">
          <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
          <Sparkles size={13} className="text-primary-400" />
          <span className="text-xs text-gray-300 font-medium">AI Copilot Active</span>
        </div>
      </div>
    </aside>
  )
}
