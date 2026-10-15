import React, { useState, useEffect } from 'react';

interface SettingsProps {
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export default function SettingsManager({ user }: SettingsProps) {
  // Theme & Appearance
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [accentColor, setAccentColor] = useState<string>('#7c3aed');
  const [density, setDensity] = useState<'compact' | 'cozy' | 'comfortable'>('compact');

  // Notifications
  const [notifTaskAssignments, setNotifTaskAssignments] = useState(true);
  const [notifComments, setNotifComments] = useState(true);
  const [notifDueDates, setNotifDueDates] = useState(true);
  const [notifCompanyActivity, setNotifCompanyActivity] = useState(true);
  const [notifProductUpdates, setNotifProductUpdates] = useState(false);

  // Preferences
  const [projects, setProjects] = useState<any[]>([]);
  const [defaultProject, setDefaultProject] = useState('');
  const [defaultPriority, setDefaultPriority] = useState('medium');
  const [defaultView, setDefaultView] = useState('kanban');
  const [weekStartsOn, setWeekStartsOn] = useState('monday');
  const [autoArchive, setAutoArchive] = useState(false);
  const [keyboardShortcuts, setKeyboardShortcuts] = useState(true);

  // Security modals & states
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // 2FA modal & state
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Clear data confirmation modal
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  // Toast / feedback
  const [copiedId, setCopiedId] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isSavingCloud, setIsSavingCloud] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Helper to persist preferences to backend API
  const persistPreferencesToCloud = async (payload: {
    notifications?: any;
    preferences?: any;
    theme?: string;
    accentColor?: string;
    density?: string;
  }) => {
    try {
      setIsSavingCloud(true);
      await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error('Failed to sync preferences to cloud', e);
    } finally {
      setTimeout(() => setIsSavingCloud(false), 600);
    }
  };

