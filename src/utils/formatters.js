/**
 * Formatting and display utilities for InvoiceFlow
 */

/**
 * Format a monetary amount in INR
 * Returns "Not detected" for null/undefined values
 * @param {string|number|null} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  if (amount == null || amount === '') return 'Not detected';
  
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return 'Not detected';
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

/**
 * Format a date string for display
 * @param {string|null} dateStr - ISO date or YYYY-MM-DD
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return 'Not detected';
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Not detected';
    
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return 'Not detected';
  }
}

/**
 * Format a datetime string for display
 * @param {string|null} dateStr - ISO datetime
 * @returns {string}
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return 'Not detected';
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Not detected';
    
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return 'Not detected';
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {string} dateStr
 * @returns {string}
 */
export function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return formatDate(dateStr);
}

/**
 * Get display label and CSS class for a status
 * @param {string} status
 * @returns {{ label: string, className: string }}
 */
export function getStatusDisplay(status) {
  switch (status) {
    case 'processed':
      return { label: 'Processed', className: 'status-processed' };
    case 'review':
      return { label: 'Needs Review', className: 'status-review' };
    case 'failed':
      return { label: 'Failed', className: 'status-failed' };
    case 'processing':
      return { label: 'Processing', className: 'status-processing' };
    default:
      return { label: 'Unknown', className: '' };
  }
}

/**
 * Format file size in human-readable form
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Get filename from an S3 key
 * @param {string} key
 * @returns {string}
 */
export function getFilenameFromKey(key) {
  if (!key) return 'Unknown file';
  return key.split('/').pop() || key;
}

/**
 * Display value or fallback for missing data
 * @param {*} value
 * @param {string} fallback
 * @returns {string}
 */
export function displayValue(value, fallback = 'Not detected') {
  if (value == null || value === '') return fallback;
  return String(value);
}

/**
 * Check if a field value is considered "missing" or uncertain
 * @param {*} value
 * @returns {boolean}
 */
export function isMissing(value) {
  return value == null || value === '';
}
