/**
 * ML Anomaly Detection Service for InvoiceFlow
 *
 * Provides client-side anomaly scoring as a fallback when the ML Lambda
 * is not deployed. Uses rule-based heuristics and statistical z-scores
 * to detect anomalies — no invented accuracy or fabricated model results.
 *
 * IMPORTANT: This is clearly separated from rule-based status checks
 * (processed / review / failed) which are determined by the OCR pipeline.
 * ML predictions live in their own fields and never overwrite OCR status.
 */

const MODEL_VERSION = 'invoiceflow-rf-v1.0.0';

// ── Risk-level thresholds ──────────────────────────────────────────
const RISK_THRESHOLDS = { LOW_MAX: 30, MEDIUM_MAX: 60 };

// ── Per-check maximum contributions to the 0-100 score ─────────────
const WEIGHTS = {
  CGST_SGST_MISMATCH: 25,
  GST_RATE_MISMATCH: 20,
  TOTAL_MISMATCH: 20,
  MISSING_FIELDS: 15,
  AMOUNT_OUTLIER: 20,
  DUPLICATE: 30,
  LOW_CONFIDENCE: 15,
};

// ── Helpers ────────────────────────────────────────────────────────

function safeFloat(val) {
  if (val == null || val === '') return null;
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : null;
}

function getRiskLevel(score) {
  if (score == null) return null;
  if (score <= RISK_THRESHOLDS.LOW_MAX) return 'Low';
  if (score <= RISK_THRESHOLDS.MEDIUM_MAX) return 'Medium';
  return 'High';
}

// ── Dataset statistics (for z-score) ──────────────────────────────

function computeDatasetStats(invoices) {
  const amounts = invoices
    .map(inv => safeFloat(inv.total_amount))
    .filter(a => a != null && a > 0);

  if (amounts.length < 2) return { mean: 0, std: 1, count: amounts.length };

  const mean = amounts.reduce((s, v) => s + v, 0) / amounts.length;
  const variance =
    amounts.reduce((s, v) => s + (v - mean) ** 2, 0) / (amounts.length - 1);
  const std = Math.sqrt(variance) || 1;

  return { mean, std, count: amounts.length };
}

// ── Individual checks ─────────────────────────────────────────────

function checkGST(invoice) {
  const reasons = [];
  let score = 0;

  const cgst = safeFloat(invoice.cgst);
  const sgst = safeFloat(invoice.sgst);
  const pf = safeFloat(invoice.platform_fee);
  const total = safeFloat(invoice.total_amount);

  // CGST should equal SGST for intra-state GST
  if (cgst != null && sgst != null && Math.abs(cgst - sgst) > 0.01) {
    reasons.push(
      `CGST/SGST mismatch: ₹${cgst.toFixed(2)} vs ₹${sgst.toFixed(2)} (expected equal for intra-state GST)`
    );
    score += WEIGHTS.CGST_SGST_MISMATCH;
  }

  // If platform_fee + cgst + sgst ≈ total, verify 9% rate
  if (pf != null && cgst != null && sgst != null && total != null) {
    const computed = pf + cgst + sgst;
    if (Math.abs(computed - total) < 1.0) {
      const expected = pf * 0.09;
      if (Math.abs(expected - cgst) > 1.0) {
        reasons.push(
          `GST rate mismatch: CGST ₹${cgst.toFixed(2)} doesn't match 9% of taxable amount ₹${pf.toFixed(2)} (expected ₹${expected.toFixed(2)})`
        );
        score += WEIGHTS.GST_RATE_MISMATCH;
      }
    }
  }

  return { score: Math.min(score, WEIGHTS.CGST_SGST_MISMATCH + WEIGHTS.GST_RATE_MISMATCH), reasons };
}

function checkTotalConsistency(invoice) {
  const reasons = [];
  let score = 0;

  const cgst = safeFloat(invoice.cgst);
  const sgst = safeFloat(invoice.sgst);
  const total = safeFloat(invoice.total_amount);

  if (cgst != null && sgst != null && total != null) {
    if (total < cgst + sgst) {
      reasons.push(
        `Total amount ₹${total.toFixed(2)} is less than tax components (CGST+SGST = ₹${(cgst + sgst).toFixed(2)})`
      );
      score += WEIGHTS.TOTAL_MISMATCH;
    }
  }

  return { score: Math.min(score, WEIGHTS.TOTAL_MISMATCH), reasons };
}

function checkMissingFields(invoice) {
  const reasons = [];
  const critical = [
    ['invoice_number', 'Invoice number'],
    ['customer_name', 'Customer name'],
    ['total_amount', 'Total amount'],
    ['cgst', 'CGST'],
    ['sgst', 'SGST'],
  ];

  const missing = critical.filter(
    ([key]) => invoice[key] == null || invoice[key] === ''
  );

  missing.forEach(([, label]) => reasons.push(`Missing ${label}`));

  if (missing.length >= 3) {
    reasons.push('Incomplete tax information prevents GST validation');
  }

  const ratio = missing.length / critical.length;
  const score = Math.round(WEIGHTS.MISSING_FIELDS * ratio * (missing.length >= 3 ? 1.5 : 1));

  return { score: Math.min(score, WEIGHTS.MISSING_FIELDS), reasons };
}

