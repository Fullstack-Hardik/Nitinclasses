import React, { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { AdminLogin } from './components/AdminLogin';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { StudentsPage } from './components/StudentsPage';
import { FeesPage } from './components/FeesPage';
import { LibraryPage } from './components/LibraryPage';
import { SettingsPage } from './components/SettingsPage';
import { ToolsPage } from './components/ToolsPage';

export function App() {
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
      <div className="min-h-screen flex items-center justify-center bg-[#EEF2F6]">
        <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If unauthenticated -> show Admin Login
  if (!admin) {
    return <AdminLogin onLoginSuccess={(adminUser) => setAdmin(adminUser)} />;
  }

  return (
    <div className="min-h-screen bg-[#EEF2F6] flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        onLogout={handleLogout}
        adminName={admin.name}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-72 flex flex-col min-h-screen">
        {/* Top Header Mobile Toggle */}
        <header className="lg:hidden p-4 bg-[#EEF2F6] border-b border-slate-200/60 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 neu-button text-slate-700"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-bold text-slate-900 text-sm">Nitin Sir Classes</span>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 font-bold capitalize">
            {currentTab}
          </span>
        </header>

        {/* Page Container */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && <Dashboard onNavigate={(tab) => setCurrentTab(tab)} />}
          {currentTab === 'students' && <StudentsPage />}
          {currentTab === 'fees' && <FeesPage />}
          {currentTab === 'library' && <LibraryPage />}
          {currentTab === 'tools' && <ToolsPage />}
          {currentTab === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}

export default App;