  // Load saved preferences & 2FA status from cloud & local storage on mount
  useEffect(() => {
    // 1. Initial local load for instant paint
    try {
      const savedTheme = (localStorage.getItem('taskflow_theme') as any) || 'light';
      setTheme(savedTheme);
      applyTheme(savedTheme);

      const savedAccent = localStorage.getItem('taskflow_accent') || '#7c3aed';
      setAccentColor(savedAccent);
      applyAccent(savedAccent);

      const savedDensity = (localStorage.getItem('taskflow_density') as any) || 'compact';
      setDensity(savedDensity);

      const savedNotifs = localStorage.getItem('taskflow_notifications');
      if (savedNotifs) {
        const n = JSON.parse(savedNotifs);
        if (n.taskAssignments !== undefined) setNotifTaskAssignments(n.taskAssignments);
        if (n.comments !== undefined) setNotifComments(n.comments);
        if (n.dueDates !== undefined) setNotifDueDates(n.dueDates);
        if (n.companyActivity !== undefined) setNotifCompanyActivity(n.companyActivity);
        if (n.productUpdates !== undefined) setNotifProductUpdates(n.productUpdates);
      }

      const savedPrefs = localStorage.getItem('taskflow_preferences');
      if (savedPrefs) {
        const p = JSON.parse(savedPrefs);
        if (p.defaultProject) setDefaultProject(p.defaultProject);
        if (p.defaultPriority) setDefaultPriority(p.defaultPriority);
        if (p.defaultView) setDefaultView(p.defaultView);
        if (p.weekStartsOn) setWeekStartsOn(p.weekStartsOn);
        if (p.autoArchive !== undefined) setAutoArchive(p.autoArchive);
        if (p.keyboardShortcuts !== undefined) setKeyboardShortcuts(p.keyboardShortcuts);
      }
    } catch (e) {
      console.error(e);
    }

    // 2. Fetch remote preferences from Cloudflare D1
    fetch('/api/user/preferences')
      .then((r) => r.json())
      .then((data: any) => {
        if (data.preferences) {
          const p = data.preferences;
          if (p.notifications) {
            const n = p.notifications;
            if (n.taskAssignments !== undefined) setNotifTaskAssignments(n.taskAssignments);
            if (n.comments !== undefined) setNotifComments(n.comments);
            if (n.dueDates !== undefined) setNotifDueDates(n.dueDates);
            if (n.companyActivity !== undefined) setNotifCompanyActivity(n.companyActivity);
            if (n.productUpdates !== undefined) setNotifProductUpdates(n.productUpdates);
            localStorage.setItem('taskflow_notifications', JSON.stringify(n));
          }
          if (p.preferences) {
            const pref = p.preferences;
            if (pref.defaultProject) setDefaultProject(pref.defaultProject);
            if (pref.defaultPriority) setDefaultPriority(pref.defaultPriority);
            if (pref.defaultView) setDefaultView(pref.defaultView);
            if (pref.weekStartsOn) setWeekStartsOn(pref.weekStartsOn);
            if (pref.autoArchive !== undefined) setAutoArchive(pref.autoArchive);
            if (pref.keyboardShortcuts !== undefined) setKeyboardShortcuts(pref.keyboardShortcuts);
            localStorage.setItem('taskflow_preferences', JSON.stringify(pref));
          }
          if (p.theme) {
            setTheme(p.theme);
            applyTheme(p.theme);
          }
          if (p.accentColor) {
            setAccentColor(p.accentColor);
            applyAccent(p.accentColor);
          }
          if (p.density) {
            setDensity(p.density);
            localStorage.setItem('taskflow_density', p.density);
            document.documentElement.setAttribute('data-density', p.density);
          }
        }
      })
      .catch((e) => console.error(e));

    // 3. Fetch 2FA status from backend
    fetch('/api/user/2fa')
      .then((r) => r.json())
      .then((data: any) => {
        if (data.enabled !== undefined) {
          setTwoFactorEnabled(data.enabled);
          localStorage.setItem('taskflow_2fa', String(data.enabled));
        }
      })
      .catch((e) => console.error(e));

    // 4. Load projects for Default Project dropdown
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data: any) => {
        if (data.projects) setProjects(data.projects);
      })
      .catch((e) => console.error(e));
  }, []);

  const applyTheme = (t: 'light' | 'dark' | 'system') => {
    let isDark = false;
    if (t === 'dark') {
      isDark = true;
    } else if (t === 'light') {
      isDark = false;
    } else {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body?.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body?.classList.remove('dark');
    }
    localStorage.setItem('taskflow_theme', t);
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: t, isDark } }));
  };

  const applyAccent = (color: string) => {
    document.documentElement.style.setProperty('--accent-color', color);
    document.documentElement.style.setProperty('--accent-light', `${color}1a`);
    document.documentElement.style.setProperty('--accent-border', `${color}4d`);
    localStorage.setItem('taskflow_accent', color);
    window.dispatchEvent(new CustomEvent('accentChanged', { detail: { color } }));
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    applyTheme(newTheme);
    persistPreferencesToCloud({ theme: newTheme });
    showToast(`Theme updated to ${newTheme}`);
  };

  const handleAccentChange = (color: string) => {
    setAccentColor(color);
    applyAccent(color);
    persistPreferencesToCloud({ accentColor: color });
    showToast('Accent color updated');
  };

  const handleDensityChange = (newDensity: 'compact' | 'cozy' | 'comfortable') => {
    setDensity(newDensity);
    localStorage.setItem('taskflow_density', newDensity);
    document.documentElement.setAttribute('data-density', newDensity);
    persistPreferencesToCloud({ density: newDensity });
    showToast(`Layout density set to ${newDensity}`);
  };

  // Notification toggles helper
  const updateNotification = (key: string, value: boolean) => {
    const updated = {
      taskAssignments: key === 'taskAssignments' ? value : notifTaskAssignments,
      comments: key === 'comments' ? value : notifComments,
      dueDates: key === 'dueDates' ? value : notifDueDates,
      companyActivity: key === 'companyActivity' ? value : notifCompanyActivity,
      productUpdates: key === 'productUpdates' ? value : notifProductUpdates,
    };
    localStorage.setItem('taskflow_notifications', JSON.stringify(updated));
    persistPreferencesToCloud({ notifications: updated });
    showToast('Notification preference saved');
  };

  // Preferences helper
  const updatePreference = (key: string, value: any) => {
    const updated = {
      defaultProject: key === 'defaultProject' ? value : defaultProject,
      defaultPriority: key === 'defaultPriority' ? value : defaultPriority,
      defaultView: key === 'defaultView' ? value : defaultView,
      weekStartsOn: key === 'weekStartsOn' ? value : weekStartsOn,
      autoArchive: key === 'autoArchive' ? value : autoArchive,
      keyboardShortcuts: key === 'keyboardShortcuts' ? value : keyboardShortcuts,
    };
    localStorage.setItem('taskflow_preferences', JSON.stringify(updated));
    persistPreferencesToCloud({ preferences: updated });
    showToast('Preferences updated');
  };

  // Copy User ID
  const handleCopyUserId = async () => {
    try {
      await navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      showToast('User ID copied to clipboard');
      setTimeout(() => setCopiedId(false), 2500);
    } catch {
      showToast('Failed to copy');
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data: any = await res.json();

      if (!res.ok) {
        setPasswordError(data.error || 'Failed to update password');
      } else {
        setPasswordSuccess('Password changed successfully!');
        setTimeout(() => {
          setIsPasswordModalOpen(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setPasswordSuccess('');
        }, 1500);
      }
    } catch {
      setPasswordError('Network error. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Toggle 2FA in Cloudflare DB
  const handleToggle2FA = async (action: 'enable' | 'disable') => {
    try {
      setTwoFactorLoading(true);
      const res = await fetch('/api/user/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data: any = await res.json();
      if (res.ok) {
        setTwoFactorEnabled(data.enabled);
        localStorage.setItem('taskflow_2fa', String(data.enabled));
        if (action === 'enable' && data.secret) {
          setTwoFactorSecret(data.secret);
        } else {
          setTwoFactorSecret(null);
          setIs2FAModalOpen(false);
        }
        showToast(action === 'enable' ? 'Two-Factor Authentication Enabled' : '2FA Disabled');
      } else {
        showToast('Failed to update 2FA status');
      }
    } catch {
      showToast('Network error updating 2FA');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Clear Local Data
  const handleClearLocalData = () => {
    localStorage.removeItem('taskflow_theme');
    localStorage.removeItem('taskflow_accent');
    localStorage.removeItem('taskflow_density');
    localStorage.removeItem('taskflow_notifications');
    localStorage.removeItem('taskflow_preferences');
    localStorage.removeItem('taskflow_2fa');
    setTheme('light');
    applyTheme('light');
    setAccentColor('#7c3aed');
    applyAccent('#7c3aed');
    setDensity('compact');
    setIsClearModalOpen(false);
    showToast('Local preferences reset to defaults');
  };

  // Sign out
  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch {
      window.location.href = '/login';
    }
  };

  const ACCENTS = [
    { name: 'Purple', hex: '#7c3aed' },
    { name: 'Blue', hex: '#2563eb' },
    { name: 'Green', hex: '#059669' },
    { name: 'Rose', hex: '#e11d48' },
    { name: 'Orange', hex: '#ea580c' },
    { name: 'Cyan', hex: '#0891b2' },
  ];

  return (
    <div className="w-full max-w-full space-y-6 pb-24 text-slate-800 dark:text-slate-100 antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md transition-all flex items-center gap-2 border border-slate-700 dark:border-slate-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          {toastMessage}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            <span>TaskFlow</span>
            <span>/</span>
            <span className="text-blue-600 dark:text-blue-400">Settings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Account & Security Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Manage your credentials, preferences, notifications, and company session
          </p>
        </div>
      </div>

      {/* Main Responsive Grid (Mobile: 1 column, Desktop: 2 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ========================================================
            CARD 1: PERSONAL PROFILE
           ======================================================== */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900 dark:text-white">Personal Profile</h3>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Active Session
            </span>
          </div>

          <div className="flex items-center gap-3.5 pt-1">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center font-black text-blue-600 dark:text-blue-400 text-xl shrink-0">
              {user.avatar ? (
                <img src={user.avatar} className="w-full h-full object-cover rounded-2xl" alt="" />
              ) : (
                (user.name || 'U').charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="text-base font-black text-slate-900 dark:text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{user.email}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Role: Company Member</p>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Your User ID (Share to get invited)
                </label>
                <button
                  type="button"
                  onClick={handleCopyUserId}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 cursor-pointer flex items-center gap-1"
                >
                  📋 {copiedId ? 'Copied!' : 'Copy ID'}
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={user.id}
                onClick={handleCopyUserId}
                className="w-full bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-200 font-mono select-all cursor-pointer focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="text"
                readOnly
                value={user.email}
                className="w-full bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-600 dark:text-slate-300 font-mono"
              />
            </div>
          </div>
        </div>

        {/* ========================================================
            CARD 2: APPEARANCE
           ======================================================== */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-5 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">Appearance</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Personalize how TaskFlow looks on this device
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60">
              Device-only
            </span>
          </div>

          {/* Theme Selectors */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Theme</label>
            <div className="grid grid-cols-3 gap-3">
              {/* Light */}
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 ring-2 ring-blue-600/20'
                    : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <div className="h-9 w-full rounded-xl bg-white border border-slate-200 flex items-center justify-center mb-2 shadow-2xs">
                  <div className="w-8 h-2 rounded bg-slate-200"></div>
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Light</span>
              </button>

              {/* Dark */}
              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 ring-2 ring-blue-600/20'
                    : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <div className="h-9 w-full rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center mb-2 shadow-2xs">
                  <div className="w-8 h-2 rounded bg-slate-600"></div>
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Dark</span>
              </button>

              {/* System */}
              <button
                type="button"
                onClick={() => handleThemeChange('system')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  theme === 'system'
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 ring-2 ring-blue-600/20'
                    : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <div className="h-9 w-full rounded-xl bg-gradient-to-r from-white to-slate-900 border border-slate-300 dark:border-slate-700 flex items-center justify-center mb-2 shadow-2xs">
                  <div className="w-8 h-2 rounded bg-slate-400"></div>
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">System</span>
              </button>
            </div>
          </div>

          {/* Accent Color */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Accent Color</label>
            <div className="flex items-center gap-3">
              {ACCENTS.map((c) => {
                const isSelected = accentColor.toLowerCase() === c.hex.toLowerCase();
                return (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.name}
                    onClick={() => handleAccentChange(c.hex)}
                    className={`w-8 h-8 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                      isSelected ? 'ring-2 ring-offset-2 ring-blue-600 scale-110 shadow-sm' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {isSelected && <span className="text-white text-xs font-black">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Layout Density */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Layout Density</label>
            <div className="grid grid-cols-3 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              {(['compact', 'cozy', 'comfortable'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDensityChange(d)}
                  className={`py-1.5 text-xs font-bold rounded-xl capitalize transition-all cursor-pointer ${
                    density === d
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================
            CARD 3: PREFERENCES
           ======================================================== */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4 transition-colors">
          <div>
            <h3 className="font-black text-sm text-slate-900 dark:text-white">Preferences</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Defaults applied when you create tasks or view boards
            </p>
          </div>

          <div className="space-y-3.5">
            {/* Default project */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Default project on new task
              </label>
              <select
                value={defaultProject}
                onChange={(e) => {
                  setDefaultProject(e.target.value);
                  updatePreference('defaultProject', e.target.value);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:border-blue-600"
              >
                <option value="">— None (choose on create) —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Default priority */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Default priority
              </label>
              <select
                value={defaultPriority}
                onChange={(e) => {
                  setDefaultPriority(e.target.value);
                  updatePreference('defaultPriority', e.target.value);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:border-blue-600"
              >
                <option value="medium">🔵 Medium</option>
                <option value="urgent">🔴 Urgent</option>
                <option value="high">🟠 High</option>
                <option value="low">⚪ Low</option>
              </select>
            </div>

            {/* Default view */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Default view
              </label>
              <select
                value={defaultView}
                onChange={(e) => {
                  setDefaultView(e.target.value);
                  updatePreference('defaultView', e.target.value);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:border-blue-600"
              >
                <option value="kanban">Kanban Board</option>
                <option value="list">List View</option>
                <option value="table">Table View</option>
              </select>
            </div>

            {/* Week starts on */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Week starts on
              </label>
              <select
                value={weekStartsOn}
                onChange={(e) => {
                  setWeekStartsOn(e.target.value);
                  updatePreference('weekStartsOn', e.target.value);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:border-blue-600"
              >
                <option value="monday">Monday</option>
                <option value="sunday">Sunday</option>
                <option value="saturday">Saturday</option>
              </select>
            </div>

            {/* Auto archive completed tasks */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <div className="pr-4">
                <p className="text-xs font-bold text-slate-900 dark:text-white">Auto-archive completed tasks</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Hide tasks in "Done" older than 14 days from initial views
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !autoArchive;
                  setAutoArchive(next);
                  updatePreference('autoArchive', next);
                }}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  autoArchive ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    autoArchive ? 'right-1' : 'left-1'
                  }`}
                ></span>
              </button>
            </div>

            {/* Keyboard shortcuts */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <div className="pr-4">
                <p className="text-xs font-bold text-slate-900 dark:text-white">Keyboard shortcuts</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Enable single-key shortcuts across the app (e.g. 'n' for new task)
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !keyboardShortcuts;
                  setKeyboardShortcuts(next);
                  updatePreference('keyboardShortcuts', next);
                }}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  keyboardShortcuts ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    keyboardShortcuts ? 'right-1' : 'left-1'
                  }`}
                ></span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================
            CARD 4: NOTIFICATIONS
           ======================================================== */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4 transition-colors">
          <div>
            <h3 className="font-black text-sm text-slate-900 dark:text-white">Notifications</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Choose what you'd like to be notified about
            </p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {/* Task assignments */}
            <div className="py-3 flex items-center justify-between">
              <div className="pr-4">
                <p className="text-xs font-bold text-slate-900 dark:text-white">Task assignments</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  When someone assigns a task to you
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !notifTaskAssignments;
                  setNotifTaskAssignments(next);
                  updateNotification('taskAssignments', next);
                }}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  notifTaskAssignments ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    notifTaskAssignments ? 'right-1' : 'left-1'
                  }`}
                ></span>
              </button>
            </div>

            {/* Comments & mentions */}
            <div className="py-3 flex items-center justify-between">
              <div className="pr-4">
                <p className="text-xs font-bold text-slate-900 dark:text-white">Comments & mentions</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  When someone comments or @mentions you
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !notifComments;
                  setNotifComments(next);
                  updateNotification('comments', next);
                }}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  notifComments ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    notifComments ? 'right-1' : 'left-1'
                  }`}
                ></span>
              </button>
            </div>

            {/* Due date reminders */}
            <div className="py-3 flex items-center justify-between">
              <div className="pr-4">
                <p className="text-xs font-bold text-slate-900 dark:text-white">Due date reminders</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Daily digest of tasks due today or overdue
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !notifDueDates;
                  setNotifDueDates(next);
                  updateNotification('dueDates', next);
                }}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  notifDueDates ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    notifDueDates ? 'right-1' : 'left-1'
                  }`}
                ></span>
              </button>
            </div>

            {/* Company activity */}
            <div className="py-3 flex items-center justify-between">
              <div className="pr-4">
                <p className="text-xs font-bold text-slate-900 dark:text-white">Company activity</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  New members, projects, and company changes
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !notifCompanyActivity;
                  setNotifCompanyActivity(next);
                  updateNotification('companyActivity', next);
                }}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  notifCompanyActivity ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    notifCompanyActivity ? 'right-1' : 'left-1'
                  }`}
                ></span>
              </button>
            </div>

            {/* Product updates */}
            <div className="py-3 flex items-center justify-between">
              <div className="pr-4">
                <p className="text-xs font-bold text-slate-900 dark:text-white">Product updates</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Occasional feature announcements
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !notifProductUpdates;
                  setNotifProductUpdates(next);
                  updateNotification('productUpdates', next);
                }}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  notifProductUpdates ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    notifProductUpdates ? 'right-1' : 'left-1'
                  }`}
                ></span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================
            CARD 5: SECURITY
           ======================================================== */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4 transition-colors">
          <div>
            <h3 className="font-black text-sm text-slate-900 dark:text-white">Security</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Protect your account and review active sessions
            </p>
          </div>

          {/* Password */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-100/70 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg shrink-0">
                🔒
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Password</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-400 font-medium truncate">
                  Last changed: Recently
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(true)}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 cursor-pointer shrink-0 whitespace-nowrap"
            >
              Change password →
            </button>
          </div>

          {/* Two-Factor Auth */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-100/70 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg shrink-0">
                🛡️
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Two-Factor Auth</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-400 font-medium truncate">
                  {twoFactorEnabled ? '2FA is active on this account' : 'Add an extra layer of security'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIs2FAModalOpen(true)}
              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 cursor-pointer shrink-0 whitespace-nowrap"
            >
              {twoFactorEnabled ? 'Manage 2FA →' : 'Enable 2FA →'}
            </button>
          </div>

          {/* Active Sessions */}
          <div className="pt-2">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Active Sessions</p>
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 animate-pulse"></span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">This device</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-400 truncate max-w-[180px] sm:max-w-xs md:max-w-md font-mono">
                    {typeof navigator !== 'undefined'
                      ? navigator.userAgent.slice(0, 48) + '...'
                      : 'Mozilla/5.0 Cloudflare Edge Worker'}
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shrink-0">
                Current
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================
            CARD 6: DATA & EXPORT + SIGN OUT
           ======================================================== */}
        <div className="space-y-6">
          {/* Data & Export Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3 transition-colors">
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">Data & Export</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Download a copy of your data or clear local settings
              </p>
            </div>

            {/* Export Data Button */}
            <a
              href="/api/user/export"
              download
              className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 border border-slate-200 dark:border-slate-700/80 transition-colors flex items-center gap-3.5 cursor-pointer block group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100/70 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                📥
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white">Export My Data</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Download your tasks, projects, and comments as JSON
                </p>
              </div>
            </a>

            {/* Clear Local Data Button */}
            <button
              type="button"
              onClick={() => setIsClearModalOpen(true)}
              className="w-full text-left p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 hover:bg-rose-50/40 dark:hover:bg-rose-950/30 border border-slate-200 dark:border-slate-700/80 transition-colors flex items-center gap-3.5 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-100/70 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                🗑️
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white">Clear Local Data</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Reset theme, density, and cached preferences on this device
                </p>
              </div>
            </button>
          </div>

          {/* Sign Out Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-4 transition-colors">
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">Sign Out</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                End your current session on this device
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 font-bold text-xs border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer shrink-0"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          MODAL: CHANGE PASSWORD
         ======================================================== */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-base text-slate-900 dark:text-white">Change Password</h3>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {passwordError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs rounded-xl font-medium">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 text-xs rounded-xl font-medium">
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Current Password *
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: TWO-FACTOR AUTH (2FA)
         ======================================================== */}
      {is2FAModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-center text-slate-800 dark:text-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl mx-auto">
              🛡️
            </div>
            <h3 className="font-black text-base text-slate-900 dark:text-white">Two-Factor Authentication</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Protect your TaskFlow company account with multi-factor authentication on every login.
            </p>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700 dark:text-slate-300">Authenticator Status</span>
                <span
                  className={
                    twoFactorEnabled
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }
                >
                  {twoFactorEnabled ? '● Active' : '○ Disabled'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Compatible with Google Authenticator, Authy, Microsoft Authenticator, and 1Password.
              </p>
            </div>

            {/* Generated Secret Key (if just enabled) */}
            {twoFactorSecret && (
              <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-left space-y-1.5">
                <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                  Your Authenticator Secret Key
                </p>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-slate-900 dark:text-white select-all">
                    {twoFactorSecret}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(twoFactorSecret);
                      setCopiedSecret(true);
                      setTimeout(() => setCopiedSecret(false), 2000);
                    }}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 cursor-pointer"
                  >
                    {copiedSecret ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-[10px] text-amber-700/80 dark:text-amber-500">
                  Enter this key manually in your authenticator app to generate 6-digit codes.
                </p>
              </div>
            )}

            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIs2FAModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                disabled={twoFactorLoading}
                onClick={() => handleToggle2FA(twoFactorEnabled ? 'disable' : 'enable')}
                className={`px-4 py-2 text-xs font-bold rounded-xl text-white shadow-md transition-all cursor-pointer disabled:opacity-50 ${
                  twoFactorEnabled
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                }`}
              >
                {twoFactorLoading
                  ? 'Updating...'
                  : twoFactorEnabled
                  ? 'Disable 2FA'
                  : 'Enable 2FA Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CLEAR LOCAL DATA CONFIRMATION
         ======================================================== */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-center text-slate-800 dark:text-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-2xl mx-auto">
              🗑️
            </div>
            <h3 className="font-black text-base text-slate-900 dark:text-white">Clear Local Preferences?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              This will reset your theme, accent color, density, and cached view filters on this device back to default settings.
            </p>

            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearLocalData}
                className="px-4 py-2 text-xs font-bold rounded-xl text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/25 transition-all cursor-pointer"
              >
                Yes, Reset Local Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
