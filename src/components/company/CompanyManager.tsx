import React, { useState, useEffect } from 'react';

// Common worldwide timezones with human-friendly labels
const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'America/New York (Eastern Time - EST/EDT)' },
  { value: 'America/Chicago', label: 'America/Chicago (Central Time - CST/CDT)' },
  { value: 'America/Denver', label: 'America/Denver (Mountain Time - MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles (Pacific Time - PST/PDT)' },
  { value: 'America/Toronto', label: 'America/Toronto (Eastern Time)' },
  { value: 'America/Sao_Paulo', label: 'America/Sao Paulo (BRT)' },
  { value: 'Europe/London', label: 'Europe/London (GMT / BST)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET / CEST)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET / CEST)' },
  { value: 'Europe/Amsterdam', label: 'Europe/Amsterdam (CET / CEST)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST - UTC+4)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST - UTC+5:30)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT - UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST - UTC+9)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST / AEDT)' },
  { value: 'Pacific/Auckland', label: 'Pacific/Auckland (NZST / NZDT)' },
];

const INDUSTRIES = [
  'Technology & Software',
  'Design & Creative Agency',
  'Marketing & Advertising',
  'Financial Services & Fintech',
  'Healthcare & Life Sciences',
  'E-commerce & Retail',
  'Education & EdTech',
  'Consulting & Professional Services',
  'Manufacturing & Logistics',
  'Other',
];

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];

