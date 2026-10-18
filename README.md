# InvoiceFlow — Serverless Invoice Processing Dashboard

A polished, responsive React dashboard for uploading, tracking, and managing invoice images processed by AWS services (S3, Lambda, Rekognition, DynamoDB).

Built as a college project demonstrating serverless architecture with a professional frontend MVP.

![InvoiceFlow Dashboard](https://img.shields.io/badge/Status-MVP%20Complete-brightgreen) ![React](https://img.shields.io/badge/React-19-blue) ![Vite](https://img.shields.io/badge/Vite-8-purple) ![Tailwind](https://img.shields.io/badge/Tailwind%20CSS-v4-cyan)

---

## Features

### Dashboard Overview
- Summary stats (total, processed, review, failed invoices) derived from dataset
- Processing activity trend chart (last 14 days)
- Revenue/amount summary with progress bars
- Recent invoices table with quick navigation

### Upload Invoice
- Drag-and-drop file zone with click-to-browse
- Image preview before upload
- File type (.jpg, .jpeg, .png) and size (10 MB max) validation
- Simulated upload progress and processing feedback
- Clear demo mode labeling

### Invoice History
- Searchable by invoice number, customer name, or order ID
- Filter by status (Processed, Needs Review, Failed, Processing)
- Date range filtering
- Sortable columns (invoice number, customer, date, amount, processed time)
- Pagination (8 per page)
- CSV export of filtered records
- Empty, loading, and error states

### Invoice Details
- Full invoice information display (number, date, customer, order ID)
- Financial breakdown (platform fee, CGST, SGST, total amount)
- Processing metadata (timestamp, source file)
- Expandable OCR extracted text
- Detected text with confidence scores (color-coded)
- Edit mode for correcting OCR-extracted fields
- Save/cancel with mock persistence
- Clear handling of missing/uncertain data ("Not detected")

### Analytics
- Processing status distribution (donut chart with legend)
- Monthly invoice volume (bar chart)
- Invoice amount distribution by range
- Cumulative processing trend
- Summary cards (total, average, highest, missing data count)
- Tabular alternative for accessibility
- All charts calculated from the loaded dataset

### Settings
- About section with tech stack
- AWS backend configuration reference
- Integration status indicators
- Next steps for real AWS integration

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Icons | Lucide React |
| Routing | React Router DOM |
| Language | JavaScript (JSX) |

---

## Quick Start

### Prerequisites
- Node.js 18+ and npm

### Install & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173 in your browser
```

### Build for Production

```bash
npm run build
npm run preview
```

### Lint

```bash
npm run lint
```

---

## Project Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Sidebar.jsx          # Navigation sidebar with branding
│   │   └── Header.jsx           # Top header with page title, demo badge
│   └── ui/
│       ├── StatusBadge.jsx      # Reusable status indicator
│       ├── EmptyState.jsx       # Empty/no-results display
│       └── LoadingSpinner.jsx   # Loading indicator
├── data/
│   └── mockInvoices.js          # Centralized mock dataset (15 invoices)
├── pages/
│   ├── DashboardPage.jsx        # Overview with stats and charts
│   ├── UploadInvoicePage.jsx    # Drag-and-drop upload interface
│   ├── InvoiceHistoryPage.jsx   # Searchable/filterable invoice table
│   ├── InvoiceDetailPage.jsx    # Single invoice view with edit
│   ├── AnalyticsPage.jsx        # Charts and insights
│   └── SettingsPage.jsx         # Config reference and about
├── services/
│   └── invoiceService.js        # Data access layer (mock → API)
├── utils/
│   └── formatters.js            # Currency, date, file size formatting
├── App.jsx                      # Root layout with routing
├── main.jsx                     # Entry point
└── index.css                    # Design system and global styles
```

---

## Mock Mode

The application currently runs entirely with **mock data**. This is clearly indicated by:
- A "Demo Data" badge in the header
- Demo mode notices on the Upload page
- Mock processing simulation (not real AWS operations)
- In-memory data persistence (resets on page reload)

**No real AWS resources are accessed or modified by this frontend.**

---

## AWS Backend (Existing)

| Resource | Value |
|----------|-------|
| Region | `ap-southeast-2` |
| S3 Bucket | `ath-invoice-processing-2026-73921` |
| S3 Prefix | `incoming_invoice/` |
| DynamoDB Table | `InvoiceRecords` |
| Lambda Function | `process-invoice-image` |
| Runtime | Python 3.12 |
| OCR | Amazon Rekognition `DetectText` |

---

## Future AWS Integration

To connect the frontend to your real AWS backend:

1. **Create API Gateway** (REST or HTTP API) with endpoints:
   - `GET /invoices` — List invoices from DynamoDB
   - `GET /invoices/{id}` — Get single invoice
   - `POST /invoices/upload` — Generate presigned S3 URL
   - `PUT /invoices/{id}` — Update reviewed fields
   - `GET /invoices/{id}/status` — Check processing status

2. **Add Authentication** with Amazon Cognito (User Pools + JWT)

3. **Update the service layer** in `src/services/invoiceService.js`:
   - Replace mock implementations with `fetch()` calls to API Gateway
   - Add JWT auth headers from Cognito
   - Configure API base URL via environment variable (`.env`)

4. **Enable CORS** on API Gateway for your frontend origin

5. **Environment variables** (create `.env`):
   ```
   VITE_API_BASE_URL=https://your-api-id.execute-api.ap-southeast-2.amazonaws.com/prod
   ```

The service layer is designed so that replacing mock functions with real API calls requires no changes to UI components.

---

## Data Model

Invoice records follow the DynamoDB `InvoiceRecords` schema:

| Field | Type | Description |
|-------|------|-------------|
| `invoice_id` | String | Unique identifier |
| `source_bucket` | String | S3 bucket name |
| `source_key` | String | S3 object key |
| `processed_at` | String (ISO) | Processing timestamp |
| `status` | String | `processed`, `review`, `failed`, `processing` |
| `extracted_text` | String | Full OCR text output |
| `detected_text` | Array | Text detections with confidence scores |
| `invoice_number` | String | Extracted invoice number |
| `invoice_date` | String | Extracted date (YYYY-MM-DD) |
| `customer_name` | String | Extracted customer/party name |
| `order_id` | String | Extracted order reference |
| `platform_fee` | String | Taxable amount / platform fee |
| `cgst` | String | Central GST amount |
| `sgst` | String | State GST amount |
| `total_amount` | String | Total invoice amount |

Fields may be `null` when OCR extraction fails or is uncertain.

---

## Known Limitations

- **Mock data only** — No real AWS API integration yet
- **No authentication** — Profile area is demo-only
- **No image storage** — Uploaded images are not persisted across sessions
- **In-memory state** — Edits and uploads reset on page reload
- **Bundle size** — Recharts adds ~500KB; consider lazy loading for production
- **No real-time updates** — No WebSocket/polling for processing status

---

## License

College project — not for commercial use.
