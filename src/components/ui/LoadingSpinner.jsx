/**
 * LoadingSpinner - Consistent loading indicator
 */
export default function LoadingSpinner({ size = 'default', message = 'Loading...' }) {
  const sizeClass = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-10 h-10' : 'w-7 h-7';
  
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3" role="status">
      <div
        className={`${sizeClass} border-2 border-ink-200 border-t-brand-600 rounded-full animate-spin`}
        aria-hidden="true"
      />
      <span className="text-sm text-ink-500">{message}</span>
    </div>
  );
}
