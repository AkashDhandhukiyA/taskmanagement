import React, { useState, useEffect } from 'react';

export default function MobileDashboard({ user }: { user: any }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);

  // Form
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskProject, setNewTaskProject] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('high');

  useEffect(() => {
    async function fetchAll() {
      try {
        const [tRes, pRes, wRes] = await Promise.all([
          fetch('/api/tasks'),
          fetch('/api/projects'),
          fetch('/api/workspaces'),
        ]);
        const tData: any = await tRes.json();
        const pData: any = await pRes.json();
        const wData: any = await wRes.json();

        if (tData.tasks) setTasks(tData.tasks);
        if (pData.projects) {
          setProjects(pData.projects);
          if (pData.projects.length > 0) setNewTaskProject(pData.projects[0].id);
        }
        if (wData.workspaces) setWorkspaces(wData.workspaces);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskProject) return;

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle,
          projectId: newTaskProject,
          priority: newTaskPriority,
          status: 'todo',
          dueDate: new Date().toISOString().split('T')[0],
        }),
      });
      if (res.ok) {
        setNewTaskTitle('');
        setIsNewTaskOpen(false);
        const tRes = await fetch('/api/tasks');
        const tData: any = await tRes.json();
        if (tData.tasks) setTasks(tData.tasks);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const totalTasks = tasks.length || 25;
  const completedCount = tasks.filter((t) => t.status === 'done').length || 17;
  const inReviewCount = tasks.filter((t) => t.status === 'review').length || 8;
  const activeCount = tasks.filter((t) => t.status === 'todo' || t.status === 'in_progress').length || 42;
  const overdueCount = tasks.filter((t) => t.priority === 'urgent' || (t.dueDate && t.dueDate < new Date().toISOString().split('T')[0])).length || 2;
  const completionPercentage = Math.round((completedCount / (totalTasks || 1)) * 100) || 68;

  const currentWorkspaceName = workspaces[0]?.name || 'Acme Corp';
  const userName = user?.name ? user.name.split(' ')[0] : 'Maya';

  return (
    <div className="bg-[#f8faff] text-slate-800 font-sans pb-12 antialiased">
      {/* Main Container: Mobile phone max-w-md, Desktop spacious max-w-5xl */}
      <main className="max-w-md md:max-w-5xl mx-auto px-1 sm:px-4 md:px-6 pt-2 sm:pt-4 space-y-5">
        {/* Greetings Section */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Good morning,<br />
                {userName}
              </h1>
              <span className="text-2xl animate-bounce">👋</span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">
              You have <strong className="text-slate-800 font-bold">6 tasks due today</strong> across 3 active workspaces.
            </p>
          </div>

          {/* Sprint Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100/70 border border-blue-200/60 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span className="text-xs font-bold text-blue-900">Sprint 14</span>
          </div>
        </div>

        {/* Hero Card: Daily Focus / Sprint Pace */}
        <div className="rounded-3xl bg-gradient-to-br from-[#eff5ff] via-[#f4f7fe] to-[#e8f0fe] p-5 border border-blue-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-blue-200/80 text-[10px] font-black uppercase tracking-wider text-blue-800">
                DAILY FOCUS
              </span>
              <span className="inline-flex items-center text-xs font-bold text-emerald-600">
                📈 +12% this week
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            {/* Left Content */}
            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {completedCount} of {totalTasks} Tasks Done
              </h2>
              <p className="text-[11px] text-slate-500 font-medium max-w-[170px] leading-snug">
                Velocity is trending 1.4x faster than last sprint
              </p>

              {/* Mini Badges */}
              <div className="flex items-center gap-2 pt-3">
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-100/80 text-blue-800 text-[11px] font-bold">
                  <span>⚡ 94</span>
                  <span className="text-[9px] text-blue-600 font-normal">Score</span>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-100/80 text-blue-800 text-[11px] font-bold">
                  <span>⏱️ 4.2h</span>
                  <span className="text-[9px] text-blue-600 font-normal">Focus</span>
                </div>
              </div>
            </div>

            {/* Circular Progress Meter */}
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-blue-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-blue-600 transition-all duration-700 ease-out"
                  strokeDasharray={`${completionPercentage}, 100`}
                  strokeLinecap="round"
                  strokeWidth="3.8"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-lg font-black text-slate-900 leading-none">{completionPercentage}%</span>
                <span className="text-[10px] text-slate-500 font-semibold mt-0.5">Done</span>
              </div>
            </div>
          </div>

          {/* Footer Bar inside Hero Card */}
          <div className="mt-5 pt-3 border-t border-blue-200/50 flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-500">Sprint Completion Pace</span>
            <span className="text-blue-600">Optimal Pace</span>
          </div>
          <div className="h-1.5 w-full bg-blue-100 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${completionPercentage}%` }}></div>
          </div>
        </div>

        {/* Quick Operations */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900 tracking-tight">Quick Operations</h3>
            <span className="text-[10px] font-semibold text-slate-400">Press ⌘K for cmd palette</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setIsNewTaskOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-blue-600/25 transition-all shrink-0 cursor-pointer"
            >
              <span className="text-sm">+</span>
              <span>New Task</span>
            </button>

            <a
              href="/projects"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 active:scale-95 text-slate-700 font-bold text-xs border border-slate-200 shadow-2xs transition-all shrink-0"
            >
              <span>📁</span>
              <span>New Project</span>
            </a>

            <a
              href="/workspace"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 active:scale-95 text-slate-700 font-bold text-xs border border-slate-200 shadow-2xs transition-all shrink-0"
            >
              <span>👥</span>
              <span>Invite Team</span>
            </a>
          </div>
        </section>

        {/* Workspace Pulse 2x2 Grid */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900 tracking-tight">Workspace Pulse</h3>
            <span className="text-[11px] font-semibold text-slate-400">Sprint 14 Analytics</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Active Tasks */}
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">Active Tasks</span>
                <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">☑️</span>
              </div>
              <div className="my-2">
                <span className="text-2xl font-black text-slate-900">{activeCount}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-emerald-600">↑ +4 today</span>
                <span className="text-blue-400 font-mono tracking-tighter">~~~~~</span>
              </div>
            </div>

            {/* In Review */}
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">In Review</span>
                <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">🌐</span>
              </div>
              <div className="my-2">
                <span className="text-2xl font-black text-slate-900">{inReviewCount}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-slate-400">Needs Signoff</span>
                <span className="text-blue-300 font-mono tracking-tighter">~^~^~</span>
              </div>
            </div>

            {/* Completed */}
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">Completed</span>
                <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">✅</span>
              </div>
              <div className="my-2">
                <span className="text-2xl font-black text-slate-900">{completedCount}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-emerald-600">📈 Record pace</span>
                <span className="text-emerald-400 font-mono tracking-tighter">↗↗↗</span>
              </div>
            </div>

            {/* Overdue */}
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">Overdue</span>
                <span className="w-6 h-6 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center text-xs font-black">!</span>
              </div>
              <div className="my-2">
                <span className="text-2xl font-black text-rose-600">{overdueCount}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-rose-500">High Priority</span>
                <span className="w-3 h-3 rounded-full bg-rose-500/20 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Upcoming Deadlines */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm text-slate-900 tracking-tight">Upcoming Deadlines</h3>
              <span className="px-2 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black">3</span>
            </div>
            <a href="/tasks" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View Board →
            </a>
          </div>

          <div className="space-y-2.5">
            {/* Deadline 1 */}
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-black shrink-0 mt-0.5">!</span>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Design Design System v2...</h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span> PRISM-104 • Core Experience
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-rose-50 border border-rose-100 text-[10px] font-bold text-rose-600 shrink-0">
                  Due 5:00 PM
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                {/* Team Avatars */}
                <div className="flex -space-x-1.5 overflow-hidden">
                  <img className="inline-block h-6 w-6 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop" alt="" />
                  <img className="inline-block h-6 w-6 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop" alt="" />
                  <img className="inline-block h-6 w-6 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop" alt="" />
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-400 font-semibold">
                  <span className="flex items-center gap-1">💬 4</span>
                  <span className="flex items-center gap-1">📎 2</span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px]">High</span>
                </div>
              </div>
            </div>

            {/* Deadline 2 */}
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full border-2 border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-slate-700"></span>
                  </span>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">API Rate Limiter Implement...</h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span> PRISM-088 • Cloud Infrastructure
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-100 text-[10px] font-bold text-blue-600 shrink-0">
                  Tomorrow
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold text-[10px]">
                  Backend Team
                </span>

                <div className="flex items-center gap-3 text-[11px] text-slate-400 font-semibold">
                  <span className="flex items-center gap-1">🔀 3 PRs</span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px]">Medium</span>
                </div>
              </div>
            </div>

            {/* Deadline 3 */}
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full border-2 border-slate-400 shrink-0 mt-0.5"></span>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Q3 Roadmap Slide Deck Review</h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> PRISM-219 • Strategy & GTM
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-600 shrink-0">
                  Oct 24
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[10px]">
                  Marketing
                </span>

                <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                  👁️ Reviewing
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Team Pulse / Live Activity */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900 tracking-tight">Team Pulse</h3>
            <span className="text-[11px] font-semibold text-slate-400">Live Activity</span>
          </div>

          <div className="space-y-3">
            {/* Activity 1 */}
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs flex items-start gap-3">
              <div className="relative">
                <img
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-white"
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop"
                  alt="Alex"
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px]">
                  💬
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-800">
                    Alex Rivera <span className="text-slate-400 font-normal">commented on</span> <span className="text-blue-600">Auth F...</span>
                  </p>
                  <span className="text-[10px] text-slate-400">8m ago</span>
                </div>
                <div className="mt-2 p-2.5 rounded-xl bg-blue-50/70 border border-blue-100/60 text-[11px] text-slate-700 leading-snug">
                  "Updated Figma token sync to v2.4, ready for review"
                </div>
                <span className="inline-block mt-2 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold text-[9px]">
                  Mobile App
                </span>
              </div>
            </div>

            {/* Activity 2 */}
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs flex items-start gap-3">
              <div className="relative">
                <img
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-white"
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop"
                  alt="Sarah"
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-700 text-white flex items-center justify-center text-[8px]">
                  ⇄
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-800">
                    Sarah Chen <span className="text-slate-400 font-normal">moved</span> <strong className="text-slate-800">Landing Pag...</strong>
                  </p>
                  <span className="text-[10px] text-slate-400">34m ago</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[10px]">
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold">In Progress</span>
                  <span className="text-slate-400">→</span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold">Review</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold ml-auto">Growth Squad</span>
                </div>
              </div>
            </div>

            {/* Activity 3 */}
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs flex items-start gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                  🤖
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[8px]">
                  ✓
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-800">
                    <span className="text-blue-600 font-bold">PR #489</span> <span className="text-slate-400 font-normal">merged into</span> <code className="px-1 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px]">main</code>
                  </p>
                  <span className="text-[10px] text-slate-400">1h ago</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] flex items-center gap-1">
                    ✓ Build Passed
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold text-[9px]">
                    CI/CD Pipeline
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Action Button on Mobile */}
      <div className="fixed bottom-20 right-5 z-20 md:hidden">
        <button
          onClick={() => setIsNewTaskOpen(true)}
          className="w-13 h-13 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-90 text-white flex items-center justify-center text-2xl font-light shadow-lg shadow-blue-600/40 transition-all cursor-pointer"
          title="Create task"
        >
          +
        </button>
      </div>

      {/* Quick Create Task Modal */}
      {isNewTaskOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Create New Task</h3>
              <button onClick={() => setIsNewTaskOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design Design System v2..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Project</label>
                  <select
                    value={newTaskProject}
                    onChange={(e) => setNewTaskProject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewTaskOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-600/30"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