export default function CompanyManager() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string>('');
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);

  // Invite Member Modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [inviteJobTitle, setInviteJobTitle] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviting, setInviting] = useState(false);

  // Edit Company Properties Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTimezone, setEditTimezone] = useState('UTC');
  const [editIndustry, setEditIndustry] = useState('');
  const [editSize, setEditSize] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Company
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Member search filter
  const [memberSearch, setMemberSearch] = useState('');

  // Live company time display
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  const activeCompany = companies.find((c) => c.id === activeCompanyId) || companies[0];

  // Update live clock for company timezone
  useEffect(() => {
    function updateClock() {
      if (!activeCompany?.timezone) return;
      try {
        const str = new Intl.DateTimeFormat('en-US', {
          timeZone: activeCompany.timezone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          timeZoneName: 'short',
        }).format(new Date());
        setCurrentTimeStr(str);
      } catch {
        setCurrentTimeStr('');
      }
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [activeCompany?.timezone]);

  const loadData = async (preferredId?: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/companies');
      const data: any = await res.json();
      if (data.companies) {
        setCompanies(data.companies);
        if (data.companies.length > 0) {
          const stored = localStorage.getItem('activeCompanyId');
          const targetId = preferredId || (data.companies.some((c: any) => c.id === stored) ? stored : data.companies[0].id);
          setActiveCompanyId(targetId);
          localStorage.setItem('activeCompanyId', targetId);
          loadMembers(targetId);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (cId: string) => {
    try {
      setMembersLoading(true);
      const res = await fetch(`/api/companies/members?companyId=${cId}`);
      const data: any = await res.json();
      if (data.members) setMembers(data.members);
    } catch (e) {
      console.error(e);
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectCompany = (id: string) => {
    setActiveCompanyId(id);
    localStorage.setItem('activeCompanyId', id);
    localStorage.setItem('activeWorkspaceId', id);
    loadMembers(id);

    const comp = companies.find((c) => c.id === id);
    window.dispatchEvent(new CustomEvent('companyChanged', { detail: { companyId: id, company: comp } }));
    window.dispatchEvent(new CustomEvent('workspaceChanged', { detail: { workspaceId: id, workspace: comp } }));
  };

  const openEditModal = () => {
    if (!activeCompany) return;
    setEditName(activeCompany.name || '');
    setEditTimezone(activeCompany.timezone || 'UTC');
    setEditIndustry(activeCompany.industry || 'Technology & Software');
    setEditSize(activeCompany.size || '1-10');
    setEditWebsite(activeCompany.website || '');
    setEditError('');
    setIsEditOpen(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompanyId || !editName.trim()) return;

    try {
      setEditSaving(true);
      setEditError('');
      const res = await fetch('/api/companies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeCompanyId,
          name: editName.trim(),
          timezone: editTimezone,
          industry: editIndustry,
          size: editSize,
          website: editWebsite.trim() || undefined,
        }),
      });

      const data: any = await res.json();
      if (res.ok && data.success) {
        setIsEditOpen(false);
        await loadData(activeCompanyId);
      } else {
        setEditError(data.error || 'Failed to update company properties');
      }
    } catch (err: any) {
      setEditError(err.message || 'Network error');
    } finally {
      setEditSaving(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteIdentifier.trim() || !activeCompanyId) return;

    try {
      setInviting(true);
      setInviteError('');
      setInviteSuccess('');
      const res = await fetch('/api/companies/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: activeCompanyId,
          identifier: inviteIdentifier.trim(),
          role: inviteRole,
          jobTitle: inviteJobTitle.trim() || 'Team Member',
        }),
      });

      const data: any = await res.json();
      if (res.ok && data.success) {
        setInviteSuccess(`Successfully added ${data.member?.name || data.member?.email} to ${activeCompany?.name}!`);
        setInviteIdentifier('');
        setInviteJobTitle('');
        loadMembers(activeCompanyId);
        setTimeout(() => {
          setIsInviteOpen(false);
          setInviteSuccess('');
        }, 1200);
      } else {
        setInviteError(data.error || 'Failed to add member');
      }
    } catch (err: any) {
      setInviteError(err.message || 'Network error');
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: 'member' | 'admin') => {
    try {
      const res = await fetch('/api/companies/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: activeCompanyId,
          memberId,
          role: newRole,
        }),
      });
      if (res.ok) {
        loadMembers(activeCompanyId);
      } else {
        const data: any = await res.json();
        alert(data.error || 'Failed to change role');
      }
    } catch (e: any) {
      alert(e.message || 'Network error');
    }
  };

  const handleRemoveMember = async (member: any) => {
    if (!window.confirm(`Are you sure you want to remove ${member.name} (${member.email}) from ${activeCompany?.name}?`)) {
      return;
    }

    try {
      const res = await fetch('/api/companies/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: activeCompanyId,
          memberId: member.id,
        }),
      });

      if (res.ok) {
        loadMembers(activeCompanyId);
      } else {
        const data: any = await res.json();
        alert(data.error || 'Failed to remove member');
      }
    } catch (e: any) {
      alert(e.message || 'Network error');
    }
  };

  const handleDeleteCompany = async (companyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetComp = companies.find((c) => c.id === companyId);
    if (!window.confirm(`Are you sure you want to delete "${targetComp?.name}"? All associated projects, sprints, tasks, and audit logs will be permanently deleted.`)) {
      return;
    }

    try {
      setDeletingId(companyId);
      const res = await fetch('/api/companies', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: companyId }),
      });

      const data: any = await res.json();
      if (res.ok) {
        if (activeCompanyId === companyId) {
          setActiveCompanyId('');
          setMembers([]);
        }
        await loadData();
      } else {
        alert(data.error || 'Failed to delete company');
      }
    } catch (e: any) {
      alert(e.message || 'Network error');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      m.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.email?.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.jobTitle?.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.role?.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const isOwnerOrAdmin = activeCompany?.role === 'owner' || activeCompany?.role === 'admin';

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="inline-block w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs text-slate-400 font-semibold">Loading company and team details...</p>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="max-w-lg mx-auto p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl mx-auto font-black">
          🏢
        </div>
        <h2 className="text-xl font-black text-slate-900">No Company Found</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          You don't have a company yet. Create your company to set up projects, timezone, and collaborate with your team.
        </p>
        <a
          href="/company/create"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/25 transition-all"
        >
          <span>+ Create Company Now</span>
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ============ COMPANY HERO CARD ============ */}
      {activeCompany && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white p-6 md:p-8 shadow-xl shadow-blue-950/15 border border-slate-800">
          {/* Subtle background glow */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-600/30 shrink-0">
                {activeCompany.name ? activeCompany.name.charAt(0).toUpperCase() : 'C'}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight truncate">{activeCompany.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    {activeCompany.role || 'Member'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-xs text-slate-300">
                  {/* Timezone badge */}
                  <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg backdrop-blur-xs font-mono text-[11px]">
                    <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>{activeCompany.timezone || 'UTC'}</span>
                    {currentTimeStr && <span className="text-emerald-400 font-bold ml-1">({currentTimeStr})</span>}
                  </div>

                  {/* Industry */}
                  {activeCompany.industry && (
                    <div className="flex items-center gap-1 text-slate-300 text-xs">
                      <span className="text-slate-400">Industry:</span>
                      <span className="font-semibold">{activeCompany.industry}</span>
                    </div>
                  )}

                  {/* Size */}
                  {activeCompany.size && (
                    <div className="flex items-center gap-1 text-slate-300 text-xs">
                      <span className="text-slate-400">Team Size:</span>
                      <span className="font-semibold">{activeCompany.size} employees</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              {isOwnerOrAdmin && (
                <button
                  type="button"
                  onClick={openEditModal}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-white/10"
                >
                  <svg className="w-3.5 h-3.5 text-blue-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit Properties</span>
                </button>
              )}

              <a
                href="/company/create"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer"
              >
                <span>+</span>
                <span>New Company</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ============ MAIN 2-COLUMN GRID ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: All Companies Switcher */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Your Companies ({companies.length})</h3>
              <a
                href="/company/create"
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                + Add Company
              </a>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {companies.map((c) => {
                const isSelected = c.id === activeCompanyId;
                return (
                  <div
                    key={c.id}
                    className={`w-full p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-200 text-blue-900 shadow-2xs'
                        : 'bg-slate-50/60 border-slate-200/80 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectCompany(c.id)}
                      className="flex-1 text-left flex items-center gap-3 min-w-0 cursor-pointer"
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {c.name ? c.name.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs truncate ${isSelected ? 'font-bold' : 'font-medium'}`}>{c.name}</p>
                        <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5 font-mono">
                          <span>🌐 {c.timezone || 'UTC'}</span>
                          <span>•</span>
                          <span className="capitalize">{c.role}</span>
                        </p>
                      </div>
                    </button>

                    {/* Delete Company button (owner only) */}
                    {c.role === 'owner' && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCompany(c.id, e)}
                        disabled={deletingId === c.id}
                        className="ml-2 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                        title="Delete company"
                      >
                        {deletingId === c.id ? (
                          <span className="text-[10px] font-bold">...</span>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick invite tip card */}
          <div className="p-4 rounded-3xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-100 space-y-2">
            <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
              <span>💡</span>
              <span>Need Collaborators?</span>
            </h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Every team member added to this company gets immediate access to create and collaborate on tasks, projects, and sprints.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Team Members (Essential!) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm text-slate-900">Company Team Members</h3>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                    {members.length}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                  Team members collaborating in {activeCompany?.name}
                </p>
              </div>

              {isOwnerOrAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setInviteError('');
                    setIsInviteOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Invite Team Member</span>
                </button>
              )}
            </div>

            {/* Search filter input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search team members by name, email, or role..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 pl-9 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all font-medium"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>

            {/* Member list */}
            {membersLoading ? (
              <div className="py-8 text-center text-xs text-slate-400 font-semibold">Loading members...</div>
            ) : filteredMembers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-medium">
                {memberSearch ? 'No team members matching your search' : 'No team members in this company yet'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
                {filteredMembers.map((m) => {
                  const isOwner = m.role === 'owner';
                  return (
                    <div key={m.id} className="p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={m.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.name || 'User')}`}
                          alt={m.name}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-slate-900 truncate">{m.name}</p>
                            {isOwner && (
                              <span className="text-[10px] font-black text-amber-500" title="Company Owner">
                                👑
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 font-medium truncate">{m.email}</p>
                          {m.jobTitle && (
                            <p className="text-[10px] text-indigo-600 font-semibold mt-0.5 truncate">{m.jobTitle}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {/* Role Selector or Badge */}
                        {isOwner ? (
                          <span className="px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                            Owner
                          </span>
                        ) : isOwnerOrAdmin ? (
                          <select
                            value={m.role}
                            onChange={(e) => handleUpdateRole(m.id, e.target.value as any)}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-blue-600 cursor-pointer"
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                              m.role === 'admin'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {m.role}
                          </span>
                        )}

                        {/* Remove Member button (owner or admin, cannot remove owner) */}
                        {!isOwner && isOwnerOrAdmin && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove member from company"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============ EDIT COMPANY PROPERTIES MODAL ============ */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-black text-base text-slate-900">Edit Company Properties</h3>
                <p className="text-xs text-slate-400 mt-0.5">Configure timezone, industry, and organizational details</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveCompany} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company Timezone *</label>
                <select
                  value={editTimezone}
                  onChange={(e) => setEditTimezone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-medium cursor-pointer"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  All sprints, task deadlines, and calendar dates in this company align with this timezone.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Industry</label>
                  <select
                    value={editIndustry}
                    onChange={(e) => setEditIndustry(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-medium cursor-pointer"
                  >
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company Size</label>
                  <select
                    value={editSize}
                    onChange={(e) => setEditSize(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-medium cursor-pointer"
                  >
                    {COMPANY_SIZES.map((sz) => (
                      <option key={sz} value={sz}>
                        {sz} employees
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Website (Optional)</label>
                <input
                  type="text"
                  placeholder="https://example.com"
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {editSaving ? 'Saving...' : 'Save Properties'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ INVITE MEMBER MODAL ============ */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-black text-base text-slate-900">Invite Team Member</h3>
                <p className="text-xs text-slate-400 mt-0.5">Add a collaborator to {activeCompany?.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {inviteError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold">
                {inviteError}
              </div>
            )}

            {inviteSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                <span>✓</span>
                <span>{inviteSuccess}</span>
              </div>
            )}

            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">User's Registered Email or User ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. maya@acme.com or UUID"
                  value={inviteIdentifier}
                  onChange={(e) => setInviteIdentifier(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Team members must already have registered an account to be added.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Job Title / Department</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Frontend Engineer, Product Designer"
                  value={inviteJobTitle}
                  onChange={(e) => setInviteJobTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role & Permissions</label>
                <select
                  value={inviteRole}
                  onChange={(e: any) => setInviteRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-medium cursor-pointer"
                >
                  <option value="member">Member — Can view, create, edit & comment on tasks</option>
                  <option value="admin">Admin — Can invite members, create projects & edit company properties</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {inviting ? 'Inviting...' : 'Add to Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
