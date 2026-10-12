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

  const todayStr = new Date().toISOString().split('T')[0];

  const totalTasks = tasks.length;
  const completedCount = tasks.filter((t) => t.status === 'done').length;
  const inReviewCount = tasks.filter((t) => t.status === 'review').length;
  const activeCount = tasks.filter((t) => t.status === 'todo' || t.status === 'in_progress').length;
  const overdueCount = tasks.filter((t) => t.dueDate && t.dueDate < todayStr && t.status !== 'done').length;
  const dueTodayCount = tasks.filter((t) => t.dueDate === todayStr && t.status !== 'done').length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const currentWorkspaceName = workspaces[0]?.name || 'My Workspace';
  const userName = user?.name ? user.name.split(' ')[0] : 'User';

  // Real upcoming tasks (not done, prioritized by due date)
  const upcomingTasks = tasks
    .filter((t) => t.status !== 'done')
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    })
    .slice(0, 5);

  return (
    <div className="bg-[#f8faff] text-slate-800 font-sans pb-12 antialiased">
      {/* Main Container */}
      <main className="max-w-md md:max-w-5xl mx-auto px-1 sm:px-4 md:px-6 pt-2 sm:pt-4 space-y-5">
        {/* Greetings Section */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Good day,<br />
                {userName}
              </h1>
              <span className="text-2xl">👋</span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">
              You have <strong className="text-slate-800 font-bold">{dueTodayCount} task{dueTodayCount === 1 ? '' : 's'} due today</strong> across {workspaces.length} active workspace{workspaces.length === 1 ? '' : 's'}.
            </p>
          </div>

          {/* Workspace Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100/70 border border-blue-200/60 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span className="text-xs font-bold text-blue-900 truncate max-w-[140px]">{currentWorkspaceName}</span>
          </div>
        </div>

        {/* Hero Card: Sprint Pace */}
        <div className="rounded-3xl bg-gradient-to-br from-[#eff5ff] via-[#f4f7fe] to-[#e8f0fe] p-5 border border-blue-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-blue-200/80 text-[10px] font-black uppercase tracking-wider text-blue-800">
                TASK PROGRESS
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            {/* Left Content */}
            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {completedCount} of {totalTasks} Tasks Done
              </h2>
              <p className="text-[11px] text-slate-500 font-medium max-w-[200px] leading-snug">
                {totalTasks === 0 ? 'No tasks created yet in this workspace.' : `${completionPercentage}% overall completion rate.`}
              </p>
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
            <span className="text-slate-500">Workspace Progress</span>
            <span className="text-blue-600">{completedCount}/{totalTasks} Completed</span>
          </div>
          <div className="h-1.5 w-full bg-blue-100 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${completionPercentage}%` }}></div>
          </div>
        </div>

        {/* Quick Operations */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900 tracking-tight">Quick Operations</h3>
            <span className="text-[10px] font-semibold text-slate-400">Manage items</span>
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

        {/* Workspace Pulse 2x2 Grid with 100% Real Numbers */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900 tracking-tight">Workspace Pulse</h3>
            <span className="text-[11px] font-semibold text-slate-400">Real-time metrics</span>
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
              <div className="text-[10px] font-medium text-slate-400">
                To do or in progress
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
              <div className="text-[10px] font-medium text-slate-400">
                Awaiting review
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
              <div className="text-[10px] font-medium text-emerald-600">
                Done
              </div>
            </div>

            {/* Overdue */}
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">Overdue</span>
                <span className="w-6 h-6 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center text-xs font-black">!</span>
              </div>
              <div className="my-2">
                <span className={`text-2xl font-black ${overdueCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{overdueCount}</span>
              </div>
              <div className="text-[10px] font-medium text-slate-400">
                Past due date
              </div>
            </div>
          </div>
        </section>

        {/* Real Upcoming Tasks */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm text-slate-900 tracking-tight">Upcoming Deadlines</h3>
              <span className="px-2 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black">{upcomingTasks.length}</span>
            </div>
            <a href="/tasks" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View Board →
            </a>
          </div>

          <div className="space-y-2.5">
            {upcomingTasks.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-2xs text-center">
                <p className="text-xs font-semibold text-slate-500">No pending deadlines. All tasks completed or none scheduled!</p>
              </div>
            ) : (
              upcomingTasks.map((t) => (
                <div key={t.id} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${t.priority === 'urgent' ? 'bg-rose-500' : t.priority === 'high' ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-900 truncate">{t.title}</h4>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate">
                          {t.projectName || 'General Tasks'} • Status: {t.status}
                        </p>
                      </div>
                    </div>
                    {t.dueDate && (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-600 shrink-0">
                        {t.dueDate}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
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
