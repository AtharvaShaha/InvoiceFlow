/**
 * App - Root application component with layout shell and routing
 */
import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import DashboardPage from './pages/DashboardPage';
import UploadInvoicePage from './pages/UploadInvoicePage';
import InvoiceHistoryPage from './pages/InvoiceHistoryPage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/upload': 'Upload Invoice',
  '/invoices': 'Invoice History',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
};

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Derive current page title from URL
  const path = window.location.pathname;
  const title = PAGE_TITLES[path] || 
    (path.startsWith('/invoices/') ? 'Invoice Details' : 'InvoiceFlow');
  
  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={title} onMenuToggle={() => setSidebarOpen(v => !v)} />
        
        <main className="flex-1 overflow-y-auto" role="main">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/upload" element={<UploadInvoicePage />} />
            <Route path="/invoices" element={<InvoiceHistoryPage />} />
            <Route path="/invoices/:invoiceId" element={<InvoiceDetailPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
