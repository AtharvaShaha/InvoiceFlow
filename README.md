# InvoiceFlow --- Serverless Invoice Processing & Anomaly Risk Dashboard

InvoiceFlow is an educational project combining a React dashboard with
an AWS serverless invoice-processing pipeline. Invoice images are
uploaded to Amazon S3, text is extracted with Amazon Rekognition,
invoice records are stored in DynamoDB, and a separate Lambda function
calculates explainable anomaly-risk indicators.

> **Implementation status:** The supplied frontend snapshot still
> displays a Demo Mode notice on the upload page. The API service layer
> supports API Gateway requests when `VITE_API_BASE_URL` is configured,
> but the end-to-end upload-to-dashboard workflow must be verified. The
> last observed upload attempt returned HTTP 200 for `upload-url`,
> followed by an S3 CORS error.
>
> **ML terminology:** The current anomaly detector is a lightweight
> **rule-based/statistical risk scorer**, not a trained Random Forest
> model. It provides review signals; it does not prove fraud.

## Features

### Frontend

-   Dashboard with invoice statistics, recent invoices, and charts.
-   Invoice upload interface with image preview and JPG/JPEG/PNG
    validation (10 MB maximum).
-   Invoice history with search, status/date filters, sorting,
    pagination, and CSV export.
-   Invoice details with extracted fields, OCR text, detected-text
    confidence, and field editing.
-   Analytics and settings pages.
-   Risk badges and dashboard risk summaries for records containing
    anomaly attributes.

### AWS processing

-   Amazon S3 stores invoice images under `incoming_invoice/`.
-   S3 object-created events invoke `process-invoice-image`.
-   Amazon Rekognition `DetectText` extracts text and confidence values.
-   The OCR Lambda attempts to parse invoice number, date, order ID,
    customer name, platform fee, CGST, SGST, and total amount.
-   DynamoDB stores records in `InvoiceRecords`.
-   `InvoiceFlow-ML-AnomalyDetector` supports single-invoice and batch
    analysis.

## Architecture

``` text
React + Vite frontend
        | API requests (VITE_API_BASE_URL)
        v
Amazon API Gateway HTTP API -> invoice-api-handler
        |                         |-- List/read invoice records
        |                         |-- Generate presigned S3 URL
        v
Amazon S3: incoming_invoice/
        | S3 ObjectCreated event
        v
process-invoice-image Lambda
        | Amazon Rekognition DetectText
        | Extract available invoice fields
        v
DynamoDB: InvoiceRecords
        | invoke anomaly Lambda after save (when deployed/configured)
        v
InvoiceFlow-ML-AnomalyDetector
        | write risk attributes
        v
Dashboard risk summaries and invoice details
```

This diagram shows the intended workflow. Verify each integration in AWS
and the browser Network panel before describing the complete flow as
production-ready.

## Technology stack

  Layer            Technology
  ---------------- -------------------------------------
  Frontend         React 19, JavaScript/JSX
  Build tool       Vite
  Styling          Tailwind CSS v4
  Charts           Recharts
  Icons            Lucide React
  Routing          React Router DOM
  API              Amazon API Gateway HTTP API
  Object storage   Amazon S3
  OCR              Amazon Rekognition `DetectText`
  Compute          AWS Lambda, Python
  Database         Amazon DynamoDB
  Logging          Amazon CloudWatch Logs
  AWS SDK          boto3 (available in Lambda runtime)

## Repository structure

``` text
.
├── lambda/
│   ├── lambda_ml_handler.py       # Anomaly Lambda entry point
│   ├── ml_anomaly_detector.py     # Rule-based/statistical detector
│   ├── requirements.txt
│   └── AWS_DEPLOYMENT_GUIDE.md    # Console deployment guide
├── public/
├── src/
│   ├── components/layout/         # Header and sidebar
│   ├── components/ui/             # Status/risk badges and shared UI
│   ├── data/mockInvoices.js       # Demo dataset
│   ├── pages/                     # Dashboard, upload, history, details, analytics, settings
│   ├── services/
│   │   ├── invoiceService.js      # API and mock data access
│   │   └── mlService.js           # Client-side rule-based fallback
│   ├── utils/formatters.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## Run locally

### Prerequisites

-   Node.js compatible with the Vite version in `package.json` (Node.js
    20.19+ or 22.12+ is recommended for current Vite releases).
-   npm.

### Install and start

``` bash
npm install
npm run dev
```

Open the local URL printed by Vite, commonly `http://localhost:5173`. If
the port is occupied, Vite may choose another. Use the exact origin
shown in the terminal for CORS configuration.

### Build, lint, and preview

``` bash
npm run build
npm run lint
npm run preview
```

## Configure the frontend API

The frontend service layer reads `VITE_API_BASE_URL` from the
environment.

