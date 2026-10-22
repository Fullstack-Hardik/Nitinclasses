import React, { useEffect, useState } from 'react';
import { Menu, Bell, Sparkles } from 'lucide-react';
import { AdminLogin } from './components/AdminLogin';
import { Sidebar } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Dashboard } from './components/Dashboard';
import { StudentsPage } from './components/StudentsPage';
import { FeesPage } from './components/FeesPage';
import { LibraryPage } from './components/LibraryPage';
import { SettingsPage } from './components/SettingsPage';
import { ToolsPage } from './components/ToolsPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './context/ToastContext';

export function AppContent() {
  const [admin, setAdmin] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Check existing stored admin token
    const token = localStorage.getItem('nsc_token');
    const storedAdmin = localStorage.getItem('nsc_admin');
    if (token && storedAdmin) {
      try {
        setAdmin(JSON.parse(storedAdmin));
      } catch (e) {
        localStorage.removeItem('nsc_token');
        localStorage.removeItem('nsc_admin');
      }
    }
    setCheckingAuth(false);

    const handleUnauthorized = () => {
      setAdmin(null);
    };

    window.addEventListener('nsc_unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('nsc_unauthorized', handleUnauthorized);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('nsc_token');
    localStorage.removeItem('nsc_admin');
    setAdmin(null);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F3F8]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Nitin Sir Classes...</p>
        </div>
      </div>
    );
  }

  // If unauthenticated -> show Admin Login
  if (!admin) {
    return <AdminLogin onLoginSuccess={(adminUser) => setAdmin(adminUser)} />;
  }

  return (
    <div className="min-h-screen bg-[#F0F3F8] flex text-slate-900">
      {/* Sidebar Navigation (Desktop & Mobile Drawer) */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        onLogout={handleLogout}
        adminName={admin.name}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-72 flex flex-col min-h-screen w-full overflow-x-hidden">
        {/* Top Header Mobile Toggle & Status */}
        <header className="lg:hidden p-3.5 bg-white/90 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl neu-button text-slate-700 active:scale-95 transition"
              aria-label="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <span className="font-extrabold text-slate-900 text-sm tracking-tight block">Nitin Sir Classes</span>
              <span className="text-[10px] text-slate-500 block -mt-0.5">Admin Management</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 font-extrabold border border-blue-200 capitalize">
              {currentTab}
            </span>
          </div>
        </header>

        {/* Page Container with bottom padding for mobile navigation */}
        <main className="flex-1 p-3.5 sm:p-6 md:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-10">
          <ErrorBoundary>
            {currentTab === 'dashboard' && <Dashboard onNavigate={(tab) => setCurrentTab(tab)} />}
            {currentTab === 'students' && <StudentsPage />}
            {currentTab === 'fees' && <FeesPage />}
            {currentTab === 'library' && <LibraryPage />}
            {currentTab === 'tools' && <ToolsPage />}
            {currentTab === 'settings' && <SettingsPage />}
          </ErrorBoundary>
        </main>

        {/* Mobile Sticky Bottom Navigation */}
        <MobileBottomNav
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
        />
      </div>
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
