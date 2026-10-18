/**
 * EmptyState - Consistent empty/no-results state display
 */
import { Inbox } from 'lucide-react';

export default function EmptyState({ 
  icon: Icon = Inbox, 
  title = 'No data found', 
  message = '', 
  action = null 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-ink-100 flex items-center justify-center mb-4">
        <Icon size={28} className="text-ink-400" />
      </div>
      <h3 className="text-base font-semibold text-ink-800 mb-1">{title}</h3>
      {message && <p className="text-sm text-ink-500 max-w-sm mb-4">{message}</p>}
      {action}
    </div>
  );
}