1.  Create a local `.env` file in the project root if required.

2.  Add your API Gateway HTTP API base URL:

    ``` dotenv
    VITE_API_BASE_URL=https://YOUR_API_ID.execute-api.ap-southeast-2.amazonaws.com
    ```

3.  Replace `YOUR_API_ID` with the actual API ID. Do not add a trailing
    slash.

4.  Restart Vite after changing `.env`.

Never commit `.env`, AWS credentials, or complete presigned URLs. The
repository `.gitignore` excludes `.env` files.

### API paths used by the frontend

  Method   Path                     Purpose
  -------- ------------------------ -----------------------------------
  `GET`    `/invoices`              List invoice records
  `GET`    `/invoices/{id}`         Retrieve one invoice
  `PUT`    `/invoices/{id}`         Update reviewed fields
  `POST`   `/invoices/upload-url`   Request a presigned S3 upload URL

The matching API Gateway routes and Lambda integration must exist. If an
API base URL is configured, API errors are surfaced rather than silently
switching to mock data.

### CORS troubleshooting

-   **API Gateway:** allow the exact frontend origin, required methods,
    and headers.
-   **S3:** allow the exact frontend origin and `PUT` for presigned
    uploads.
-   Local origin may be `http://localhost:5173`,
    `http://localhost:5174`, or `http://localhost:5175`; use the actual
    Vite port and do not add a trailing slash.
-   If `POST /invoices/upload-url` returns 200 but the S3 `PUT` fails
    with CORS, inspect S3 CORS and the failed request in Developer Tools
    → Network.
-   Never share the full presigned URL; it contains temporary
    authorization parameters.

## AWS resources

  -------------------------------------------------------------------------
  Resource                            Configuration
  ----------------------------------- -------------------------------------
  Region                              `ap-southeast-2`

  S3 bucket                           `ath-invoice-processing-2026-73921`

  S3 prefix                           `incoming_invoice/`

  DynamoDB table                      `InvoiceRecords`

  OCR Lambda                          `process-invoice-image`

  Anomaly Lambda                      `InvoiceFlow-ML-AnomalyDetector`

  OCR service                         Rekognition `DetectText`

  API                                 `InvoiceFlowAPI` (verify routes and
                                      integrations in AWS Console)
  -------------------------------------------------------------------------

### Processing flow

1.  The frontend requests a presigned upload URL.
2.  The browser uploads the image to S3 using HTTP `PUT`.
3.  S3 invokes `process-invoice-image` for supported image uploads.
4.  The Lambda calls Rekognition, extracts text, and attempts to parse
    invoice fields.
5.  The invoice record is written to `InvoiceRecords`.
6.  When the post-save invocation code and IAM permission are deployed,
    the OCR Lambda invokes the anomaly Lambda with the saved
    `invoice_id`.

## Anomaly detection

The current implementation is **rule-based and statistical**, not a
trained Random Forest model.

### Checks

-   **CGST/SGST mismatch:** flags different values under configured
    assumptions.
-   **GST rate mismatch:** checks an assumed 9% CGST rate when the
    detector's conditions are satisfied.
-   **Total consistency:** flags selected inconsistencies between total
    amount and tax components.
-   **Missing fields:** checks invoice number, customer name, total
    amount, CGST, and SGST.
-   **Amount outlier:** uses dataset statistics and a z-score-like
    check; it needs enough valid invoice amounts.
-   **Duplicate invoice number:** looks for the same invoice number in
    other records.
-   **OCR confidence:** checks confidence values returned by
    Rekognition.

### Score and risk categories

The detector adds configured contributions, caps the score at 100, and
maps it to these categories:

      Score Risk
  --------- --------
      0--30 Low
     31--60 Medium
    61--100 High

### Output attributes

  -----------------------------------------------------------------------
  Field                               Description
  ----------------------------------- -----------------------------------
  `anomaly_score`                     Combined score from 0--100, or
                                      null/not present when not
                                      applicable

  `risk_level`                        `Low`, `Medium`, `High`, or null

  `is_anomaly`                        Boolean indicating whether checks
                                      raised anomaly reasons

  `anomaly_reasons`                   Human-readable review reasons

  `model_version`                     `invoiceflow-rules-v1.0.0` for the
                                      current ruleset

  `prediction_status`                 For example, `completed`,
                                      `pending`, `skipped`, or `failed`

  `analyzed_at`                       Analysis timestamp when applicable
  -----------------------------------------------------------------------

A risk score is a review signal, not proof of fraud. Tax assumptions may
flag legitimate invoices; OCR may misread values; small datasets can
make outlier checks unreliable. Review flagged records manually.

## Deploy the anomaly Lambda

See [`lambda/AWS_DEPLOYMENT_GUIDE.md`](lambda/AWS_DEPLOYMENT_GUIDE.md)
for the console-oriented guide.

