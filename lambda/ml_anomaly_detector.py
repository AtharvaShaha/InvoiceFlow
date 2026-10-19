"""
InvoiceFlow rule-based anomaly detector.

This is a lightweight, explainable rule-based detector with statistical
outlier checks. It is NOT a trained Random Forest model.
"""
import math
from datetime import datetime, timezone

MODEL_VERSION = "invoiceflow-rules-v1.0.0"
RISK_LOW_MAX = 30
RISK_MEDIUM_MAX = 60

WEIGHTS = {
    "CGST_SGST_MISMATCH": 25,
    "GST_RATE_MISMATCH": 20,
    "TOTAL_MISMATCH": 20,
    "MISSING_FIELDS": 15,
    "AMOUNT_OUTLIER": 20,
    "DUPLICATE": 30,
    "LOW_CONFIDENCE": 15,
}


def _safe_float(value):
    if value is None or value == "":
        return None
    try:
        result = float(value)
        return result if math.isfinite(result) else None
    except (ValueError, TypeError):
        return None


def _risk_level(score):
    if score is None:
        return None
    if score <= RISK_LOW_MAX:
        return "Low"
    if score <= RISK_MEDIUM_MAX:
        return "Medium"
    return "High"


def compute_dataset_stats(invoices):
    amounts = [
        _safe_float(item.get("total_amount"))
        for item in invoices
    ]
    amounts = [amount for amount in amounts if amount is not None and amount > 0]
    if len(amounts) < 2:
        return {"mean": 0.0, "std": 1.0, "count": len(amounts)}
    mean = sum(amounts) / len(amounts)
    variance = sum((amount - mean) ** 2 for amount in amounts) / (len(amounts) - 1)
    std = math.sqrt(variance) if variance > 0 else 1.0
    return {"mean": mean, "std": std, "count": len(amounts)}


def _check_gst(invoice):
    reasons, score = [], 0
    cgst = _safe_float(invoice.get("cgst"))
    sgst = _safe_float(invoice.get("sgst"))
    taxable = _safe_float(invoice.get("platform_fee"))
    total = _safe_float(invoice.get("total_amount"))

    if cgst is not None and sgst is not None and abs(cgst - sgst) > 0.01:
        reasons.append(
            f"CGST/SGST differ: ₹{cgst:.2f} versus ₹{sgst:.2f}; verify the applicable tax treatment."
        )
        score += WEIGHTS["CGST_SGST_MISMATCH"]

    # This assumption is only appropriate when platform_fee represents the taxable base
    # and the invoice is expected to use 9% CGST + 9% SGST.
    if all(value is not None for value in (taxable, cgst, sgst, total)):
        computed_total = taxable + cgst + sgst
        if abs(computed_total - total) <= 1.0:
            expected_cgst = taxable * 0.09
            if abs(expected_cgst - cgst) > 1.0:
                reasons.append(
                    f"CGST differs from the assumed 9% rate on the taxable amount "
                    f"(observed ₹{cgst:.2f}; expected approximately ₹{expected_cgst:.2f})."
                )
                score += WEIGHTS["GST_RATE_MISMATCH"]
    return {"score": min(score, 45), "reasons": reasons}


def _check_total_consistency(invoice):
    reasons, score = [], 0
    cgst = _safe_float(invoice.get("cgst"))
    sgst = _safe_float(invoice.get("sgst"))
    total = _safe_float(invoice.get("total_amount"))
    taxable = _safe_float(invoice.get("platform_fee"))

    if total is not None and cgst is not None and sgst is not None:
        tax_sum = cgst + sgst
        if total + 0.01 < tax_sum:
            reasons.append(
                f"Total ₹{total:.2f} is lower than combined CGST and SGST (₹{tax_sum:.2f})."
            )
            score = WEIGHTS["TOTAL_MISMATCH"]
        elif taxable is not None and abs((taxable + tax_sum) - total) > 1.0:
            reasons.append(
                f"Taxable amount plus CGST/SGST (₹{taxable + tax_sum:.2f}) "
                f"does not closely match reported total (₹{total:.2f}); verify other charges/discounts."
            )
            score = WEIGHTS["TOTAL_MISMATCH"]
    return {"score": score, "reasons": reasons}


def _check_missing_fields(invoice):
    critical_fields = [
        ("invoice_number", "invoice number"),
        ("customer_name", "customer name"),
        ("total_amount", "total amount"),
    ]
    missing = [
        label for key, label in critical_fields
        if invoice.get(key) is None or str(invoice.get(key)).strip() == ""
    ]
    # Tax fields may legitimately be absent on some invoice types, so report them
    # separately without automatically treating every absent tax field as an error.
    for key, label in (("cgst", "CGST"), ("sgst", "SGST")):
        if invoice.get(key) is None or str(invoice.get(key)).strip() == "":
            missing.append(label)

    reasons = [f"Missing {label}" for label in missing]
    if len(missing) >= 3:
        reasons.append("Several key fields are missing; manual review is recommended.")
    score = round(WEIGHTS["MISSING_FIELDS"] * len(missing) / 5)
    return {"score": min(score, WEIGHTS["MISSING_FIELDS"]), "reasons": reasons}


