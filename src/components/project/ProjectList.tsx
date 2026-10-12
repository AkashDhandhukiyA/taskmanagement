import React, { useState, useEffect } from 'react';
import type { Project, Task } from '../task/TaskBoard';

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#2563eb');
  const [workspaceId, setWorkspaceId] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [pRes, tRes, wRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/tasks'),
        fetch('/api/workspaces'),
      ]);

      const pData: any = await pRes.json();
      const tData: any = await tRes.json();
      const wData: any = await wRes.json();

      if (pData.projects) setProjects(pData.projects);
      if (tData.tasks) setTasks(tData.tasks);
      if (wData.workspaces) {
        setWorkspaces(wData.workspaces);
        if (wData.workspaces.length > 0 && !workspaceId) {
          setWorkspaceId(wData.workspaces[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: any) => {
    e.preventDefault();
    if (!name.trim() || !workspaceId) return;

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, color, workspaceId }),
      });

      if (res.ok) {
        setName('');
        setDescription('');
        setIsModalOpen(false);
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project? Associated tasks will be removed.')) return;
    try {
      const res = await fetch(`/api/projects?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const COLORS = ['#2563eb', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  if (loading) {
    return <div className="py-12 text-center text-xs text-slate-400 font-semibold">Loading projects...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-sm font-black text-slate-900">All Workspace Projects</h2>
          <p className="text-[11px] text-slate-400 font-medium">Track completion pace and team deadlines</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/25 transition-all cursor-pointer"
        >
          + New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.map((proj) => {
          const projTasks = tasks.filter((t) => t.projectId === proj.id);
          const completed = projTasks.filter((t) => t.status === 'done');
          const pct = projTasks.length > 0 ? Math.round((completed.length / projTasks.length) * 100) : 0;

          return (
            <div
              key={proj.id}
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 transition-all flex flex-col justify-between group shadow-xs hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-full shadow-xs" style={{ backgroundColor: proj.color }}></span>
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                      {proj.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => handleDelete(proj.id)}
                    className="text-slate-400 hover:text-rose-600 text-xs p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete project"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-xs text-slate-500 min-h-[36px] line-clamp-2 leading-relaxed">
                  {proj.description || 'No description provided.'}
                </p>

                <div className="mt-5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-400">{completed.length} of {projTasks.length} tasks</span>
                    <span className="text-blue-600">{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-400">{projTasks.length} total tasks</span>
                <a
                  href="/tasks"
                  className="text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                >
                  View Tasks →
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE PROJECT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-base text-slate-900">Create Project</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 pt-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mobile Design System"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Project goals, milestones..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Workspace</label>
                <select
                  value={workspaceId}
                  onChange={(e) => setWorkspaceId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
                >
                  {workspaces.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Accent Color</label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        color === c ? 'border-blue-600 scale-110 shadow-sm' : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                    ></button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/30"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
