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

  // Admin password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await api.put('/auth/update-password', {
        currentPassword,
        newPassword
      });
      if (res.data.success) {
        setPasswordSuccess('Admin password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
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
              Institute & Receipt Branding
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Appears on system-generated PDF payment receipts</p>
          </div>
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Saved Successfully!
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Institute Name</label>
            <input
              type="text"
              required
              value={settings.instituteName}
              onChange={(e) => setSettings({ ...settings, instituteName: e.target.value })}
              className="w-full neu-input px-3.5 py-2.5 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contact Phone</label>
            <input
              type="text"
              required
              value={settings.contactNumber}
              onChange={(e) => setSettings({ ...settings, contactNumber: e.target.value })}
              className="w-full neu-input px-3.5 py-2.5 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Official Email</label>
            <input
              type="email"
              required
              value={settings.email}
              onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              className="w-full neu-input px-3.5 py-2.5 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Receipt Prefix Code</label>
            <input
              type="text"
              required
              value={settings.receiptPrefix}
              onChange={(e) => setSettings({ ...settings, receiptPrefix: e.target.value })}
              className="w-full neu-input px-3.5 py-2.5 text-xs font-bold uppercase"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Premises Address</label>
            <input
              type="text"
              required
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className="w-full neu-input px-3.5 py-2.5 text-xs"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Receipt Disclaimer Note</label>
            <textarea
              rows={2}
              value={settings.receiptFooterNote}
              onChange={(e) => setSettings({ ...settings, receiptFooterNote: e.target.value })}
              className="w-full neu-input px-3.5 py-2 text-xs"
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
            {saving ? 'Saving Changes...' : 'Save Branding Settings'}
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

      {/* Admin Password Management */}
      <form onSubmit={handleChangePassword} className="neu-card p-6 sm:p-8 space-y-5">
        <div className="pb-3 border-b border-slate-200/60">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            Admin Security & Credentials
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Update administrator password credentials securely</p>
        </div>

        {passwordError && (
          <div className="p-3.5 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {passwordError}
          </div>
        )}

        {passwordSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {passwordSuccess}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full neu-input px-3.5 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full neu-input px-3.5 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full neu-input px-3.5 py-2 text-xs"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={passwordLoading}
            className="neu-button-primary px-6 py-2.5 text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Lock className="w-3.5 h-3.5" />
            {passwordLoading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>
  );
};