def _check_amount_outlier(invoice, stats):
    amount = _safe_float(invoice.get("total_amount"))
    if amount is None or stats["count"] < 3:
        return {"score": 0, "reasons": []}
    z_score = abs((amount - stats["mean"]) / (stats["std"] or 1.0))
    if z_score > 3:
        return {
            "score": WEIGHTS["AMOUNT_OUTLIER"],
            "reasons": [f"Invoice total ₹{amount:.2f} is a statistical outlier (z-score {z_score:.2f})."],
        }
    if z_score > 2:
        direction = "high" if amount > stats["mean"] else "low"
        return {
            "score": round(WEIGHTS["AMOUNT_OUTLIER"] / 2),
            "reasons": [f"Invoice total ₹{amount:.2f} is unusually {direction} compared with the available invoices (z-score {z_score:.2f})."],
        }
    return {"score": 0, "reasons": []}


def _check_duplicates(invoice, invoices):
    invoice_number = str(invoice.get("invoice_number") or "").strip().casefold()
    if not invoice_number:
        return {"score": 0, "reasons": []}
    duplicates = [
        other for other in invoices
        if str(other.get("invoice_id", "")) != str(invoice.get("invoice_id", ""))
        and str(other.get("invoice_number") or "").strip().casefold() == invoice_number
    ]
    if not duplicates:
        return {"score": 0, "reasons": []}
    ids = ", ".join(str(item.get("invoice_id", "?")) for item in duplicates[:5])
    return {
        "score": WEIGHTS["DUPLICATE"],
        "reasons": [f"Potential duplicate invoice number also appears in record(s): {ids}."],
    }


def _check_ocr_confidence(invoice):
    items = invoice.get("detected_text") or []
    if not isinstance(items, list):
        return {"score": 0, "reasons": []}
    confidences = []
    for item in items:
        if not isinstance(item, dict):
            continue
        value = _safe_float(item.get("confidence"))
        if value is not None:
            confidences.append(value)
    if not confidences:
        return {"score": 0, "reasons": []}
    average = sum(confidences) / len(confidences)
    low = [value for value in confidences if value < 80]
    if average < 75:
        score = WEIGHTS["LOW_CONFIDENCE"]
        reasons = [f"Average detected-text confidence is low ({average:.1f}%)."]
    elif low:
        score = round(WEIGHTS["LOW_CONFIDENCE"] * 0.6)
        reasons = [f"Some detected text has low confidence (minimum {min(confidences):.1f}%)."]
    else:
        score, reasons = 0, []
    return {"score": min(score, WEIGHTS["LOW_CONFIDENCE"]), "reasons": reasons}


def analyze_invoice(invoice, all_invoices=None, dataset_stats=None):
    all_invoices = all_invoices or []
    status = str(invoice.get("status", "")).lower()
    now = datetime.now(timezone.utc).isoformat()

    if status == "processing":
        return {
            "anomaly_score": None, "risk_level": None, "is_anomaly": False,
            "anomaly_reasons": [], "model_version": MODEL_VERSION,
            "prediction_status": "pending", "analyzed_at": None,
        }
    if status == "failed":
        return {
            "anomaly_score": None, "risk_level": None, "is_anomaly": False,
            "anomaly_reasons": [], "model_version": MODEL_VERSION,
            "prediction_status": "skipped", "analyzed_at": now,
        }

    stats = dataset_stats or compute_dataset_stats(all_invoices)
    checks = [
        _check_gst(invoice),
        _check_total_consistency(invoice),
        _check_missing_fields(invoice),
        _check_amount_outlier(invoice, stats),
        _check_duplicates(invoice, all_invoices),
        _check_ocr_confidence(invoice),
    ]
    score = min(100, sum(check["score"] for check in checks))
    reasons = [reason for check in checks for reason in check["reasons"]]
    return {
        "anomaly_score": score,
        "risk_level": _risk_level(score),
        "is_anomaly": bool(reasons),
        "anomaly_reasons": reasons,
        "model_version": MODEL_VERSION,
        "prediction_status": "completed",
        "analyzed_at": now,
    }


def analyze_all_invoices(invoices):
    stats = compute_dataset_stats(invoices)
    return {
        str(invoice.get("invoice_id", "")): analyze_invoice(invoice, invoices, stats)
        for invoice in invoices if invoice.get("invoice_id") is not None
    }