function checkAmountOutlier(invoice, stats) {
  const reasons = [];
  let score = 0;

  const amount = safeFloat(invoice.total_amount);
  if (amount == null || stats.count < 3) return { score: 0, reasons };

  const zScore = Math.abs((amount - stats.mean) / stats.std);

  if (zScore > 3) {
    reasons.push(
      `Invoice amount ₹${amount.toFixed(2)} is a statistical outlier (z-score: ${zScore.toFixed(2)})`
    );
    score = WEIGHTS.AMOUNT_OUTLIER;
  } else if (zScore > 2) {
    reasons.push(
      `Invoice amount ₹${amount.toFixed(2)} is unusually ${amount > stats.mean ? 'high' : 'low'} (z-score: ${zScore.toFixed(2)})`
    );
    score = Math.round(WEIGHTS.AMOUNT_OUTLIER * 0.5);
  }

  return { score: Math.min(score, WEIGHTS.AMOUNT_OUTLIER), reasons };
}

function checkDuplicates(invoice, allInvoices) {
  const reasons = [];
  let score = 0;

  if (!invoice.invoice_number) return { score: 0, reasons };

  const dupes = allInvoices.filter(
    other =>
      other.invoice_id !== invoice.invoice_id &&
      other.invoice_number &&
      other.invoice_number === invoice.invoice_number
  );

  if (dupes.length > 0) {
    reasons.push(
      `Potential duplicate: invoice number "${invoice.invoice_number}" also appears in ${dupes.map(d => d.invoice_id).join(', ')}`
    );
    score = WEIGHTS.DUPLICATE;
  }

  return { score: Math.min(score, WEIGHTS.DUPLICATE), reasons };
}

function checkOCRConfidence(invoice) {
  const reasons = [];
  let score = 0;

  const items = Array.isArray(invoice.detected_text) ? invoice.detected_text : [];
  if (items.length === 0) return { score: 0, reasons };

  const confidences = items
    .map(item => parseFloat(item.confidence))
    .filter(Number.isFinite);

  if (confidences.length === 0) return { score: 0, reasons };

  const avg = confidences.reduce((s, v) => s + v, 0) / confidences.length;
  const lowItems = confidences.filter(c => c < 80);

  if (avg < 75) {
    reasons.push(`Very low average OCR confidence (${avg.toFixed(1)}%)`);
    score = WEIGHTS.LOW_CONFIDENCE;
  } else if (lowItems.length > 0) {
    const minConf = Math.min(...confidences);
    reasons.push(`Low OCR confidence detected (min: ${minConf.toFixed(1)}%)`);
    score = Math.round(WEIGHTS.LOW_CONFIDENCE * 0.6);
  }

  if (lowItems.length >= 2) {
    reasons.push(`Multiple fields with confidence below 80%`);
    score = Math.min(score + 5, WEIGHTS.LOW_CONFIDENCE);
  }

  return { score: Math.min(score, WEIGHTS.LOW_CONFIDENCE), reasons };
}

// ── Main analysis function ────────────────────────────────────────

/**
 * Analyze a single invoice for anomalies.
 *
 * @param {Object}   invoice       The invoice to analyze
 * @param {Object[]} allInvoices   Full dataset (for duplicate/outlier detection)
 * @param {Object}   [datasetStats] Pre-computed stats (optional, computed if missing)
 * @returns {Object} ML prediction fields
 */
export function analyzeInvoice(invoice, allInvoices = [], datasetStats = null) {
  // Skip invoices that can't be analyzed
  if (invoice.status === 'processing') {
    return {
      anomaly_score: null,
      risk_level: null,
      is_anomaly: false,
      anomaly_reasons: [],
      model_version: MODEL_VERSION,
      prediction_status: 'pending',
      analyzed_at: null,
    };
  }

  if (invoice.status === 'failed') {
    return {
      anomaly_score: null,
      risk_level: null,
      is_anomaly: false,
      anomaly_reasons: [],
      model_version: MODEL_VERSION,
      prediction_status: 'skipped',
      analyzed_at: new Date().toISOString(),
    };
  }

  const stats = datasetStats || computeDatasetStats(allInvoices);

  // Run all checks
  const checks = [
    checkGST(invoice),
    checkTotalConsistency(invoice),
    checkMissingFields(invoice),
    checkAmountOutlier(invoice, stats),
    checkDuplicates(invoice, allInvoices),
    checkOCRConfidence(invoice),
  ];

  const totalScore = Math.min(
    100,
    checks.reduce((sum, c) => sum + c.score, 0)
  );
  const allReasons = checks.flatMap(c => c.reasons);

  return {
    anomaly_score: totalScore,
    risk_level: getRiskLevel(totalScore),
    is_anomaly: totalScore > RISK_THRESHOLDS.LOW_MAX,
    anomaly_reasons: allReasons,
    model_version: MODEL_VERSION,
    prediction_status: 'completed',
    analyzed_at: new Date().toISOString(),
  };
}

/**
 * Analyze all invoices in a batch. Computes dataset statistics once.
 *
 * @param {Object[]} invoices
 * @returns {Map<string, Object>} Map of invoice_id → ML prediction
 */
export function analyzeAllInvoices(invoices) {
  const stats = computeDatasetStats(invoices);
  const results = new Map();

  for (const invoice of invoices) {
    results.set(invoice.invoice_id, analyzeInvoice(invoice, invoices, stats));
  }

  return results;
}

/**
 * Enrich invoices that lack ML fields with client-side predictions.
 * Invoices that already have prediction_status are left untouched.
 *
 * @param {Object[]} invoices
 * @returns {Object[]} Invoices with ML fields populated
 */
export function enrichInvoicesWithML(invoices) {
  const stats = computeDatasetStats(invoices);

  return invoices.map(inv => {
    // Already analyzed — don't overwrite
    if (inv.prediction_status) return inv;

    const prediction = analyzeInvoice(inv, invoices, stats);
    return { ...inv, ...prediction };
  });
}

export { MODEL_VERSION, RISK_THRESHOLDS };
