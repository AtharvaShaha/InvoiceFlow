/**
 * InvoiceDetailPage - Detailed view of a single invoice with edit capability
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Calendar, User, Hash, DollarSign,
  Clock, File, Eye, EyeOff, Edit3, Save, X, AlertTriangle,
  CheckCircle, Brain, ShieldAlert, ShieldCheck, Shield, Activity
} from 'lucide-react';
import { getInvoiceById, updateInvoice } from '../services/invoiceService';
import { formatCurrency, formatDate, formatDateTime, displayValue, isMissing, getFilenameFromKey } from '../utils/formatters';
import StatusBadge from '../components/ui/StatusBadge';
import RiskBadge, { AnomalyScoreBar } from '../components/ui/RiskBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

function DetailField({ label, value, icon: Icon, missing, children }) {
  return (
    <div className="flex items-start gap-3 py-3">
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-ink-100 flex items-center justify-center shrink-0 mt-0.5">
          <Icon size={15} className="text-ink-500" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-ink-500 mb-0.5 m-0">{label}</p>
        {children || (
          <p className={`text-sm m-0 ${missing ? 'text-ink-400 italic' : 'text-ink-800 font-medium'}`}>
            {value}
          </p>
        )}
      </div>
    </div>
  );
}

function EditableField({ label, value, name, onChange, type = 'text', prefix = '' }) {
  return (
    <div className="py-2">
      <label className="block text-xs font-medium text-ink-500 mb-1">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">{prefix}</span>
        )}
        <input
          type={type}
          name={name}
          value={value || ''}
          onChange={onChange}
          placeholder="Not detected"
          className={`w-full px-3 py-2 bg-surface border border-ink-200 rounded-lg text-sm text-ink-800
                     placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                     ${prefix ? 'pl-7' : ''}`}
        />
      </div>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showOCR, setShowOCR] = useState(false);
  
  useEffect(() => {
    let cancelled = false;
    async function fetchInvoice() {
      try {
        setLoading(true);
        setError(null);
        const data = await getInvoiceById(invoiceId);
        if (cancelled) return;
        if (!data) {
          setError('Invoice not found');
          return;
        }
        setInvoice(data);
        setEditData({
          invoice_number: data.invoice_number || '',
          invoice_date: data.invoice_date || '',
          customer_name: data.customer_name || '',
          order_id: data.order_id || '',
          platform_fee: data.platform_fee || '',
          cgst: data.cgst || '',
          sgst: data.sgst || '',
          total_amount: data.total_amount || '',
        });
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchInvoice();
    return () => { cancelled = true; };
  }, [invoiceId]);
  
  function handleEditChange(e) {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  }
  
  async function handleSave() {
    try {
      setSaving(true);
      // Convert empty strings to null for consistency
      const cleanData = {};
      for (const [key, val] of Object.entries(editData)) {
        cleanData[key] = val === '' ? null : val;
      }
      const updated = await updateInvoice(invoiceId, cleanData);
      setInvoice(updated);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }
  
  function handleCancel() {
    setEditData({
      invoice_number: invoice.invoice_number || '',
      invoice_date: invoice.invoice_date || '',
      customer_name: invoice.customer_name || '',
      order_id: invoice.order_id || '',
      platform_fee: invoice.platform_fee || '',
      cgst: invoice.cgst || '',
      sgst: invoice.sgst || '',
      total_amount: invoice.total_amount || '',
    });
    setIsEditing(false);
  }
  
  if (loading) return <LoadingSpinner message="Loading invoice details..." />;
  
  if (error) {
    return (
      <div className="p-6 max-w-4xl">
        <button
          onClick={() => navigate('/invoices')}
          className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-700 mb-6 bg-transparent border-none cursor-pointer"
        >
          <ArrowLeft size={16} /> Back to Invoices
        </button>
        <div className="bg-surface rounded-xl border border-ink-200 p-12 text-center">
          <AlertTriangle size={40} className="text-warning-500 mx-auto mb-3" />
          <p className="text-ink-800 font-medium">{error}</p>
          <button 
            onClick={() => navigate('/invoices')}
            className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors cursor-pointer"
          >
            Return to Invoice History
          </button>
        </div>
      </div>
    );
  }
  
  if (!invoice) return null;
  
  return (
    <div className="p-4 lg:p-6 max-w-5xl space-y-4">
      {/* Navigation + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <button
          onClick={() => navigate('/invoices')}
          className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-700 transition-colors bg-transparent border-none cursor-pointer"
        >
          <ArrowLeft size={16} /> Back to Invoices
        </button>
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="inline-flex items-center gap-1.5 text-sm text-success-600 font-medium toast-enter">
              <CheckCircle size={14} /> Changes saved (mock)
            </span>
          )}
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-ink-200 rounded-lg text-sm font-medium
                         text-ink-700 hover:bg-ink-100 transition-colors cursor-pointer"
            >
              <Edit3 size={14} /> Edit Fields
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface border border-ink-200 rounded-lg text-sm font-medium
                           text-ink-600 hover:bg-ink-100 transition-colors cursor-pointer"
              >
                <X size={14} /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold
                           hover:bg-brand-700 transition-colors disabled:opacity-60 cursor-pointer"
              >
                <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Header info */}
      <div className="bg-surface rounded-xl border border-ink-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-ink-900 m-0">
                {invoice.invoice_number || invoice.invoice_id}
              </h2>
              <StatusBadge status={invoice.status} />
              <RiskBadge riskLevel={invoice.risk_level} predictionStatus={invoice.prediction_status} />
            </div>
            <p className="text-sm text-ink-500 mt-1 m-0">{invoice.invoice_id}</p>
          </div>
        </div>
        
        {invoice.status === 'review' && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning-50 border border-warning-500/20 mb-4">
            <AlertTriangle size={16} className="text-warning-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-warning-600 m-0">This invoice needs manual review</p>
              <p className="text-xs text-warning-500 mt-0.5 m-0">
                Some fields may be incomplete or have low OCR confidence. Click "Edit Fields" to correct extracted values.
              </p>
            </div>
          </div>
        )}
        
        {invoice.status === 'failed' && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-danger-50 border border-danger-500/20 mb-4">
            <AlertTriangle size={16} className="text-danger-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-danger-600 m-0">Processing failed</p>
              <p className="text-xs text-danger-500 mt-0.5 m-0">
                This invoice could not be processed. The image may be too blurry or in an unsupported format.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ML Risk & Anomaly Analysis Panel */}
      <div className="bg-surface rounded-xl border border-ink-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-ink-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
              <Brain size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink-900 m-0 flex items-center gap-2">
                ML Risk &amp; Anomaly Analysis
                {invoice.model_version && (
                  <span className="text-[11px] font-mono text-ink-400 bg-ink-100 px-2 py-0.5 rounded font-normal">
                    {invoice.model_version}
                  </span>
                )}
              </h3>
              <p className="text-xs text-ink-500 m-0">
                Statistical anomaly detection &amp; rule validation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-400">
            {invoice.analyzed_at && (
              <span>Analyzed: {formatDateTime(invoice.analyzed_at)}</span>
            )}
          </div>
        </div>

        {invoice.prediction_status === 'pending' ? (
          <div className="p-4 rounded-lg bg-surface-raised border border-ink-200 text-center">
            <LoadingSpinner size="sm" />
            <p className="text-xs text-ink-500 mt-2 m-0">ML analysis in progress...</p>
          </div>
        ) : invoice.prediction_status === 'skipped' ? (
          <div className="p-4 rounded-lg bg-ink-50 border border-ink-200">
            <p className="text-xs text-ink-600 m-0">
              ML analysis was skipped for this invoice (insufficient OCR data or failed extraction).
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top 3 KPI metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Anomaly Score */}
              <div className="p-3.5 rounded-lg bg-surface-raised border border-ink-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-ink-500">Anomaly Score</span>
                  <span className="text-xs font-bold text-ink-800">{invoice.anomaly_score ?? 0}/100</span>
                </div>
                <AnomalyScoreBar score={invoice.anomaly_score} />
                <p className="text-[11px] text-ink-400 mt-1.5 m-0">
                  {invoice.anomaly_score <= 30
                    ? 'Within normal statistical threshold'
                    : invoice.anomaly_score <= 60
                    ? 'Moderate deviation detected'
                    : 'Significant anomalies detected'}
                </p>
              </div>

              {/* Risk Level */}
              <div className="p-3.5 rounded-lg bg-surface-raised border border-ink-200 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-ink-500">Risk Assessment</span>
                  <RiskBadge riskLevel={invoice.risk_level} size="sm" />
                </div>
                <p className="text-xs text-ink-600 m-0 mt-1">
                  {invoice.risk_level === 'Low' && 'Safe to process with standard workflow.'}
                  {invoice.risk_level === 'Medium' && 'Review highlighted discrepancies before approving.'}
                  {invoice.risk_level === 'High' && 'High probability of error, mismatch, or duplicate.'}
                </p>
              </div>

              {/* Anomaly Flag */}
              <div className="p-3.5 rounded-lg bg-surface-raised border border-ink-200 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-ink-500">Anomaly Status</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      invoice.is_anomaly
                        ? 'bg-danger-50 text-danger-700 border border-danger-500/20'
                        : 'bg-success-50 text-success-700 border border-success-500/20'
                    }`}
                  >
                    {invoice.is_anomaly ? (
                      <>
                        <ShieldAlert size={11} /> Flagged Anomaly
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={11} /> Standard
                      </>
                    )}
                  </span>
                </div>
                <p className="text-xs text-ink-600 m-0 mt-1">
                  {invoice.is_anomaly
                    ? 'Triggered rule-based or statistical outlier alerts.'
                    : 'No threshold violations detected.'}
                </p>
              </div>
            </div>

            {/* Flagged Reasons (if any) */}
            {invoice.anomaly_reasons && invoice.anomaly_reasons.length > 0 ? (
              <div className="p-3.5 rounded-lg bg-danger-50/60 border border-danger-500/25">
                <div className="flex items-center gap-1.5 mb-2 text-danger-700 font-medium text-xs">
                  <ShieldAlert size={14} className="text-danger-600" />
                  <span>Detected Risk Signals ({invoice.anomaly_reasons.length}):</span>
                </div>
                <ul className="space-y-1.5 m-0 pl-5 text-xs text-danger-700">
                  {invoice.anomaly_reasons.map((reason, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-success-50/60 border border-success-500/20 flex items-center gap-2 text-xs text-success-700">
                <ShieldCheck size={16} className="text-success-600 shrink-0" />
                <span>All checks passed. Amounts and tax calculations conform to standard patterns.</span>
              </div>
            )}

            {/* Clear Separation: ML Predictions vs Rule-Based Checks */}
            <div className="p-3.5 rounded-lg bg-surface-raised border border-ink-200">
              <p className="text-xs font-semibold text-ink-800 uppercase tracking-wider mb-2.5 m-0 flex items-center gap-1.5">
                <Activity size={13} className="text-brand-600" />
                Inspection System Breakdown (ML vs Rule-Based)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded bg-surface border border-ink-100">
                  <div className="font-semibold text-brand-700 mb-1 flex items-center gap-1">
                    <Brain size={12} /> ML Statistical Models
                  </div>
                  <ul className="m-0 pl-4 space-y-1 text-ink-600">
                    <li>Amount outlier z-score against dataset distribution</li>
                    <li>OCR extraction confidence scoring across line items</li>
                    <li>Weighted multi-factor anomaly scoring (0–100)</li>
                  </ul>
                </div>
                <div className="p-2.5 rounded bg-surface border border-ink-100">
                  <div className="font-semibold text-ink-800 mb-1 flex items-center gap-1">
                    <Shield size={12} /> Deterministic Rule Validations
                  </div>
                  <ul className="m-0 pl-4 space-y-1 text-ink-600">
                    <li>GST symmetry: CGST = SGST check</li>
                    <li>GST rate: CGST ≈ 9% of Platform Fee / Taxable Amount</li>
                    <li>Sum consistency: Platform Fee + CGST + SGST = Total</li>
                    <li>Duplicate detection: Invoice Number + Customer match</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Invoice details */}
        <div className="bg-surface rounded-xl border border-ink-200 p-5">
          <h3 className="text-sm font-semibold text-ink-800 uppercase tracking-wider mb-3 m-0">Invoice Details</h3>
          
          {isEditing ? (
            <div className="space-y-1">
              <EditableField label="Invoice Number" name="invoice_number" value={editData.invoice_number} onChange={handleEditChange} />
              <EditableField label="Invoice Date" name="invoice_date" value={editData.invoice_date} onChange={handleEditChange} type="date" />
              <EditableField label="Customer Name" name="customer_name" value={editData.customer_name} onChange={handleEditChange} />
              <EditableField label="Order ID" name="order_id" value={editData.order_id} onChange={handleEditChange} />
            </div>
          ) : (
            <div className="divide-y divide-ink-100">
              <DetailField label="Invoice Number" icon={Hash} value={displayValue(invoice.invoice_number)} missing={isMissing(invoice.invoice_number)} />
              <DetailField label="Invoice Date" icon={Calendar} value={formatDate(invoice.invoice_date)} missing={isMissing(invoice.invoice_date)} />
              <DetailField label="Customer Name" icon={User} value={displayValue(invoice.customer_name)} missing={isMissing(invoice.customer_name)} />
              <DetailField label="Order ID" icon={Hash} value={displayValue(invoice.order_id)} missing={isMissing(invoice.order_id)} />
            </div>
          )}
        </div>
        
        {/* Financial details */}
        <div className="bg-surface rounded-xl border border-ink-200 p-5">
          <h3 className="text-sm font-semibold text-ink-800 uppercase tracking-wider mb-3 m-0">Financial Details</h3>
          
          {isEditing ? (
            <div className="space-y-1">
              <EditableField label="Platform Fee / Taxable Amount" name="platform_fee" value={editData.platform_fee} onChange={handleEditChange} prefix="₹" />
              <EditableField label="CGST" name="cgst" value={editData.cgst} onChange={handleEditChange} prefix="₹" />
              <EditableField label="SGST" name="sgst" value={editData.sgst} onChange={handleEditChange} prefix="₹" />
              <EditableField label="Total Amount" name="total_amount" value={editData.total_amount} onChange={handleEditChange} prefix="₹" />
            </div>
          ) : (
            <div className="divide-y divide-ink-100">
              <DetailField label="Platform Fee / Taxable Amount" icon={DollarSign} value={formatCurrency(invoice.platform_fee)} missing={isMissing(invoice.platform_fee)} />
              <DetailField label="CGST" icon={DollarSign} value={formatCurrency(invoice.cgst)} missing={isMissing(invoice.cgst)} />
              <DetailField label="SGST" icon={DollarSign} value={formatCurrency(invoice.sgst)} missing={isMissing(invoice.sgst)} />
              <DetailField label="Total Amount" icon={DollarSign} missing={isMissing(invoice.total_amount)}>
                <p className={`text-base font-bold m-0 ${isMissing(invoice.total_amount) ? 'text-ink-400 italic text-sm font-medium' : 'text-ink-900'}`}>
                  {formatCurrency(invoice.total_amount)}
                </p>
              </DetailField>
            </div>
          )}
        </div>
      </div>
      
      {/* Processing info */}
      <div className="bg-surface rounded-xl border border-ink-200 p-5">
        <h3 className="text-sm font-semibold text-ink-800 uppercase tracking-wider mb-3 m-0">Processing Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 divide-y sm:divide-y-0 divide-ink-100">
          <DetailField label="Processed At" icon={Clock} value={formatDateTime(invoice.processed_at)} missing={!invoice.processed_at} />
          <DetailField label="Source File" icon={File} value={getFilenameFromKey(invoice.source_key)} missing={!invoice.source_key} />
        </div>
      </div>
      
      {/* OCR Text */}
      {invoice.extracted_text && (
        <div className="bg-surface rounded-xl border border-ink-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-ink-800 uppercase tracking-wider m-0">Extracted OCR Text</h3>
            <button
              onClick={() => setShowOCR(v => !v)}
              className="inline-flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-700 transition-colors bg-transparent border-none cursor-pointer"
              aria-expanded={showOCR}
            >
              {showOCR ? <EyeOff size={13} /> : <Eye size={13} />}
              {showOCR ? 'Hide' : 'Show'} text
            </button>
          </div>
          {showOCR && (
            <pre className="text-xs text-ink-600 bg-surface-raised rounded-lg p-4 overflow-x-auto whitespace-pre-wrap font-mono m-0 border border-ink-100">
              {invoice.extracted_text}
            </pre>
          )}
        </div>
      )}
      
      {/* Detected text with confidence */}
      {invoice.detected_text && invoice.detected_text.length > 0 && (
        <div className="bg-surface rounded-xl border border-ink-200 p-5">
          <h3 className="text-sm font-semibold text-ink-800 uppercase tracking-wider mb-3 m-0">
            Detected Text &amp; Confidence Scores
          </h3>
          <div className="space-y-2">
            {invoice.detected_text.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-raised">
                <span className="text-sm text-ink-700 font-mono truncate mr-3">{item.text}</span>
                <span className={`text-xs font-medium shrink-0 px-2 py-0.5 rounded-full
                  ${item.confidence >= 90 ? 'bg-success-50 text-success-700' :
                    item.confidence >= 70 ? 'bg-warning-50 text-warning-600' :
                    'bg-danger-50 text-danger-600'
                  }`}
                >
                  {(Number(item.confidence) || 0).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
