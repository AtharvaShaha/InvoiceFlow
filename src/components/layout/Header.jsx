/**
 * Header - Top navigation bar with page title and mobile menu toggle
 */
import { Menu, Bell } from 'lucide-react';

export default function Header({ title, onMenuToggle }) {
  return (
    <header className="sticky top-0 z-30 h-16 bg-surface/95 backdrop-blur-sm border-b border-ink-200 flex items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden p-2 rounded-md text-ink-500 hover:bg-ink-100 transition-colors"
          onClick={onMenuToggle}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-lg font-semibold text-ink-900 m-0 leading-none">{title}</h1>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Mode indicator */}
        {import.meta.env.VITE_API_BASE_URL ? (
          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-success-50 text-success-600 border border-success-500/20">
            Live
          </span>
        ) : (
          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-warning-50 text-warning-600 border border-warning-500/20">
            Demo Data
          </span>
        )}
        
        {/* Notification bell (decorative for MVP) */}
        <button
          className="relative p-2 rounded-md text-ink-500 hover:bg-ink-100 transition-colors"
          aria-label="Notifications (no new notifications)"
          title="No new notifications"
        >
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
}
