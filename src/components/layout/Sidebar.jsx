/**
 * Sidebar - Main navigation sidebar for InvoiceFlow
 */
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Upload, 
  FileText, 
  BarChart3, 
  Settings,
  X,
  FileStack
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/upload', label: 'Upload Invoice', icon: Upload },
  { to: '/invoices', label: 'Invoice History', icon: FileText },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 lg:hidden" 
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-surface border-r border-ink-200
          sidebar-transition flex flex-col
          lg:static lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-ink-200 shrink-0">
          <NavLink to="/" className="flex items-center gap-2.5 no-underline" onClick={onClose}>
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <FileStack size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-ink-900 tracking-tight">
              Invoice<span className="text-brand-600">Flow</span>
            </span>
          </NavLink>
          <button
            className="lg:hidden p-1.5 rounded-md text-ink-500 hover:bg-ink-100 transition-colors"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Nav links */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          <ul className="list-none p-0 m-0 space-y-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  onClick={onClose}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-colors no-underline
                    ${isActive 
                      ? 'bg-brand-50 text-brand-700' 
                      : 'text-ink-600 hover:bg-ink-100 hover:text-ink-800'
                    }
                  `}
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* Footer */}
        <div className="px-4 py-4 border-t border-ink-200 shrink-0">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
              <span className="text-xs font-bold text-brand-700">AF</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-800 truncate m-0">Atharva</p>
              <p className="text-xs text-ink-400 m-0">Demo Account</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
