
import mockInvoices from '../data/mockInvoices';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const USE_API = Boolean(API_BASE_URL);

let mockStore = JSON.parse(JSON.stringify(mockInvoices));

async function apiRequest(path, options = {}) {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not configured in .env');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(`API ${response.status}: ${data.message || text}`);
  }

  return data;
}

// Normalize API field names without inventing missing values.
function normalizeInvoice(invoice = {}) {
  return {
    ...invoice,
    invoice_id: invoice.invoice_id ?? invoice.id ?? '',
    invoice_number: invoice.invoice_number ?? '',
    invoice_date: invoice.invoice_date ?? '',
    customer_name: invoice.customer_name ?? '',
    order_id: invoice.order_id ?? '',
    platform_fee: invoice.platform_fee ?? '',
    cgst: invoice.cgst ?? '',
    sgst: invoice.sgst ?? '',
    total_amount: invoice.total_amount ?? '',
    source_key: invoice.source_key ?? '',
    extracted_text: invoice.extracted_text ?? '',
    detected_text: invoice.detected_text ?? [],
    status: String(invoice.status || 'review').toLowerCase(),
    // ML prediction fields — pass through from API/mock, never invent values
    anomaly_score: invoice.anomaly_score ?? null,
    risk_level: invoice.risk_level ?? null,
    is_anomaly: invoice.is_anomaly ?? false,
    anomaly_reasons: Array.isArray(invoice.anomaly_reasons) ? invoice.anomaly_reasons : [],
    model_version: invoice.model_version ?? null,
    prediction_status: invoice.prediction_status ?? null,
    analyzed_at: invoice.analyzed_at ?? null,
  };
}

function extractInvoiceList(data) {
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.invoices)
      ? data.invoices
      : Array.isArray(data?.items)
        ? data.items
        : [];

  return list.map(normalizeInvoice);
}

