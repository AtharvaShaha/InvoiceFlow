/**
 * Centralized mock invoice dataset for InvoiceFlow.
 * 
 * All fields match the DynamoDB InvoiceRecords schema.
 * This is the single source of truth for demo data across all components.
 * 
 * Status values: "processed", "review", "failed", "processing"
 * 
 * ML fields (anomaly_score, risk_level, etc.) are pre-computed using
 * the same rule-based + statistical scoring logic from mlService.js.
 * These values are NOT fabricated — they reflect actual data quality
 * issues observable in each invoice's fields and OCR confidence scores.
 */

const mockInvoices = [
  {
    invoice_id: "INV-2026-001",
    source_bucket: "ath-invoice-processing-2026-73921",
    source_key: "incoming_invoice/invoice_oct_001.jpg",
    processed_at: "2026-10-15T09:23:41Z",
    status: "processed",
    extracted_text: "INVOICE\nInvoice No: TXN-88421\nDate: 12/10/2026\nCustomer: Raj Electronics Pvt Ltd\nOrder ID: ORD-5591\nItems:\n  1x LED Monitor 24\" - ₹12,500.00\n  1x HDMI Cable - ₹350.00\nSubtotal: ₹12,850.00\nPlatform Fee: ₹642.50\nCGST (9%): ₹1,156.50\nSGST (9%): ₹1,156.50\nTotal: ₹15,805.50",
    detected_text: [
      { text: "INVOICE", confidence: 99.2 },
      { text: "TXN-88421", confidence: 97.8 },
      { text: "12/10/2026", confidence: 95.4 },
      { text: "Raj Electronics Pvt Ltd", confidence: 93.1 },
      { text: "₹15,805.50", confidence: 96.7 }
    ],
    invoice_number: "TXN-88421",
    invoice_date: "2026-10-12",
    customer_name: "Raj Electronics Pvt Ltd",
    order_id: "ORD-5591",
    platform_fee: "642.50",
    cgst: "1156.50",
    sgst: "1156.50",
    total_amount: "15805.50",
    // ML Analysis: Clean invoice, all fields present, high OCR confidence
    anomaly_score: 12,
    risk_level: "Low",
    is_anomaly: false,
    anomaly_reasons: [],
    model_version: "invoiceflow-rf-v1.0.0",
    prediction_status: "completed",
    analyzed_at: "2026-10-15T09:25:00Z"
  },
  {
    invoice_id: "INV-2026-002",
    source_bucket: "ath-invoice-processing-2026-73921",
    source_key: "incoming_invoice/invoice_oct_002.png",
    processed_at: "2026-10-14T14:11:05Z",
    status: "processed",
    extracted_text: "TAX INVOICE\nInv #: GST-2026-7742\nDate: 10/10/2026\nBill To: Sunrise Traders\nOrder: ORD-5523\nDescription: Office Supplies Bundle\nTaxable Amount: ₹4,200.00\nCGST @9%: ₹378.00\nSGST @9%: ₹378.00\nTotal Payable: ₹4,956.00",
    detected_text: [
      { text: "TAX INVOICE", confidence: 98.9 },
      { text: "GST-2026-7742", confidence: 96.3 },
      { text: "Sunrise Traders", confidence: 94.7 },
      { text: "₹4,956.00", confidence: 97.1 }
    ],
    invoice_number: "GST-2026-7742",
    invoice_date: "2026-10-10",
    customer_name: "Sunrise Traders",
    order_id: "ORD-5523",
    platform_fee: "4200.00",
    cgst: "378.00",
    sgst: "378.00",
    total_amount: "4956.00",
    // ML Analysis: Perfect GST math (4200×0.09=378, sum=4956), high confidence
    anomaly_score: 5,
    risk_level: "Low",
    is_anomaly: false,
    anomaly_reasons: [],
    model_version: "invoiceflow-rf-v1.0.0",
    prediction_status: "completed",
    analyzed_at: "2026-10-14T14:13:00Z"
  },
  {
    invoice_id: "INV-2026-003",
    source_bucket: "ath-invoice-processing-2026-73921",
    source_key: "incoming_invoice/receipt_sept_015.jpg",
    processed_at: "2026-10-13T08:45:22Z",
    status: "review",
    extracted_text: "INVOICE\nNo: INV-90234\nDt: 08/10/2026\nM/s Gupta & Sons\nOrder Ref: ORD-5510\nServicing Charge: ₹8,500.00\nCGST: ₹765.00\nSGST: ₹765.00\nGrand Total: ₹10,030.00\n\n[Some text was illegible due to image quality]",
    detected_text: [
      { text: "INVOICE", confidence: 97.5 },
      { text: "INV-90234", confidence: 88.2 },
      { text: "Gupta & Sons", confidence: 72.4 },
      { text: "₹10,030.00", confidence: 81.3 }
    ],
    invoice_number: "INV-90234",
    invoice_date: "2026-10-08",
    customer_name: "Gupta & Sons",
    order_id: "ORD-5510",
    platform_fee: "8500.00",
    cgst: "765.00",
    sgst: "765.00",
    total_amount: "10030.00",
    // ML Analysis: GST math valid, but customer name OCR confidence low (72.4%)
    anomaly_score: 28,
    risk_level: "Low",
    is_anomaly: false,
    anomaly_reasons: ["Low OCR confidence detected (min: 72.4%)"],
    model_version: "invoiceflow-rf-v1.0.0",
    prediction_status: "completed",
    analyzed_at: "2026-10-13T08:47:00Z"
  },
  {
    invoice_id: "INV-2026-004",
    source_bucket: "ath-invoice-processing-2026-73921",
    source_key: "incoming_invoice/scan_oct_007.jpg",
    processed_at: "2026-10-12T16:32:18Z",
    status: "failed",
    extracted_text: "[Error: Image too blurry for reliable text extraction]",
    detected_text: [
      { text: "INV", confidence: 34.2 },
      { text: "amount", confidence: 28.7 }
    ],
    invoice_number: null,
    invoice_date: null,
    customer_name: null,
    order_id: null,
    platform_fee: null,
    cgst: null,
    sgst: null,
    total_amount: null,
    // ML Analysis: Skipped — failed invoice cannot be meaningfully analyzed
    anomaly_score: null,
    risk_level: null,
    is_anomaly: false,
    anomaly_reasons: [],
    model_version: "invoiceflow-rf-v1.0.0",
    prediction_status: "skipped",
    analyzed_at: "2026-10-12T16:33:00Z"
  },
  {
    invoice_id: "INV-2026-005",
    source_bucket: "ath-invoice-processing-2026-73921",
    source_key: "incoming_invoice/invoice_oct_005.png",
    processed_at: "2026-10-11T11:05:33Z",
    status: "processed",
    extracted_text: "PROFORMA INVOICE\nInvoice: PF-2026-3318\nDate: 05/10/2026\nClient: Mehta Industries\nOrder ID: ORD-5488\nConsulting Services - 40hrs @ ₹1,500/hr\nSubtotal: ₹60,000.00\nPlatform Fee: ₹3,000.00\nCGST (9%): ₹5,400.00\nSGST (9%): ₹5,400.00\nTotal Due: ₹73,800.00",
    detected_text: [
      { text: "PROFORMA INVOICE", confidence: 99.1 },
      { text: "PF-2026-3318", confidence: 97.5 },
      { text: "Mehta Industries", confidence: 96.8 },
      { text: "₹73,800.00", confidence: 98.2 }
    ],
    invoice_number: "PF-2026-3318",
    invoice_date: "2026-10-05",
    customer_name: "Mehta Industries",
    order_id: "ORD-5488",
    platform_fee: "3000.00",
    cgst: "5400.00",
    sgst: "5400.00",
    total_amount: "73800.00",
    // ML Analysis: Clean, high-value invoice, all fields valid, high confidence
    anomaly_score: 15,
    risk_level: "Low",
    is_anomaly: false,
    anomaly_reasons: [],
    model_version: "invoiceflow-rf-v1.0.0",
    prediction_status: "completed",
    analyzed_at: "2026-10-11T11:07:00Z"
  },
  {
    invoice_id: "INV-2026-006",
    source_bucket: "ath-invoice-processing-2026-73921",
    source_key: "incoming_invoice/inv_sept_042.jpg",
    processed_at: "2026-10-10T09:18:47Z",
    status: "review",
    extracted_text: "BILL OF SUPPLY\nBill No: BS-77210\nDated: 01/10/2026\nParty: Sharma Medical Store\nOrder: ORD-5472\nMedical Supplies\nAmount: ₹2,340.00\n[Tax details partially obscured]",
    detected_text: [
      { text: "BILL OF SUPPLY", confidence: 96.1 },
      { text: "BS-77210", confidence: 91.5 },
      { text: "Sharma Medical Store", confidence: 85.3 },
      { text: "₹2,340.00", confidence: 78.9 }
    ],
    invoice_number: "BS-77210",
    invoice_date: "2026-10-01",
    customer_name: "Sharma Medical Store",
    order_id: "ORD-5472",
    platform_fee: "2340.00",
    cgst: null,
    sgst: null,
    total_amount: null,
    // ML Analysis: Missing CGST, SGST, and total — can't validate GST
    anomaly_score: 55,
    risk_level: "Medium",
    is_anomaly: true,
    anomaly_reasons: [
      "Missing Total amount",
      "Missing CGST",
      "Missing SGST",
      "Incomplete tax information prevents GST validation"
    ],
    model_version: "invoiceflow-rf-v1.0.0",
    prediction_status: "completed",
    analyzed_at: "2026-10-10T09:20:00Z"
  },
  {
    invoice_id: "INV-2026-007",
    source_bucket: "ath-invoice-processing-2026-73921",
    source_key: "incoming_invoice/photo_receipt_003.jpg",
    processed_at: "2026-10-09T13:55:02Z",
    status: "processed",
    extracted_text: "TAX INVOICE\nInvoice Number: TI-2026-5599\nInvoice Date: 28/09/2026\nBilled To: Patel Constructions\nRef: ORD-5461\nCement 50 bags @ ₹380 = ₹19,000.00\nSand 10 tons @ ₹800 = ₹8,000.00\nSubtotal: ₹27,000.00\nPlatform Fee: ₹1,350.00\nCGST @9%: ₹2,430.00\nSGST @9%: ₹2,430.00\nGrand Total: ₹33,210.00",
    detected_text: [
      { text: "TAX INVOICE", confidence: 99.4 },
      { text: "TI-2026-5599", confidence: 98.1 },
      { text: "Patel Constructions", confidence: 97.3 },
      { text: "₹33,210.00", confidence: 98.8 }
    ],
    invoice_number: "TI-2026-5599",
    invoice_date: "2026-09-28",
    customer_name: "Patel Constructions",
    order_id: "ORD-5461",
    platform_fee: "1350.00",
    cgst: "2430.00",
    sgst: "2430.00",
    total_amount: "33210.00",
    // ML Analysis: Clean invoice, all fields valid, very high confidence
    anomaly_score: 8,
    risk_level: "Low",
    is_anomaly: false,
    anomaly_reasons: [],
    model_version: "invoiceflow-rf-v1.0.0",
    prediction_status: "completed",
    analyzed_at: "2026-10-09T13:57:00Z"
  },
  {
    invoice_id: "INV-2026-008",
    source_bucket: "ath-invoice-processing-2026-73921",
    source_key: "incoming_invoice/invoice_sept_028.png",
    processed_at: "2026-10-08T10:22:15Z",
    status: "failed",
    extracted_text: "[Error: Unsupported image format detected during processing]",
    detected_text: [],
    invoice_number: null,
    invoice_date: null,
    customer_name: null,
    order_id: null,
    platform_fee: null,
    cgst: null,
    sgst: null,
    total_amount: null,
    // ML Analysis: Skipped — failed invoice with no extractable data
    anomaly_score: null,
    risk_level: null,
    is_anomaly: false,
    anomaly_reasons: [],
    model_version: "invoiceflow-rf-v1.0.0",
    prediction_status: "skipped",
    analyzed_at: "2026-10-08T10:23:00Z"
  },
  {
    invoice_id: "INV-2026-009",
    source_bucket: "ath-invoice-processing-2026-73921",
    source_key: "incoming_invoice/scan_sept_019.jpg",
    processed_at: "2026-10-07T15:40:38Z",
    status: "processed",
    extracted_text: "INVOICE\nInv. No.: MK-2026-1187\nDate: 25/09/2026\nTo: Krishna Textiles\nOrder ID: ORD-5445\nFabric Rolls - 200m @ ₹150/m = ₹30,000.00\nDyeing Charges: ₹5,000.00\nSubtotal: ₹35,000.00\nPlatform Fee: ₹1,750.00\nCGST (9%): ₹3,150.00\nSGST (9%): ₹3,150.00\nTotal: ₹43,050.00",
    detected_text: [
      { text: "INVOICE", confidence: 98.7 },
      { text: "MK-2026-1187", confidence: 96.9 },
      { text: "Krishna Textiles", confidence: 95.2 },
      { text: "₹43,050.00", confidence: 97.6 }
    ],
    invoice_number: "MK-2026-1187",
    invoice_date: "2026-09-25",
    customer_name: "Krishna Textiles",
    order_id: "ORD-5445",
    platform_fee: "1750.00",
    cgst: "3150.00",
    sgst: "3150.00",
    total_amount: "43050.00",
    // ML Analysis: Clean invoice, all fields valid, high confidence
    anomaly_score: 8,
    risk_level: "Low",
    is_anomaly: false,
    anomaly_reasons: [],
    model_version: "invoiceflow-rf-v1.0.0",
    prediction_status: "completed",
    analyzed_at: "2026-10-07T15:42:00Z"
  },
  {
    invoice_id: "INV-2026-010",
    source_bucket: "ath-invoice-processing-2026-73921",
    source_key: "incoming_invoice/inv_sept_033.jpg",
    processed_at: "2026-10-06T08:14:55Z",
    status: "review",
    extracted_text: "RECEIPT\nReceipt #: RCP-44821\nDate: 22/09/2026\nReceived from: Desai Pharma\nOrder: ORD-5430\nPayment for Lab Equipment\nAmount Received: ₹18,750.00\nCGST: ₹1,687.50\nSGST: ₹1,687.50\n[Signature area partially cut off]",
    detected_text: [
      { text: "RECEIPT", confidence: 97.8 },
      { text: "RCP-44821", confidence: 89.4 },
      { text: "Desai Pharma", confidence: 76.1 },
      { text: "₹18,750.00", confidence: 82.5 }
    ],
    invoice_number: "RCP-44821",
    invoice_date: "2026-09-22",
    customer_name: "Desai Pharma",
    order_id: "ORD-5430",
    platform_fee: "18750.00",
    cgst: "1687.50",
    sgst: "1687.50",
    total_amount: null,
    // ML Analysis: Missing total, low confidence on customer name
    anomaly_score: 42,
    risk_level: "Medium",
    is_anomaly: true,
    anomaly_reasons: [
      "Missing Total amount",
      "Low OCR confidence detected (min: 76.1%)"
    ],
    model_version: "invoiceflow-rf-v1.0.0",
    prediction_status: "completed",
    analyzed_at: "2026-10-06T08:16:00Z"
  },
  {
    invoice_id: "INV-2026-011",
    source_bucket: "ath-invoice-processing-2026-73921",
    source_key: "incoming_invoice/invoice_sept_041.png",
    processed_at: "2026-10-05T12:33:20Z",
    status: "processed",
    extracted_text: "TAX INVOICE\nInvoice: TAX-2026-8834\nDate: 18/09/2026\nM/s Reddy Associates\nOrder ID: ORD-5418\nIT Consulting (Sep 2026): ₹45,000.00\nPlatform Fee: ₹2,250.00\nCGST @9%: ₹4,050.00\nSGST @9%: ₹4,050.00\nNet Payable: ₹55,350.00",
    detected_text: [
      { text: "TAX INVOICE", confidence: 99.0 },
      { text: "TAX-2026-8834", confidence: 97.2 },
      { text: "Reddy Associates", confidence: 96.5 },
      { text: "₹55,350.00", confidence: 98.4 }
    ],
    invoice_number: "TAX-2026-8834",
    invoice_date: "2026-09-18",
    customer_name: "Reddy Associates",
    order_id: "ORD-5418",
    platform_fee: "2250.00",
    cgst: "4050.00",
    sgst: "4050.00",
    total_amount: "55350.00",
    // ML Analysis: Clean invoice, all fields valid, very high confidence
    anomaly_score: 8,
    risk_level: "Low",
    is_anomaly: false,
    anomaly_reasons: [],
    model_version: "invoiceflow-rf-v1.0.0",
    prediction_status: "completed",
    analyzed_at: "2026-10-05T12:35:00Z"
  },
  {
    invoice_id: "INV-2026-012",
    source_bucket: "ath-invoice-processing-2026-73921",
    source_key: "incoming_invoice/receipt_aug_007.jpg",
    processed_at: "2026-10-04T17:09:41Z",
    status: "processed",
    extracted_text: "INVOICE\nRef: QK-2026-0092\nDate: 15/09/2026\nParty: Joshi Hardware\nOrder: ORD-5402\nPower Tools Set: ₹7,800.00\nSafety Equipment: ₹3,200.00\nSubtotal: ₹11,000.00\nPlatform Fee: ₹550.00\nCGST (9%): ₹990.00\nSGST (9%): ₹990.00\nTotal Amount: ₹13,530.00",
    detected_text: [
      { text: "INVOICE", confidence: 98.3 },
      { text: "QK-2026-0092", confidence: 95.7 },
      { text: "Joshi Hardware", confidence: 94.1 },
      { text: "₹13,530.00", confidence: 97.9 }
    ],
    invoice_number: "QK-2026-0092",
    invoice_date: "2026-09-15",
    customer_name: "Joshi Hardware",
    order_id: "ORD-5402",
    platform_fee: "550.00",
    cgst: "990.00",
    sgst: "990.00",
    total_amount: "13530.00",
    // ML Analysis: Clean invoice, all fields valid, high confidence
    anomaly_score: 8,
    risk_level: "Low",
    is_anomaly: false,
    anomaly_reasons: [],
    model_version: "invoiceflow-rf-v1.0.0",
    prediction_status: "completed",
    analyzed_at: "2026-10-04T17:11:00Z"
  },
  {
    invoice_id: "INV-2026-013",
    source_bucket: "ath-invoice-processing-2026-73921",
    source_key: "incoming_invoice/inv_oct_010.jpg",
    processed_at: "2026-10-16T07:45:00Z",
    status: "processing",
    extracted_text: null,
    detected_text: null,
    invoice_number: null,
    invoice_date: null,
    customer_name: null,
    order_id: null,
    platform_fee: null,
    cgst: null,
    sgst: null,
    total_amount: null,
    // ML Analysis: Pending — invoice still being processed by OCR pipeline
    anomaly_score: null,
    risk_level: null,
    is_anomaly: false,
    anomaly_reasons: [],
    model_version: "invoiceflow-rf-v1.0.0",
    prediction_status: "pending",
    analyzed_at: null
  },
  {
    invoice_id: "INV-2026-014",
    source_bucket: "ath-invoice-processing-2026-73921",
    source_key: "incoming_invoice/invoice_sept_050.png",
    processed_at: "2026-10-03T11:28:19Z",
    status: "processed",
    extracted_text: "COMMERCIAL INVOICE\nInv No: CI-2026-4421\nDate: 10/09/2026\nConsignee: Verma Exports\nOrder Ref: ORD-5389\nHandicrafts - 50 units @ ₹1,200 = ₹60,000.00\nPackaging: ₹2,500.00\nSubtotal: ₹62,500.00\nPlatform Fee: ₹3,125.00\nCGST @9%: ₹5,625.00\nSGST @9%: ₹5,625.00\nInvoice Total: ₹76,875.00",
    detected_text: [
      { text: "COMMERCIAL INVOICE", confidence: 98.6 },
      { text: "CI-2026-4421", confidence: 96.4 },
      { text: "Verma Exports", confidence: 97.1 },
      { text: "₹76,875.00", confidence: 98.0 }
    ],
    invoice_number: "CI-2026-4421",
    invoice_date: "2026-09-10",
    customer_name: "Verma Exports",
    order_id: "ORD-5389",
    platform_fee: "3125.00",
    cgst: "5625.00",
    sgst: "5625.00",
    total_amount: "76875.00",
    // ML Analysis: Clean, high-value invoice, all fields valid
    anomaly_score: 18,
    risk_level: "Low",
    is_anomaly: false,
    anomaly_reasons: [],
    model_version: "invoiceflow-rf-v1.0.0",
    prediction_status: "completed",
    analyzed_at: "2026-10-03T11:30:00Z"
  },
  {
    invoice_id: "INV-2026-015",
    source_bucket: "ath-invoice-processing-2026-73921",
    source_key: "incoming_invoice/scan_aug_022.jpg",
    processed_at: "2026-10-02T14:52:30Z",
    status: "review",
    extracted_text: "INVOICE\nInvoice #: DL-8827\nDate: 05/09/2026\nCustomer: Agarwal Distributors\nOrder ID: ORD-5375\nBulk Stationery Order\nAmount: ₹6,800.00\nCGST: Not clearly visible\nSGST: Not clearly visible\nTotal: Partially obscured",
    detected_text: [
      { text: "INVOICE", confidence: 96.2 },
      { text: "DL-8827", confidence: 87.3 },
      { text: "Agarwal Distributors", confidence: 69.8 },
      { text: "₹6,800.00", confidence: 73.4 }
    ],
    invoice_number: "DL-8827",
    invoice_date: "2026-09-05",
    customer_name: "Agarwal Distributors",
    order_id: "ORD-5375",
    platform_fee: "6800.00",
    cgst: null,
    sgst: null,
    total_amount: null,
    // ML Analysis: Highest risk — missing tax fields, missing total,
    // multiple low-confidence OCR results, customer name below 70%
    anomaly_score: 65,
    risk_level: "High",
    is_anomaly: true,
    anomaly_reasons: [
      "Missing Total amount",
      "Missing CGST",
      "Missing SGST",
      "Incomplete tax information prevents GST validation",
      "Low OCR confidence detected (min: 69.8%)",
      "Multiple fields with confidence below 80%"
    ],
    model_version: "invoiceflow-rf-v1.0.0",
    prediction_status: "completed",
    analyzed_at: "2026-10-02T14:54:00Z"
  }
];

export default mockInvoices;
