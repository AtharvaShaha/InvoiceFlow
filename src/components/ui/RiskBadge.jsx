/**
 * RiskBadge - Displays ML risk level with appropriate color and icon
 *
 * Separate from StatusBadge which shows OCR processing status.
 * This badge represents the ML anomaly detection risk assessment.
 */
import { ShieldCheck, ShieldAlert, ShieldOff, Loader } from 'lucide-react';

const riskConfig = {
  Low: {
    icon: ShieldCheck,
    label: 'Low Risk',
    className: 'risk-low',
  },
  Medium: {
    icon: ShieldAlert,
    label: 'Medium Risk',
    className: 'risk-medium',
  },
  High: {
    icon: ShieldAlert,
    label: 'High Risk',
    className: 'risk-high',
  },
};

export default function RiskBadge({ riskLevel, predictionStatus, size = 'default' }) {
  // Handle non-analyzed states
  if (predictionStatus === 'pending') {
    return (
      <span className={`inline-flex items-center font-medium rounded-full risk-pending ${size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-2.5 py-1 text-xs gap-1.5'}`}>
        <Loader size={size === 'sm' ? 10 : 12} className="pulse-dot" />
        Pending
      </span>
    );
  }

  if (predictionStatus === 'skipped' || !riskLevel) {
    return (
      <span className={`inline-flex items-center font-medium rounded-full risk-skipped ${size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-2.5 py-1 text-xs gap-1.5'}`}>
        <ShieldOff size={size === 'sm' ? 10 : 12} />
        N/A
      </span>
    );
  }

  const config = riskConfig[riskLevel] || riskConfig.Low;
  const Icon = config.icon;

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs gap-1'
    : 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizeClasses} ${config.className}`}
      role="status"
      aria-label={`Risk level: ${config.label}`}
    >
      <Icon size={size === 'sm' ? 10 : 12} />
      {config.label}
    </span>
  );
}

/**
 * AnomalyScoreBar - Visual gauge for the anomaly score (0-100)
 */
export function AnomalyScoreBar({ score, size = 'default' }) {
  if (score == null) return <span className="text-xs text-ink-400 italic">Not analyzed</span>;

  const clampedScore = Math.max(0, Math.min(100, score));
  const barColor =
    clampedScore <= 30 ? 'bg-success-500' :
    clampedScore <= 60 ? 'bg-warning-500' :
    'bg-danger-500';

  const textColor =
    clampedScore <= 30 ? 'text-success-600' :
    clampedScore <= 60 ? 'text-warning-600' :
    'text-danger-600';

  const height = size === 'sm' ? 'h-1.5' : 'h-2';

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className={`flex-1 ${height} bg-ink-100 rounded-full overflow-hidden min-w-[60px]`}>
        <div
          className={`${height} ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${clampedScore}%` }}
        />
      </div>
      <span className={`text-xs font-semibold ${textColor} shrink-0 tabular-nums`}>
        {clampedScore}
      </span>
    </div>
  );
}
