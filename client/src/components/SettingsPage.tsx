import React, { useEffect, useState } from 'react';
import { 
  Building, 
  Download, 
  Lock, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle,
  Save,
  ShieldCheck
} from 'lucide-react';
import api from '../services/api';
import { SettingsData } from '../types';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData>({
    instituteName: 'Nitin Sir Classes',
    contactNumber: '+91 9876543210',
    email: 'contact@nitinsirclasses.com',
    address: 'Kota, Rajasthan',
    receiptPrefix: 'NSC-REC',
    receiptFooterNote: 'Fees once paid are non-refundable. Thank you for learning with Nitin Sir Classes.',
    boysLibraryTotalSeats: 50,
    girlsLibraryTotalSeats: 50
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      if (res.data.success) {
        setSettings(res.data.data);
      }
    } catch (err: any) {
      console.error('Settings fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSaveSuccess(false);
      const res = await api.put('/settings', settings);
      if (res.data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };



  const handleExportStudents = async () => {
    try {
      const response = await api.get('/settings/export/students', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Students_Directory_Export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    }
  };

  const handleExportPayments = async () => {
    try {
      const response = await api.get('/settings/export/payments', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Payments_Financial_Export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Essential Settings & Data</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage branding, PDF receipts, security, and Excel backups</p>
      </div>

      {/* Institute Info & Receipt Settings */}
      <form onSubmit={handleSaveSettings} className="neu-card p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-5 h-5 text-slate-600" />
              Receipt Configuration
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Customize serial prefix and disclaimer notes on PDF receipts</p>
          </div>
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Saved Successfully!
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Receipt Prefix Code</label>
            <input
              type="text"
              required
              value={settings.receiptPrefix}
              onChange={(e) => setSettings({ ...settings, receiptPrefix: e.target.value })}
              className="w-full neu-input px-3.5 py-2.5 text-xs font-bold uppercase"
              placeholder="e.g. NSC-REC"
            />
            <p className="text-[11px] text-slate-400 mt-1">Receipt identifiers format: PREFIX-YY-NUMBER</p>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Receipt Disclaimer / Note</label>
            <textarea
              rows={2}
              value={settings.receiptFooterNote}
              onChange={(e) => setSettings({ ...settings, receiptFooterNote: e.target.value })}
              className="w-full neu-input px-3.5 py-2 text-xs"
              placeholder="Terms printed at bottom of PDF receipts..."
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="neu-button-primary px-6 py-2.5 text-xs font-bold flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Changes...' : 'Save Receipt Settings'}
          </button>
        </div>
      </form>

      {/* Excel Data Export & Backups */}
      <div className="neu-card p-6 sm:p-8 space-y-4">
        <div className="pb-3 border-b border-slate-200/60">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            Database Excel Exports & Offline Backups
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Export live database tables for offline audits and records</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200/60 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800">Student Directory (.xlsx)</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Complete profiles, contact & memberships</p>
            </div>
            <button
              onClick={handleExportStudents}
              className="neu-button px-3.5 py-2 text-xs font-bold text-slate-800 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              Download
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200/60 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800">Financial Ledger (.xlsx)</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">All payment receipts, dues & methods</p>
            </div>
            <button
              onClick={handleExportPayments}
              className="neu-button px-3.5 py-2 text-xs font-bold text-slate-800 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Download
            </button>
          </div>
        </div>
      </div>

      {/* Smart Mode & Fee Manipulation Settings */}
      <div className="neu-card p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200/60 gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
              Smart Mode (Fee Override & Adjustment)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enable manual control to manipulate pending, paid, or total fee balances for any student
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              const updated = !settings.smartModeEnabled;
              try {
                setSettings({ ...settings, smartModeEnabled: updated });
                await api.put('/settings', { smartModeEnabled: updated });
              } catch (err: any) {
                alert('Failed to toggle Smart Mode: ' + err.message);
              }
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              settings.smartModeEnabled
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {settings.smartModeEnabled ? 'Smart Mode: ACTIVE ✓' : 'Smart Mode: OFF'}
          </button>
        </div>

        <p className="text-xs text-slate-600">
          When Smart Mode is enabled, an <strong>"Adjust / Edit Fee"</strong> tool appears next to fee records, allowing the administrator to manually edit the monthly fee amount, total billed, paid so far, and remaining outstanding balance.
        </p>
      </div>

      {/* Admin Security & .env Notice */}
      <div className="neu-card p-6 sm:p-8 space-y-4">
        <div className="pb-3 border-b border-slate-200/60">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            Admin Security & Credentials
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Secure environment-managed administrator credentials</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-100/80 border border-slate-200/60 text-xs space-y-2">
          <p className="font-semibold text-slate-800">
            🔒 High-Security Configuration Enforced
          </p>
          <p className="text-slate-600">
            Password manipulation from the web interface has been disabled for security. Administrator login credentials (email and password) are strictly loaded and authenticated from the secure server environment file (<code className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-mono">.env</code>).
          </p>
          <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-500 font-mono">
            <span>• ADMIN_EMAIL in .env</span>
            <span>• ADMIN_PASSWORD in .env</span>
          </div>
        </div>
      </div>
    </div>
  );
};
