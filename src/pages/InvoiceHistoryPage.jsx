/**
 * InvoiceHistoryPage - Searchable, filterable, sortable invoice table with pagination and CSV export
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, Download, X, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, RefreshCw, FileText
} from 'lucide-react';
import { getInvoices, downloadCSV } from '../services/invoiceService';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';

const PAGE_SIZE = 8;

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'processed', label: 'Processed' },
  { value: 'review', label: 'Needs Review' },
  { value: 'failed', label: 'Failed' },
  { value: 'processing', label: 'Processing' },
];

export default function InvoiceHistoryPage() {
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    dateFrom: '',
    dateTo: '',
    sortBy: 'processed_at',
    sortOrder: 'desc',
  });
  
  const navigate = useNavigate();
  
  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const result = await getInvoices(filters);
        if (!cancelled) {
          setInvoices(result.invoices);
          setTotal(result.total);
          setPage(1);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [filters]);
  
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const paginatedInvoices = invoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  
  function handleSort(field) {
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  }
  
  function handleClearFilters() {
    setFilters({
      search: '',
      status: 'all',
      dateFrom: '',
      dateTo: '',
      sortBy: 'processed_at',
      sortOrder: 'desc',
    });
  }
  
  const hasActiveFilters = filters.search || filters.status !== 'all' || filters.dateFrom || filters.dateTo;
  
  function renderSortIcon(field) {
    if (filters.sortBy !== field) return <ArrowUpDown size={14} className="text-ink-300" />;
    return filters.sortOrder === 'asc' 
      ? <ArrowUp size={14} className="text-brand-600" /> 
      : <ArrowDown size={14} className="text-brand-600" />;
  }
  
  function handleExport() {
    downloadCSV(invoices, `invoiceflow-export-${new Date().toISOString().split('T')[0]}.csv`);
  }
  
  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-ink-900 m-0">Invoice History</h2>
          <p className="text-sm text-ink-500 mt-1 m-0">
            {total} invoice{total !== 1 ? 's' : ''} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={invoices.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-surface border border-ink-200 rounded-lg text-sm font-medium
                       text-ink-700 hover:bg-ink-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Export filtered invoices as CSV"
          >
            <Download size={15} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 border rounded-lg text-sm font-medium transition-colors cursor-pointer
              ${showFilters 
                ? 'bg-brand-50 border-brand-300 text-brand-700' 
                : 'bg-surface border-ink-200 text-ink-700 hover:bg-ink-100'
              }`}
            aria-expanded={showFilters}
          >
            <Filter size={15} />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-brand-500" aria-label="Filters active" />
            )}
          </button>
        </div>
      </div>
      
      {/* Search bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          type="search"
          placeholder="Search by invoice number, customer, or order ID..."
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          className="w-full pl-10 pr-4 py-2.5 bg-surface border border-ink-200 rounded-lg text-sm text-ink-800
                     placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow"
          aria-label="Search invoices"
        />
        {filters.search && (
          <button
            onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-ink-400 hover:text-ink-600 bg-transparent border-none cursor-pointer"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>
      
      {/* Filter panel */}
      {showFilters && (
        <div className="bg-surface border border-ink-200 rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="filter-status" className="block text-xs font-medium text-ink-600 mb-1.5">Status</label>
              <select
                id="filter-status"
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 bg-surface border border-ink-200 rounded-lg text-sm text-ink-800
                           focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-from" className="block text-xs font-medium text-ink-600 mb-1.5">From Date</label>
              <input
                id="filter-from"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full px-3 py-2 bg-surface border border-ink-200 rounded-lg text-sm text-ink-800
                           focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label htmlFor="filter-to" className="block text-xs font-medium text-ink-600 mb-1.5">To Date</label>
              <input
                id="filter-to"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full px-3 py-2 bg-surface border border-ink-200 rounded-lg text-sm text-ink-800
                           focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>
          {hasActiveFilters && (
            <div className="mt-3 pt-3 border-t border-ink-100 flex justify-end">
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-700 transition-colors bg-transparent border-none cursor-pointer"
              >
                <RefreshCw size={13} /> Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Table */}
      {loading ? (
        <LoadingSpinner message="Loading invoices..." />
      ) : error ? (
        <div className="bg-surface rounded-xl border border-ink-200 p-8 text-center">
          <p className="text-ink-800 font-medium">Failed to load invoices</p>
          <p className="text-sm text-ink-500">{error}</p>
          <button 
            onClick={() => { setError(null); setFilters(f => ({ ...f })); }}
            className="mt-3 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices found"
          message={hasActiveFilters ? 'Try adjusting your search or filters.' : 'Upload your first invoice to get started.'}
          action={hasActiveFilters ? (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors cursor-pointer"
            >
              Clear Filters
            </button>
          ) : null}
        />
      ) : (
        <div className="bg-surface rounded-xl border border-ink-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]" role="table">
              <thead>
                <tr className="border-b border-ink-200 bg-surface-raised">
                  <th className="text-left px-4 py-3">
                    <button onClick={() => handleSort('invoice_number')} className="inline-flex items-center gap-1 text-xs font-semibold text-ink-500 uppercase tracking-wider bg-transparent border-none cursor-pointer hover:text-ink-700">
                      Invoice {renderSortIcon('invoice_number')}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3">
                    <button onClick={() => handleSort('customer_name')} className="inline-flex items-center gap-1 text-xs font-semibold text-ink-500 uppercase tracking-wider bg-transparent border-none cursor-pointer hover:text-ink-700">
                      Customer {renderSortIcon('customer_name')}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">
                    <button onClick={() => handleSort('invoice_date')} className="inline-flex items-center gap-1 text-xs font-semibold text-ink-500 uppercase tracking-wider bg-transparent border-none cursor-pointer hover:text-ink-700">
                      Date {renderSortIcon('invoice_date')}
                    </button>
                  </th>
                  <th className="text-right px-4 py-3">
                    <button onClick={() => handleSort('total_amount')} className="inline-flex items-center gap-1 text-xs font-semibold text-ink-500 uppercase tracking-wider bg-transparent border-none cursor-pointer hover:text-ink-700 ml-auto">
                      Amount {renderSortIcon('total_amount')}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3">
                    <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Status</span>
                  </th>
                  <th className="text-right px-4 py-3 hidden lg:table-cell">
                    <button onClick={() => handleSort('processed_at')} className="inline-flex items-center gap-1 text-xs font-semibold text-ink-500 uppercase tracking-wider bg-transparent border-none cursor-pointer hover:text-ink-700 ml-auto">
                      Processed {renderSortIcon('processed_at')}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedInvoices.map(inv => (
                  <tr 
                    key={inv.invoice_id} 
                    className="border-b border-ink-100 table-row-hover cursor-pointer"
                    onClick={() => navigate(`/invoices/${inv.invoice_id}`)}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/invoices/${inv.invoice_id}`)}
                    role="row"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-ink-800">{inv.invoice_number || inv.invoice_id}</span>
                      {inv.order_id && <span className="block text-xs text-ink-400 mt-0.5">{inv.order_id}</span>}
                    </td>
                    <td className="px-4 py-3 text-ink-600">{inv.customer_name || <span className="text-ink-400 italic">Not detected</span>}</td>
                    <td className="px-4 py-3 text-ink-500 hidden md:table-cell">{formatDate(inv.invoice_date)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${inv.total_amount ? 'text-ink-800' : 'text-ink-400 italic'}`}>
                        {formatCurrency(inv.total_amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={inv.status} size="sm" /></td>
                    <td className="px-4 py-3 text-right text-xs text-ink-400 hidden lg:table-cell">{formatDateTime(inv.processed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-ink-200">
              <p className="text-xs text-ink-500 m-0">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-md text-ink-500 hover:bg-ink-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors bg-transparent border-none cursor-pointer"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-md text-sm font-medium transition-colors border-none cursor-pointer
                      ${p === page 
                        ? 'bg-brand-600 text-white' 
                        : 'text-ink-600 hover:bg-ink-100 bg-transparent'
                      }`}
                    aria-label={`Page ${p}`}
                    aria-current={p === page ? 'page' : undefined}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-md text-ink-500 hover:bg-ink-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors bg-transparent border-none cursor-pointer"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
