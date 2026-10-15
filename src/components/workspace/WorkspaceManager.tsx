import React, { useState, useEffect } from 'react';

export default function WorkspaceManager() {
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [loading, setLoading] = useState(true);

  // Invite Member state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviting, setInviting] = useState(false);

  // Delete Workspace state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteIdentifier.trim() || !activeWorkspaceId) return;

    try {
      setInviting(true);
      setInviteError('');
      setInviteSuccess('');
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          userId: inviteIdentifier.trim(),
          email: inviteIdentifier.trim(),
          role: inviteRole,
        }),
      });

      const data: any = await res.json();
      if (res.ok && data.success) {
        setInviteSuccess(`Successfully invited ${data.user?.name || data.user?.email}!`);
        setInviteIdentifier('');
        loadMembers(activeWorkspaceId);
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

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/workspaces');
      const data: any = await res.json();
      if (data.workspaces) {
        setWorkspaces(data.workspaces);
        if (data.workspaces.length > 0) {
          const currentId = activeWorkspaceId || data.workspaces[0].id;
          setActiveWorkspaceId(currentId);
          loadMembers(currentId);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (wId: string) => {
    try {
      const res = await fetch(`/api/users?workspaceId=${wId}`);
      const data: any = await res.json();
      if (data.users) setMembers(data.users);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateWorkspace = async (e: any) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWorkspaceName }),
      });

      if (res.ok) {
        setNewWorkspaceName('');
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteWorkspace = async (workspaceId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the workspace when clicking delete
    if (!window.confirm('Are you sure you want to delete this workspace? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingId(workspaceId);

      // ✅ Correct endpoint — send ID in the body, not in the URL
      const res = await fetch('/api/workspaces', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: workspaceId }),
      });

      const data: any = await res.json().catch(() => ({}));

      if (res.ok) {
        // If the deleted workspace was active, clear the active ID
        if (activeWorkspaceId === workspaceId) {
          setActiveWorkspaceId('');
          setMembers([]);
        }
        // Reload the workspaces list
        await loadData();
      } else {
        alert(data.error || `Failed to delete workspace (HTTP ${res.status})`);
      }
    } catch (e: any) {
      alert(e.message || 'Network error');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-xs text-slate-400 font-semibold">Loading workspaces...</div>;
  }

  return (
    <div className="space-y-6 w-full max-w-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-5 w-full">
        {/* Workspace List */}
        <div className="lg:col-span-1 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
          <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Your Workspaces</h3>
          <div className="space-y-2">
            {workspaces.map((w) => (
              <div
                key={w.id}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                  activeWorkspaceId === w.id
                    ? 'bg-blue-50 border-blue-200 text-blue-900 font-bold shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <button
                  onClick={() => {
                    setActiveWorkspaceId(w.id);
                    loadMembers(w.id);
                  }}
                  className="flex-1 text-left flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs">{w.name}</p>
                    <p className="text-[10px] text-slate-400 capitalize font-medium">Role: {w.role}</p>
                  </div>
                  {activeWorkspaceId === w.id && <span className="text-xs text-blue-600 font-black">●</span>}
                </button>

                <button
                  onClick={(e) => handleDeleteWorkspace(w.id, e)}
                  disabled={deletingId === w.id}
                  className="ml-2 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                  title="Delete workspace"
                >
                  {deletingId === w.id ? (
                    <span className="text-[10px] font-bold">...</span>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleCreateWorkspace} className="pt-4 border-t border-slate-100 space-y-2">
            <label className="block text-[11px] font-bold text-slate-700">Add Workspace</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Mobile Apps..."
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-600/25"
              >
                Add
              </button>
            </div>
          </form>
        </div>

        {/* Members */}
        <div className="lg:col-span-2 xl:col-span-3 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Team Members ({members.length})</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Collaborate, assign tasks, and track sprints together</p>
            </div>
            <button
              onClick={() => {
                setInviteError('');
                setIsInviteOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-sm shadow-blue-600/25 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>+</span>
              <span>Invite Member</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
            {members.map((m) => (
              <div key={m.id} className="p-3.5 bg-white flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    {m.name ? m.name[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{m.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{m.email}</p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                    m.role === 'owner'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : m.role === 'admin'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}
                >
                  {m.role || 'Member'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invite Member Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">Invite Team Member</h3>
                <p className="text-xs text-slate-400 mt-0.5">Add a collaborator to this workspace</p>
              </div>
              <button
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
                <label className="block text-xs font-bold text-slate-700 mb-1">User ID or Registered Email *</label>
                <input
                  type="text"
                  required
                  placeholder="Paste User ID (UUID) or enter user's registered email"
                  value={inviteIdentifier}
                  onChange={(e) => setInviteIdentifier(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1 font-sans">
                  The system checks if this user exists in the database. If matched, they are added immediately.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role & Permissions</label>
                <select
                  value={inviteRole}
                  onChange={(e: any) => setInviteRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-medium cursor-pointer"
                >
                  <option value="member">Member - Can create, edit & comment on tasks</option>
                  <option value="admin">Admin - Can invite members & manage projects</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {inviting ? 'Inviting...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
      }
