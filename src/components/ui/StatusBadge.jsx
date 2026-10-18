/**
 * StatusBadge - Displays processing status with appropriate styling
 */
import { CheckCircle, AlertTriangle, XCircle, Loader } from 'lucide-react';
import { getStatusDisplay } from '../../utils/formatters';

const statusIcons = {
  processed: CheckCircle,
  review: AlertTriangle,
  failed: XCircle,
  processing: Loader
};

export default function StatusBadge({ status, size = 'default' }) {
  const { label, className } = getStatusDisplay(status);
  const Icon = statusIcons[status];
  
  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-xs gap-1' 
    : 'px-2.5 py-1 text-xs gap-1.5';
  
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizeClasses} ${className}`}
      role="status"
    >
      {Icon && (
        <Icon 
          size={size === 'sm' ? 12 : 14} 
          className={status === 'processing' ? 'pulse-dot' : ''} 
        />
      )}
      {label}
    </span>
  );
}
