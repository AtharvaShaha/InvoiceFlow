/**
 * AnalyticsPage - Charts and insights derived from the invoice dataset
 */
import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, PieChart as PieChartIcon, TrendingUp, DollarSign, FileText, AlertTriangle,
  Brain, ShieldAlert, ShieldCheck
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area
} from 'recharts';
import { getInvoices } from '../services/invoiceService';
import { formatCurrency, formatDate } from '../utils/formatters';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const STATUS_COLORS = {
  processed: '#10b981',
  review: '#f59e0b',
  failed: '#ef4444',
  processing: '#6366f1',
};

const STATUS_LABELS = {
  processed: 'Processed',
  review: 'Needs Review',
  failed: 'Failed',
  processing: 'Processing',
};

const RISK_COLORS = {
  Low: '#10b981',
  Medium: '#f59e0b',
  High: '#ef4444',
};

function CustomPieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-ink-200 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-medium m-0" style={{ color: payload[0].payload.fill }}>
        {payload[0].name}: {payload[0].value} ({((payload[0].value / payload[0].payload.total) * 100).toFixed(1)}%)
      </p>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-ink-200 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-ink-800 mb-1 m-0">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs m-0" style={{ color: entry.color }}>
          {entry.name}: {entry.dataKey.includes('amount') ? formatCurrency(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    loadData();
  }, []);
  
  async function loadData() {
    try {
      setLoading(true);
      const result = await getInvoices({ sortBy: 'processed_at', sortOrder: 'asc' });
      setInvoices(result.invoices);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  
  const analytics = useMemo(() => {
    if (!invoices.length) return null;
    
    // Status distribution
    const statusCounts = {};
    invoices.forEach(inv => {
      statusCounts[inv.status] = (statusCounts[inv.status] || 0) + 1;
    });
    const statusData = Object.entries(statusCounts).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      fill: STATUS_COLORS[status] || '#9ca3af',
      total: invoices.length,
    }));
    
    // Monthly volume
    const monthlyMap = {};
    invoices.forEach(inv => {
      if (!inv.processed_at) return;
      const date = new Date(inv.processed_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      if (!monthlyMap[key]) monthlyMap[key] = { month: label, total: 0, processed: 0, issues: 0 };
      monthlyMap[key].total += 1;
      if (inv.status === 'processed') monthlyMap[key].processed += 1;
      if (inv.status === 'failed' || inv.status === 'review') monthlyMap[key].issues += 1;
    });
    const monthlyData = Object.values(monthlyMap);
    
    // Amount distribution (only invoices with valid amounts)
    const invoicesWithAmounts = invoices.filter(inv => inv.total_amount != null);
    const amountRanges = [
      { range: '₹0–5K', min: 0, max: 5000, count: 0 },
      { range: '₹5K–15K', min: 5000, max: 15000, count: 0 },
      { range: '₹15K–50K', min: 15000, max: 50000, count: 0 },
      { range: '₹50K–1L', min: 50000, max: 100000, count: 0 },
      { range: '₹1L+', min: 100000, max: Infinity, count: 0 },
    ];
    invoicesWithAmounts.forEach(inv => {
      const amt = parseFloat(inv.total_amount);
      const bucket = amountRanges.find(r => amt >= r.min && amt < r.max);
      if (bucket) bucket.count += 1;
    });
    
    // Amount summary
    const totalAmount = invoicesWithAmounts.reduce((s, i) => s + parseFloat(i.total_amount), 0);
    const avgAmount = invoicesWithAmounts.length > 0 ? totalAmount / invoicesWithAmounts.length : 0;
    const maxAmount = invoicesWithAmounts.length > 0 
      ? Math.max(...invoicesWithAmounts.map(i => parseFloat(i.total_amount))) : 0;
    const minAmount = invoicesWithAmounts.length > 0 
      ? Math.min(...invoicesWithAmounts.map(i => parseFloat(i.total_amount))) : 0;
    
    // Cumulative processing over time
    const cumulativeData = [];
    let cumulative = 0;
    const sorted = [...invoices]
      .filter(i => i.processed_at)
      .sort((a, b) => new Date(a.processed_at) - new Date(b.processed_at));
    sorted.forEach(inv => {
      cumulative += 1;
      cumulativeData.push({
        date: formatDate(inv.processed_at),
        cumulative,
        amount: inv.total_amount ? parseFloat(inv.total_amount) : 0,
      });
    });
    
    // ML Risk distribution
    const riskCounts = { Low: 0, Medium: 0, High: 0 };
    let analyzedCount = 0;
    let anomalyCount = 0;
    let totalScoreSum = 0;

    invoices.forEach(inv => {
      if (inv.risk_level && riskCounts[inv.risk_level] !== undefined) {
        riskCounts[inv.risk_level] += 1;
        analyzedCount += 1;
      }
      if (inv.anomaly_score != null) {
        totalScoreSum += Number(inv.anomaly_score);
      }
      if (inv.is_anomaly) anomalyCount += 1;
    });

    const riskData = Object.entries(riskCounts).map(([risk, count]) => ({
      name: `${risk} Risk`,
      value: count,
      fill: RISK_COLORS[risk],
      total: analyzedCount,
    }));

    const avgAnomalyScore = analyzedCount > 0 ? Math.round(totalScoreSum / analyzedCount) : 0;

    return {
      statusData,
      monthlyData,
      amountRanges: amountRanges.filter(r => r.count > 0),
      totalAmount,
      avgAmount,
      maxAmount,
      minAmount,
      invoicesWithAmountsCount: invoicesWithAmounts.length,
      totalInvoices: invoices.length,
      missingAmountCount: invoices.length - invoicesWithAmounts.length,
      cumulativeData,
      riskData,
      analyzedCount,
      anomalyCount,
      avgAnomalyScore,
      riskCounts,
    };
  }, [invoices]);
  
  if (loading) return <LoadingSpinner message="Loading analytics..." />;
  
  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-ink-800 font-medium">Failed to load analytics</p>
        <button onClick={loadData} className="mt-3 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm cursor-pointer">Retry</button>
      </div>
    );
  }
  
  if (!analytics) return null;
  
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl">
      <div>
        <h2 className="text-2xl font-bold text-ink-900 m-0">Analytics</h2>
        <p className="text-sm text-ink-500 mt-1 m-0">
          Insights from {analytics.totalInvoices} invoices in the demo dataset.
        </p>
      </div>
      
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl border border-ink-200 p-4 card-hover">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-brand-600" />
            <span className="text-xs font-medium text-ink-500 uppercase tracking-wider">Total Amount</span>
          </div>
          <p className="text-xl font-bold text-ink-900 m-0">{formatCurrency(analytics.totalAmount)}</p>
          <p className="text-xs text-ink-400 mt-1 m-0">
            From {analytics.invoicesWithAmountsCount} invoices with detected amounts
          </p>
        </div>
        <div className="bg-surface rounded-xl border border-ink-200 p-4 card-hover">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-success-600" />
            <span className="text-xs font-medium text-ink-500 uppercase tracking-wider">Average Amount</span>
          </div>
          <p className="text-xl font-bold text-ink-900 m-0">{formatCurrency(analytics.avgAmount)}</p>
          <p className="text-xs text-ink-400 mt-1 m-0">Per invoice (where amount detected)</p>
        </div>
        <div className="bg-surface rounded-xl border border-ink-200 p-4 card-hover">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={16} className="text-warning-600" />
            <span className="text-xs font-medium text-ink-500 uppercase tracking-wider">Highest</span>
          </div>
          <p className="text-xl font-bold text-ink-900 m-0">{formatCurrency(analytics.maxAmount)}</p>
          <p className="text-xs text-ink-400 mt-1 m-0">Largest invoice amount</p>
        </div>
        <div className="bg-surface rounded-xl border border-ink-200 p-4 card-hover">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={16} className="text-ink-500" />
            <span className="text-xs font-medium text-ink-500 uppercase tracking-wider">Missing Data</span>
          </div>
          <p className="text-xl font-bold text-ink-900 m-0">{analytics.missingAmountCount}</p>
          <p className="text-xs text-ink-400 mt-1 m-0">Invoices without detected total amount</p>
        </div>
        <div className="bg-surface rounded-xl border border-ink-200 p-4 card-hover">
          <div className="flex items-center gap-2 mb-2">
            <Brain size={16} className="text-brand-600" />
            <span className="text-xs font-medium text-ink-500 uppercase tracking-wider">ML Anomalies</span>
          </div>
          <p className="text-xl font-bold text-ink-900 m-0">{analytics.anomalyCount}</p>
          <p className="text-xs text-ink-400 mt-1 m-0">
            Flagged from {analytics.analyzedCount} analyzed invoices
          </p>
        </div>
      </div>
      
      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status distribution pie */}
        <div className="bg-surface rounded-xl border border-ink-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon size={16} className="text-ink-500" />
            <h3 className="text-base font-semibold text-ink-900 m-0">Processing Status Distribution</h3>
          </div>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="#fff"
                >
                  {analytics.statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2 pl-2">
              {analytics.statusData.map((entry, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.fill }} />
                  <span className="text-sm text-ink-600">{entry.name}</span>
                  <span className="text-sm font-medium text-ink-800 ml-auto">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Tabular alternative for accessibility */}
          <details className="mt-3">
            <summary className="text-xs text-ink-400 cursor-pointer hover:text-ink-600">
              View as table
            </summary>
            <table className="w-full text-sm mt-2" role="table">
              <thead>
                <tr className="border-b border-ink-200">
                  <th className="text-left py-1 text-xs text-ink-500">Status</th>
                  <th className="text-right py-1 text-xs text-ink-500">Count</th>
                  <th className="text-right py-1 text-xs text-ink-500">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {analytics.statusData.map((entry, i) => (
                  <tr key={i} className="border-b border-ink-100">
                    <td className="py-1 text-ink-700">{entry.name}</td>
                    <td className="py-1 text-right text-ink-800 font-medium">{entry.value}</td>
                    <td className="py-1 text-right text-ink-500">
                      {((entry.value / analytics.totalInvoices) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
        
        {/* Monthly volume */}
        <div className="bg-surface rounded-xl border border-ink-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-ink-500" />
            <h3 className="text-base font-semibold text-ink-900 m-0">Monthly Invoice Volume</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="processed" name="Processed" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="issues" name="Review/Failed" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ML Risk Analytics Row */}
      {analytics.analyzedCount > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ML Risk Distribution */}
          <div className="bg-surface rounded-xl border border-ink-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Brain size={16} className="text-brand-600" />
                <h3 className="text-base font-semibold text-ink-900 m-0">ML Risk Level Distribution</h3>
              </div>
              <span className="text-xs text-ink-400">{analytics.analyzedCount} Analyzed</span>
            </div>
            <div className="h-64 flex items-center">
              <ResponsiveContainer width="60%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.riskData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    strokeWidth={2}
                    stroke="#fff"
                  >
                    {analytics.riskData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2.5 pl-2">
                {analytics.riskData.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.fill }} />
                    <span className="text-sm text-ink-600">{entry.name}</span>
                    <span className="text-sm font-semibold text-ink-800 ml-auto">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ML Health & Insights */}
          <div className="bg-surface rounded-xl border border-ink-200 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck size={16} className="text-brand-600" />
                <h3 className="text-base font-semibold text-ink-900 m-0">ML Quality &amp; Risk Insights</h3>
              </div>
              <p className="text-xs text-ink-500 mb-4 m-0">
                Evaluation results across deterministic GST rules and statistical amount distributions.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-surface-raised border border-ink-100">
                  <span className="text-xs text-ink-500 block">Avg Anomaly Score</span>
                  <span className="text-xl font-bold text-ink-800">{analytics.avgAnomalyScore}/100</span>
                </div>
                <div className="p-3 rounded-lg bg-surface-raised border border-ink-100">
                  <span className="text-xs text-ink-500 block">Anomaly Rate</span>
                  <span className="text-xl font-bold text-ink-800">
                    {((analytics.anomalyCount / analytics.analyzedCount) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-ink-100 text-xs text-ink-600">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success-500" />
                <span><strong>{analytics.riskCounts.Low} invoices</strong> validated cleanly with no math/duplicate discrepancies</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-warning-500" />
                <span><strong>{analytics.riskCounts.Medium} invoices</strong> flagged with minor missing items or low OCR confidence</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-danger-500" />
                <span><strong>{analytics.riskCounts.High} invoices</strong> marked high risk (GST arithmetic mismatches or duplicates)</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Amount distribution */}
        <div className="bg-surface rounded-xl border border-ink-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={16} className="text-ink-500" />
            <h3 className="text-base font-semibold text-ink-900 m-0">Invoice Amount Distribution</h3>
          </div>
          {analytics.amountRanges.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.amountRanges} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Invoices" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-ink-400 text-center py-8">No invoices with detected amounts</p>
          )}
          {analytics.missingAmountCount > 0 && (
            <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-warning-50">
              <AlertTriangle size={13} className="text-warning-600" />
              <span className="text-xs text-warning-600">
                {analytics.missingAmountCount} invoice{analytics.missingAmountCount > 1 ? 's' : ''} excluded (amount not detected)
              </span>
            </div>
          )}
        </div>
        
        {/* Cumulative processing */}
        <div className="bg-surface rounded-xl border border-ink-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-ink-500" />
            <h3 className="text-base font-semibold text-ink-900 m-0">Cumulative Processing</h3>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.cumulativeData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="cumulative" name="Total Invoices" stroke="#6366f1" fill="#eef2ff" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Recent activity table */}
      <div className="bg-surface rounded-xl border border-ink-200 p-5">
        <h3 className="text-base font-semibold text-ink-900 m-0 mb-4">Recent Processing Activity</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b border-ink-200">
                <th className="text-left px-3 py-2 text-xs font-semibold text-ink-500 uppercase tracking-wider">Invoice</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-ink-500 uppercase tracking-wider hidden sm:table-cell">Customer</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-ink-500 uppercase tracking-wider">Amount</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-ink-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-ink-500 uppercase tracking-wider hidden md:table-cell">Processed</th>
              </tr>
            </thead>
            <tbody>
              {invoices.slice(-10).reverse().map(inv => (
                <tr key={inv.invoice_id} className="border-b border-ink-100">
                  <td className="px-3 py-2 font-medium text-ink-800">{inv.invoice_number || inv.invoice_id}</td>
                  <td className="px-3 py-2 text-ink-600 hidden sm:table-cell">{inv.customer_name || <span className="italic text-ink-400">Not detected</span>}</td>
                  <td className="px-3 py-2 text-right text-ink-700">{formatCurrency(inv.total_amount)}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block w-2 h-2 rounded-full mr-1.5`} style={{ backgroundColor: STATUS_COLORS[inv.status] }} />
                    <span className="text-ink-600">{STATUS_LABELS[inv.status]}</span>
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-ink-400 hidden md:table-cell">{formatDate(inv.processed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
