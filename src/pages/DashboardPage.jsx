/**
 * DashboardPage - Main overview page with stats, recent invoices, and trend chart
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Upload,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Brain
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { getDashboardStats } from '../services/invoiceService';
import { formatCurrency, formatRelativeTime, formatDate } from '../utils/formatters';
import StatusBadge from '../components/ui/StatusBadge';
import RiskBadge from '../components/ui/RiskBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

function StatCard({ label, value, icon: Icon, color, subtext }) {
  const colorMap = {
    brand: 'bg-brand-50 text-brand-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    danger: 'bg-danger-50 text-danger-600',
  };
  
  return (
    <div className="bg-surface rounded-xl border border-ink-200 p-5 card-hover">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.brand}`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="text-2xl font-bold text-ink-900 m-0">{value}</p>
      <p className="text-sm text-ink-500 mt-1 m-0">{label}</p>
      {subtext && <p className="text-xs text-ink-400 mt-1 m-0">{subtext}</p>}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-ink-200 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-ink-800 mb-1 m-0">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs m-0" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    loadStats();
  }, []);
  
  async function loadStats() {
    try {
      setLoading(true);
      setError(null);
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  
  if (loading) return <LoadingSpinner message="Loading dashboard..." />;
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <XCircle size={40} className="text-danger-500 mb-3" />
        <p className="text-ink-800 font-medium">Failed to load dashboard</p>
        <p className="text-sm text-ink-500">{error}</p>
        <button 
          onClick={loadStats}
          className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }
  
  if (!stats) return null;
  
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl">
      {/* Welcome section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink-900 m-0">Welcome to InvoiceFlow</h2>
          <p className="text-sm text-ink-500 mt-1 m-0">
            Serverless invoice processing dashboard — track, review, and manage your invoices.
          </p>
        </div>
        <button
          onClick={() => navigate('/upload')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold
                     hover:bg-brand-700 active:bg-brand-800 transition-colors shadow-sm cursor-pointer shrink-0"
        >
          <Upload size={16} />
          Upload Invoice
        </button>
      </div>
      
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Invoices"
          value={stats.total}
          icon={FileText}
          color="brand"
        />
        <StatCard
          label="Successfully Processed"
          value={stats.processed}
          icon={CheckCircle}
          color="success"
        />
        <StatCard
          label="Needs Review"
          value={stats.review}
          icon={AlertTriangle}
          color="warning"
        />
        <StatCard
          label="Failed"
          value={stats.failed}
          icon={XCircle}
          color="danger"
          subtext={stats.processing > 0 ? `${stats.processing} currently processing` : undefined}
        />
      </div>

      {/* ML Risk Overview */}
      {stats.analyzedCount > 0 && (
        <div className="bg-surface rounded-xl border border-ink-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain size={18} className="text-brand-500" />
              <h3 className="text-base font-semibold text-ink-900 m-0">ML Risk Overview</h3>
              <span className="text-xs text-ink-400 font-normal">({stats.analyzedCount} analyzed)</span>
            </div>
            {stats.anomalyCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-danger-50 text-danger-600 border border-danger-500/20">
                <ShieldAlert size={12} />
                {stats.anomalyCount} anomal{stats.anomalyCount === 1 ? 'y' : 'ies'} detected
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-success-50 border border-success-500/15">
              <div className="w-9 h-9 rounded-lg bg-success-500/10 flex items-center justify-center">
                <ShieldCheck size={18} className="text-success-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-success-700 m-0">{stats.riskLow}</p>
                <p className="text-xs text-success-600 m-0">Low Risk</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-warning-50 border border-warning-500/15">
              <div className="w-9 h-9 rounded-lg bg-warning-500/10 flex items-center justify-center">
                <ShieldAlert size={18} className="text-warning-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-warning-700 m-0">{stats.riskMedium}</p>
                <p className="text-xs text-warning-600 m-0">Medium Risk</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-danger-50 border border-danger-500/15">
              <div className="w-9 h-9 rounded-lg bg-danger-500/10 flex items-center justify-center">
                <ShieldAlert size={18} className="text-danger-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-danger-700 m-0">{stats.riskHigh}</p>
                <p className="text-xs text-danger-600 m-0">High Risk</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts + Recent invoices grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Trend chart */}
        <div className="xl:col-span-2 bg-surface rounded-xl border border-ink-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-ink-500" />
              <h3 className="text-base font-semibold text-ink-900 m-0">Processing Activity</h3>
            </div>
            <span className="text-xs text-ink-400">Last 14 days</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trendData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Total"
                  stroke="#6366f1"
                  fill="#eef2ff"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="processed"
                  name="Processed"
                  stroke="#10b981"
                  fill="#ecfdf5"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Revenue summary */}
        <div className="bg-surface rounded-xl border border-ink-200 p-5 flex flex-col">
          <h3 className="text-base font-semibold text-ink-900 m-0 mb-4">Amount Summary</h3>
          <div className="space-y-4 flex-1">
            <div className="p-4 rounded-lg bg-brand-50 border border-brand-200">
              <p className="text-xs font-medium text-brand-600 mb-1 m-0">Total Processed Amount</p>
              <p className="text-xl font-bold text-brand-800 m-0">{formatCurrency(stats.totalRevenue)}</p>
              <p className="text-xs text-brand-500 mt-1 m-0">
                From {stats.invoicesWithAmountsCount} invoice{stats.invoicesWithAmountsCount !== 1 ? 's' : ''} with detected amounts
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-ink-500">Processed</span>
                <span className="text-sm font-medium text-success-600">{stats.processed}</span>
              </div>
              <div className="w-full h-2 bg-ink-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-success-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total ? (stats.processed / stats.total) * 100 : 0}%` }}
                />
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-ink-500">Review Required</span>
                <span className="text-sm font-medium text-warning-600">{stats.review}</span>
              </div>
              <div className="w-full h-2 bg-ink-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-warning-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total ? (stats.review / stats.total) * 100 : 0}%` }}
                />
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-ink-500">Failed</span>
                <span className="text-sm font-medium text-danger-600">{stats.failed}</span>
              </div>
              <div className="w-full h-2 bg-ink-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-danger-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total ? (stats.failed / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent invoices */}
      <div className="bg-surface rounded-xl border border-ink-200">
        <div className="flex items-center justify-between p-5 pb-0">
          <h3 className="text-base font-semibold text-ink-900 m-0">Recent Invoices</h3>
          <button
            onClick={() => navigate('/invoices')}
            className="inline-flex items-center gap-1 text-sm text-brand-600 font-medium hover:text-brand-700 transition-colors bg-transparent border-none cursor-pointer"
          >
            View all <ArrowRight size={14} />
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b border-ink-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Invoice</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider hidden sm:table-cell">Customer</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider hidden md:table-cell">Date</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider hidden sm:table-cell">Amount</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider hidden lg:table-cell">Risk</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider hidden lg:table-cell">Processed</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentInvoices.map(inv => (
                <tr 
                  key={inv.invoice_id} 
                  className="border-b border-ink-100 table-row-hover cursor-pointer"
                  onClick={() => navigate(`/invoices/${inv.invoice_id}`)}
                  role="row"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/invoices/${inv.invoice_id}`)}
                >
                  <td className="px-5 py-3">
                    <div>
                      <span className="font-medium text-ink-800">{inv.invoice_number || inv.invoice_id}</span>
                      <span className="block text-xs text-ink-400 sm:hidden">{inv.customer_name || 'Not detected'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-ink-600 hidden sm:table-cell">{inv.customer_name || 'Not detected'}</td>
                  <td className="px-5 py-3 text-ink-500 hidden md:table-cell">{formatDate(inv.invoice_date)}</td>
                  <td className="px-5 py-3 text-right font-medium text-ink-800 hidden sm:table-cell">{formatCurrency(inv.total_amount)}</td>
                  <td className="px-5 py-3"><StatusBadge status={inv.status} size="sm" /></td>
                  <td className="px-5 py-3 hidden lg:table-cell"><RiskBadge riskLevel={inv.risk_level} predictionStatus={inv.prediction_status} size="sm" /></td>
                  <td className="px-5 py-3 text-right text-xs text-ink-400 hidden lg:table-cell">{formatRelativeTime(inv.processed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
