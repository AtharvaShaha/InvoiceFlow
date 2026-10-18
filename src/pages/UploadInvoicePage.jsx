/**
 * UploadInvoicePage - Drag-and-drop upload with preview, validation, and mock processing
 */
import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, Image, X, CheckCircle, AlertTriangle,
  Loader, ArrowRight, RotateCcw
} from 'lucide-react';
import { uploadInvoice } from '../services/invoiceService';
import { formatFileSize } from '../utils/formatters';

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function getFileError(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return `Unsupported format: ${file.type || 'unknown'}. Please upload JPG or PNG files.`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File too large: ${formatFileSize(file.size)}. Maximum size is 10 MB.`;
  }
  return null;
}

export default function UploadInvoicePage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadState, setUploadState] = useState('idle'); // idle, uploading, processing, success, error
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  
  const handleFile = useCallback((selectedFile) => {
    setFileError(null);
    setUploadState('idle');
    setResult(null);
    setUploadError(null);
    
    const error = getFileError(selectedFile);
    if (error) {
      setFileError(error);
      setFile(null);
      setPreview(null);
      return;
    }
    
    setFile(selectedFile);
    
    // Generate image preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(selectedFile);
  }, []);
  
  function handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else {
      setDragActive(false);
    }
  }
  
  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }
  
  function handleInputChange(e) {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  }
  
  function clearFile() {
    setFile(null);
    setPreview(null);
    setFileError(null);
    setUploadState('idle');
    setProgress(0);
    setResult(null);
    setUploadError(null);
    if (inputRef.current) inputRef.current.value = '';
  }
  
  async function handleUpload() {
    if (!file) return;
    
    try {
      setUploadState('uploading');
      setProgress(0);
      setUploadError(null);
      
      const invoice = await uploadInvoice(file, (p) => {
        setProgress(p);
        if (p >= 100) {
          setUploadState('processing');
        }
      });
      
      setResult(invoice);
      setUploadState('success');
    } catch (err) {
      setUploadState('error');
      setUploadError(err.message || 'Upload failed. Please try again.');
    }
  }
  
  function handleUploadAnother() {
    clearFile();
  }
  
  return (
    <div className="p-4 lg:p-6 max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ink-900 m-0">Upload Invoice</h2>
        <p className="text-sm text-ink-500 mt-1 m-0">
          Upload an invoice image (JPG or PNG) for OCR processing and data extraction.
        </p>
      </div>
      
      {/* Demo notice */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-brand-50 border border-brand-200">
        <AlertTriangle size={16} className="text-brand-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-brand-700 m-0">Demo Mode</p>
          <p className="text-xs text-brand-500 mt-0.5 m-0">
            Uploads are simulated locally. No files are sent to AWS S3 or processed by Lambda/Rekognition.
            Connect a backend API to enable real processing.
          </p>
        </div>
      </div>
      
      {/* Upload area or result */}
      {uploadState === 'success' && result ? (
        /* Success state */
        <div className="bg-surface rounded-xl border border-ink-200 p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-success-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-success-600" />
          </div>
          <h3 className="text-lg font-semibold text-ink-900 mb-1 m-0">Invoice Submitted (Demo)</h3>
          <p className="text-sm text-ink-500 mb-1 m-0">
            Invoice <strong>{result.invoice_id}</strong> has been added to the mock dataset.
          </p>
          <p className="text-xs text-ink-400 mb-6 m-0">
            Status: <span className="font-medium text-warning-600">Needs Review</span> — OCR was simulated in demo mode.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleUploadAnother}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-surface border border-ink-200 rounded-lg text-sm font-medium
                         text-ink-700 hover:bg-ink-100 transition-colors cursor-pointer"
            >
              <RotateCcw size={15} /> Upload Another
            </button>
            <button
              onClick={() => navigate(`/invoices/${result.invoice_id}`)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold
                         hover:bg-brand-700 transition-colors cursor-pointer"
            >
              View Invoice <ArrowRight size={15} />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-ink-200 p-6">
          {/* Drop zone */}
          {!file && (
            <div
              className={`drop-zone rounded-xl p-12 text-center cursor-pointer ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
              aria-label="Drop zone: click or drag an invoice image here"
            >
              <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
                <Upload size={24} className="text-brand-600" />
              </div>
              <p className="text-base font-semibold text-ink-800 mb-1 m-0">
                Drag & drop your invoice here
              </p>
              <p className="text-sm text-ink-500 mb-4 m-0">or click to browse files</p>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold
                           hover:bg-brand-700 transition-colors cursor-pointer"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              >
                <Image size={15} /> Browse Files
              </button>
              <p className="text-xs text-ink-400 mt-4 m-0">
                Supported: JPG, JPEG, PNG — Max 10 MB
              </p>
            </div>
          )}
          
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png"
            onChange={handleInputChange}
            className="hidden"
            aria-label="Select invoice file"
          />
          
          {/* File error */}
          {fileError && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-danger-50 border border-danger-500/20 mt-4">
              <AlertTriangle size={16} className="text-danger-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-danger-600 m-0">Invalid file</p>
                <p className="text-xs text-danger-500 mt-0.5 m-0">{fileError}</p>
              </div>
            </div>
          )}
          
          {/* File preview */}
          {file && uploadState !== 'success' && (
            <div className="mt-0">
              <div className="flex items-start gap-4 p-4 rounded-lg bg-surface-raised border border-ink-100">
                {/* Image preview */}
                {preview && (
                  <div className="w-24 h-24 rounded-lg overflow-hidden border border-ink-200 shrink-0 bg-ink-100">
                    <img src={preview} alt="Invoice preview" className="w-full h-full object-cover" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-800 truncate m-0">{file.name}</p>
                      <p className="text-xs text-ink-500 mt-0.5 m-0">
                        {formatFileSize(file.size)} • {file.type}
                      </p>
                    </div>
                    {uploadState === 'idle' && (
                      <button
                        onClick={clearFile}
                        className="p-1 rounded-md text-ink-400 hover:text-ink-600 hover:bg-ink-100 transition-colors bg-transparent border-none cursor-pointer shrink-0"
                        aria-label="Remove selected file"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  
                  {/* Progress bar */}
                  {(uploadState === 'uploading' || uploadState === 'processing') && (
                    <div className="mt-3">
                      <div className="w-full h-2 bg-ink-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-brand-600 rounded-full transition-all duration-300"
                          style={{ width: `${uploadState === 'processing' ? 100 : progress}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Loader size={13} className="text-brand-600 animate-spin" />
                        <span className="text-xs text-ink-500">
                          {uploadState === 'uploading' 
                            ? `Uploading... ${progress}%` 
                            : 'Processing invoice (demo)...'
                          }
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Error state */}
                  {uploadState === 'error' && (
                    <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-danger-50">
                      <AlertTriangle size={14} className="text-danger-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-danger-600 m-0">Upload failed</p>
                        <p className="text-xs text-danger-500 m-0">{uploadError}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action buttons */}
              {(uploadState === 'idle' || uploadState === 'error') && (
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={clearFile}
                    className="px-4 py-2.5 bg-surface border border-ink-200 rounded-lg text-sm font-medium
                               text-ink-600 hover:bg-ink-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpload}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold
                               hover:bg-brand-700 active:bg-brand-800 transition-colors cursor-pointer"
                  >
                    <Upload size={15} />
                    {uploadState === 'error' ? 'Retry Upload' : 'Upload & Process'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Instructions */}
      <div className="bg-surface rounded-xl border border-ink-200 p-5">
        <h3 className="text-sm font-semibold text-ink-800 mb-3 m-0">How it works</h3>
        <ol className="text-sm text-ink-600 space-y-2 pl-5 m-0">
          <li>Upload an invoice image in JPG or PNG format</li>
          <li>The image is sent to Amazon S3 for storage</li>
          <li>AWS Lambda processes the image using Amazon Rekognition OCR</li>
          <li>Extracted invoice data is saved to DynamoDB</li>
          <li>Review and correct any fields that need attention</li>
        </ol>
        <p className="text-xs text-ink-400 mt-3 m-0">
          * In demo mode, steps 2–4 are simulated locally.
        </p>
      </div>
    </div>
  );
}