High-level checklist: 1. Create or open `InvoiceFlow-ML-AnomalyDetector`
in `ap-southeast-2`. 2. Package `lambda_ml_handler.py` and
`ml_anomaly_detector.py` together at the ZIP root. 3. Set handler to
`lambda_ml_handler.lambda_handler`. 4. Set environment variable
`TABLE_NAME=InvoiceRecords`. 5. Grant least-privilege DynamoDB
read/write permissions to the exact table ARN. 6. Grant
`process-invoice-image` permission to invoke the anomaly Lambda if
automatic post-save analysis is used. 7. Test with a real existing
invoice ID, then test `{"action":"analyze_all"}` on a suitably small
dataset. 8. Verify the response, CloudWatch logs, and saved DynamoDB
attributes.

Do not enable DynamoDB Streams without safe event filtering and a
recursion plan. Updating an item can generate another stream event if
the trigger is not designed carefully.

## Data model

  Field              Description
  ------------------ ----------------------------------------------
  `invoice_id`       Unique identifier and DynamoDB partition key
  `source_bucket`    S3 bucket name
  `source_key`       S3 object key
  `processed_at`     Processing timestamp
  `status`           OCR/processing status
  `extracted_text`   Full OCR text
  `detected_text`    Rekognition detections and confidence values
  `invoice_number`   Extracted invoice number
  `invoice_date`     Extracted invoice date
  `customer_name`    Extracted customer name
  `order_id`         Extracted order reference
  `platform_fee`     Extracted taxable amount/platform fee
  `cgst`             Extracted CGST
  `sgst`             Extracted SGST
  `total_amount`     Extracted or conditionally calculated total

Anomaly attributes are separate from OCR status. Missing values should
remain missing rather than being invented.

## Testing and troubleshooting

### Upload errors

1.  Open browser Developer Tools → **Network**.
2.  Retry the upload.
3.  Confirm `POST /invoices/upload-url` succeeds.
4.  Inspect the separate S3 `PUT` request.
5.  If S3 reports CORS, verify the bucket CORS rule and exact frontend
    origin.
6.  Never share the full presigned URL.

### OCR Lambda

-   Inspect CloudWatch logs for `/aws/lambda/process-invoice-image`.
-   Check the source bucket/key, OCR output, and DynamoDB save messages.
-   Confirm the execution role has permissions required for S3,
    Rekognition, and DynamoDB.
-   Confirm the role can invoke `InvoiceFlow-ML-AnomalyDetector` when
    automatic analysis is used.

### Anomaly Lambda

-   Test with a real `invoice_id` already in `InvoiceRecords`.
-   `statusCode: 200` means the handler returned successfully; inspect
    the response body too.
-   Confirm `anomaly_score`, `risk_level`, `is_anomaly`,
    `anomaly_reasons`, `model_version`, `prediction_status`, and
    `analyzed_at` are saved when applicable.
-   For batch errors, inspect the response and CloudWatch logs before
    retrying.

### Dashboard risk counts

The frontend calculates risk counts from records with
`prediction_status === "completed"`. If no records have completed
analysis, counts can be zero; that does not mean every invoice is low
risk.

## Security and cost notes

-   Never commit AWS access keys, secrets, `.env`, or complete presigned
    URLs.
-   Use IAM execution roles rather than putting AWS credentials in
    frontend code.
-   Scope IAM permissions to the minimum actions and resources needed.
-   Keep S3 buckets private unless public access is explicitly required.
-   Table scans and batch analysis consume DynamoDB capacity and Lambda
    time; start with small datasets and monitor usage.

## Limitations and future work

-   The anomaly engine is rule-based/statistical; a trained and
    evaluated ML model is future work.
-   GST assumptions may not apply to all tax treatments or invoice
    types.
-   OCR parsing is heuristic and may fail on different layouts or
    reading orders.
-   Duplicate detection depends on reliable invoice-number extraction.
-   Outlier detection is less meaningful with very small datasets.
-   The supplied frontend snapshot still labels upload as Demo Mode, and
    the observed S3 upload attempt failed with CORS. Verify upload, OCR,
    anomaly persistence, and dashboard display end to end.
-   User authentication and end-user authorisation are not implemented
    in the supplied frontend snapshot.
-   Real-time processing refresh is not confirmed.

Suggested next steps: 1. Verify live API, S3 upload, OCR, anomaly
persistence, and dashboard display end to end. 2. Replace fixed tax
assumptions with configurable rules. 3. Build a labelled evaluation
dataset and train a real model if appropriate. 4. Measure precision,
recall, false-positive rate, and other relevant metrics before reporting
model performance. 5. Add authentication, access control, input
validation, and production monitoring.

## License

College project for educational use. No commercial-use license is
specified in the supplied project files.