export async function getInvoices(filters = {}) {
  let results;

  if (USE_API) {
    // Do not silently show mock data when the real API fails.
    results = extractInvoiceList(await apiRequest('/invoices'));
  } else {
    results = mockStore.map(normalizeInvoice);
  }

  if (filters.search) {
    const term = filters.search.toLowerCase();
    results = results.filter(inv =>
      [inv.invoice_number, inv.customer_name, inv.order_id, inv.invoice_id]
        .some(value => String(value || '').toLowerCase().includes(term))
    );
  }

  if (filters.status && filters.status !== 'all') {
    results = results.filter(
      inv => inv.status === String(filters.status).toLowerCase()
    );
  }

  if (filters.riskLevel && filters.riskLevel !== 'all') {
    results = results.filter(
      inv => inv.risk_level === filters.riskLevel
    );
  }

  if (filters.dateFrom) {
    results = results.filter(inv =>
      inv.invoice_date &&
      new Date(inv.invoice_date) >= new Date(filters.dateFrom)
    );
  }

  if (filters.dateTo) {
    const end = new Date(filters.dateTo);
    end.setHours(23, 59, 59, 999);

    results = results.filter(inv =>
      inv.invoice_date && new Date(inv.invoice_date) <= end
    );
  }

  const sortBy = filters.sortBy || 'processed_at';
  const sortOrder = filters.sortOrder || 'desc';

  results.sort((a, b) => {
    let x = a[sortBy];
    let y = b[sortBy];

    if (x == null || x === '') return 1;
    if (y == null || y === '') return -1;

    if (['total_amount', 'platform_fee', 'cgst', 'sgst', 'anomaly_score'].includes(sortBy)) {
      x = Number(x);
      y = Number(y);
    } else if (['processed_at', 'invoice_date'].includes(sortBy)) {
      x = new Date(x).getTime();
      y = new Date(y).getTime();
    } else {
      x = String(x).toLowerCase();
      y = String(y).toLowerCase();
    }

    if (x < y) return sortOrder === 'asc' ? -1 : 1;
    if (x > y) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return { invoices: results, total: results.length };
}

export async function getInvoiceById(invoiceId) {
  if (USE_API) {
    return normalizeInvoice(
      await apiRequest(`/invoices/${encodeURIComponent(invoiceId)}`)
    );
  }

  const invoice = mockStore.find(inv => inv.invoice_id === invoiceId);
  return invoice ? normalizeInvoice(invoice) : null;
}

export async function updateInvoice(invoiceId, updates) {
  if (USE_API) {
    return normalizeInvoice(
      await apiRequest(`/invoices/${encodeURIComponent(invoiceId)}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      })
    );
  }

  const index = mockStore.findIndex(inv => inv.invoice_id === invoiceId);
  if (index === -1) throw new Error(`Invoice ${invoiceId} not found`);

  mockStore[index] = { ...mockStore[index], ...updates };
  return normalizeInvoice(mockStore[index]);
}

export async function uploadInvoice(file, onProgress) {
  if (!USE_API) {
    throw new Error('Configure VITE_API_BASE_URL before uploading invoices.');
  }

  onProgress?.(10);

  const result = await apiRequest('/invoices/upload-url', {
    method: 'POST',
    body: JSON.stringify({
      filename: file.name,
      content_type: file.type || 'application/octet-stream',
    }),
  });

  if (!result.upload_url || !result.key) {
    throw new Error('Upload API did not return upload_url and key.');
  }

  onProgress?.(30);

  const uploadResponse = await fetch(result.upload_url, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error(`S3 upload failed: ${uploadResponse.status}`);
  }

  onProgress?.(100);

  return {
    invoice_id: '',
    source_key: result.key,
    status: 'processing',
    message: 'Upload successful. Waiting for invoice processing.',
  };
}

export async function getDashboardStats() {
  const { invoices } = await getInvoices({
    sortBy: 'processed_at',
    sortOrder: 'desc',
  });

  const total = invoices.length;
  const processed = invoices.filter(i => i.status === 'processed').length;
  const review = invoices.filter(i => i.status === 'review').length;
  const failed = invoices.filter(i => i.status === 'failed').length;
  const processing = invoices.filter(i => i.status === 'processing').length;

  const totalRevenue = invoices.reduce((sum, invoice) => {
    const amount = Number(invoice.total_amount);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);

  const trendData = [];
  const now = new Date();

  for (let i = 13; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayInvoices = invoices.filter(
      inv => inv.processed_at?.startsWith(dateStr)
    );

    trendData.push({
      date: dateStr,
      label: date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      }),
      total: dayInvoices.length,
      processed: dayInvoices.filter(i => i.status === 'processed').length,
      failed: dayInvoices.filter(
        i => i.status === 'failed' || i.status === 'review'
      ).length,
    });
  }

  // ML risk distribution — computed from prediction fields, not invented
  const analyzedInvoices = invoices.filter(i => i.prediction_status === 'completed');
  const riskLow = analyzedInvoices.filter(i => i.risk_level === 'Low').length;
  const riskMedium = analyzedInvoices.filter(i => i.risk_level === 'Medium').length;
  const riskHigh = analyzedInvoices.filter(i => i.risk_level === 'High').length;
  const anomalyCount = analyzedInvoices.filter(i => i.is_anomaly === true).length;

  return {
    total,
    processed,
    review,
    failed,
    processing,
    totalRevenue,
    invoicesWithAmountsCount: invoices.filter(
      i => i.total_amount !== '' && Number.isFinite(Number(i.total_amount))
    ).length,
    recentInvoices: invoices.slice(0, 5),
    trendData,
    // ML risk stats
    riskLow,
    riskMedium,
    riskHigh,
    anomalyCount,
    analyzedCount: analyzedInvoices.length,
  };
}

export function exportToCSV(invoices) {
  const headers = [
    'Invoice ID', 'Invoice Number', 'Customer Name', 'Invoice Date',
    'Order ID', 'Platform Fee (₹)', 'CGST (₹)', 'SGST (₹)',
    'Total Amount (₹)', 'Status', 'Risk Level', 'Anomaly Score',
    'Is Anomaly', 'Anomaly Reasons', 'Model Version', 'Processed At', 'Source File',
  ];

  const rows = invoices.map(inv => [
    inv.invoice_id,
    inv.invoice_number,
    inv.customer_name,
    inv.invoice_date,
    inv.order_id,
    inv.platform_fee,
    inv.cgst,
    inv.sgst,
    inv.total_amount,
    inv.status,
    inv.risk_level ?? '',
    inv.anomaly_score ?? '',
    inv.is_anomaly ? 'Yes' : 'No',
    Array.isArray(inv.anomaly_reasons) ? inv.anomaly_reasons.join('; ') : '',
    inv.model_version ?? '',
    inv.processed_at,
    inv.source_key,
  ]);

  return [
    headers.join(','),
    ...rows.map(row =>
      row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');
}

export function downloadCSV(
  invoices,
  filename = 'invoiceflow-export.csv'
) {
  const blob = new Blob([exportToCSV(invoices)], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
