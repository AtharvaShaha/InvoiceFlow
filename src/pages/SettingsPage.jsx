/**
 * SettingsPage - Application info, AWS configuration reference, and about section
 */
import { 
  Server, Database, Cloud, Code, Info, 
  Shield, GitBranch
} from 'lucide-react';

function ConfigItem({ label, value, masked = false }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2.5 border-b border-ink-100 last:border-0 gap-1">
      <span className="text-sm text-ink-500">{label}</span>
      <span className={`text-sm font-mono ${masked ? 'text-ink-400' : 'text-ink-800'}`}>
        {masked ? '••••••••' : value}
      </span>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="p-4 lg:p-6 max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ink-900 m-0">Settings</h2>
        <p className="text-sm text-ink-500 mt-1 m-0">
          Application configuration and project information.
        </p>
      </div>
      
      {/* About */}
      <div className="bg-surface rounded-xl border border-ink-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Info size={16} className="text-brand-600" />
          <h3 className="text-base font-semibold text-ink-900 m-0">About InvoiceFlow</h3>
        </div>
        <p className="text-sm text-ink-600 m-0 mb-3">
          InvoiceFlow is a serverless invoice and receipt processing system built as a college project. 
          It uses AWS services (S3, Lambda, Rekognition, DynamoDB) for automated invoice processing 
          with OCR-based data extraction.
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-brand-50 text-brand-700">React</span>
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-brand-50 text-brand-700">Vite</span>
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-brand-50 text-brand-700">Tailwind CSS v4</span>
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-warning-50 text-warning-600">AWS Lambda</span>
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-warning-50 text-warning-600">S3</span>
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-warning-50 text-warning-600">Rekognition</span>
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-warning-50 text-warning-600">DynamoDB</span>
        </div>
      </div>
      
      {/* AWS Configuration Reference */}
      <div className="bg-surface rounded-xl border border-ink-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Cloud size={16} className="text-warning-600" />
          <h3 className="text-base font-semibold text-ink-900 m-0">AWS Backend Configuration</h3>
        </div>
        <p className="text-xs text-ink-400 mb-3 m-0">
          These are the existing AWS resources. The frontend is currently running in demo mode with mock data.
        </p>
        <div>
          <ConfigItem label="AWS Region" value="ap-southeast-2" />
          <ConfigItem label="S3 Bucket" value="ath-invoice-processing-2026-73921" />
          <ConfigItem label="S3 Upload Prefix" value="incoming_invoice/" />
          <ConfigItem label="DynamoDB Table" value="InvoiceRecords" />
          <ConfigItem label="Lambda Function" value="process-invoice-image" />
          <ConfigItem label="Lambda Runtime" value="Python 3.12" />
          <ConfigItem label="OCR Service" value="Amazon Rekognition DetectText" />
          <ConfigItem label="API Gateway" value="Not configured" />
        </div>
      </div>
      
      {/* Integration Status */}
      <div className="bg-surface rounded-xl border border-ink-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Server size={16} className="text-ink-500" />
          <h3 className="text-base font-semibold text-ink-900 m-0">Integration Status</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-raised">
            <div className="flex items-center gap-2">
              <Database size={14} className="text-ink-500" />
              <span className="text-sm text-ink-700">Data Source</span>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-warning-50 text-warning-600">Mock Data</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-raised">
            <div className="flex items-center gap-2">
              <Cloud size={14} className="text-ink-500" />
              <span className="text-sm text-ink-700">Upload Target</span>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-warning-50 text-warning-600">Local Simulation</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-raised">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-ink-500" />
              <span className="text-sm text-ink-700">Authentication</span>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-ink-100 text-ink-500">Not Implemented</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-raised">
            <div className="flex items-center gap-2">
              <Code size={14} className="text-ink-500" />
              <span className="text-sm text-ink-700">API Gateway</span>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-ink-100 text-ink-500">Not Configured</span>
          </div>
        </div>
      </div>
      
      {/* Next Steps */}
      <div className="bg-surface rounded-xl border border-ink-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch size={16} className="text-brand-600" />
          <h3 className="text-base font-semibold text-ink-900 m-0">Next Steps for AWS Integration</h3>
        </div>
        <ol className="text-sm text-ink-600 space-y-2 pl-5 m-0">
          <li>Set up <strong>API Gateway</strong> (REST or HTTP API) to expose Lambda/DynamoDB operations</li>
          <li>Add <strong>Amazon Cognito</strong> for user authentication and JWT token management</li>
          <li>Create API endpoints: <code className="text-xs bg-ink-100 px-1.5 py-0.5 rounded">GET /invoices</code>, <code className="text-xs bg-ink-100 px-1.5 py-0.5 rounded">GET /invoices/:id</code>, <code className="text-xs bg-ink-100 px-1.5 py-0.5 rounded">POST /invoices/upload</code></li>
          <li>Implement <strong>presigned S3 URLs</strong> for secure browser-to-S3 uploads</li>
          <li>Update <code className="text-xs bg-ink-100 px-1.5 py-0.5 rounded">src/services/invoiceService.js</code> to call real API endpoints</li>
          <li>Add environment variables for API base URL and region configuration</li>
          <li>Enable <strong>CORS</strong> on API Gateway for the frontend origin</li>
        </ol>
      </div>
    </div>
  );
}
