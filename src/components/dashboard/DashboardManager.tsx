import React, { useState, useEffect, useMemo } from 'react';

interface DashboardProps {
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

interface TaskItem {
  id: string;
  projectId: string;
  companyId?: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'review' | 'done';
  assignedTo?: string | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  projectName?: string;
  projectColor?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
}

interface ProjectItem {
  id: string;
  name: string;
  description?: string;
  color?: string;
  companyId?: string;
}

interface CompanyMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  jobTitle?: string;
}

interface ActivityEvent {
  id: string;
  action: string;
  entityType: string;
  entityName?: string;
  createdAt: string;
  userName?: string;
  userAvatar?: string;
}

export default function DashboardManager({ user }: DashboardProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string>('');
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters, Search & Sorting
  const [taskFilter, setTaskFilter] = useState<'all' | 'urgent' | 'today' | 'in_progress' | 'done'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'priority' | 'dueDate' | 'title'>('newest');

  // Inline Quick Add Task
  const [quickTitle, setQuickTitle] = useState('');
  const [quickProjectId, setQuickProjectId] = useState('');
  const [quickPriority, setQuickPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [quickSubmitting, setQuickSubmitting] = useState(false);

  // Modals
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);

  // Modal Task Form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskProjectId, setTaskProjectId] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

  // Modal Project Form
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectColor, setProjectColor] = useState('#6366f1');
  const [creatingProject, setCreatingProject] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'info' | 'warn'>('success');
  const showToast = (msg: string, type: 'success' | 'info' | 'warn' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 2800);
  };

  const fetchDashboardData = async (companyIdOverride?: string) => {
    try {
      setLoading(true);
      const targetCompany = companyIdOverride || activeCompanyId;
      const compParam = targetCompany ? `?companyId=${targetCompany}` : '';

      const [tRes, pRes, cRes] = await Promise.all([
        fetch(`/api/tasks${compParam}`),
        fetch(`/api/projects${compParam}`),
        fetch('/api/companies'),
      ]);

      const tData: any = await tRes.json();
      const pData: any = await pRes.json();
      const cData: any = await cRes.json();

      if (tData.tasks) setTasks(tData.tasks);
      if (pData.projects) {
        setProjects(pData.projects);
        if (pData.projects.length > 0 && !taskProjectId) {
          setTaskProjectId(pData.projects[0].id);
        }
        if (pData.projects.length > 0 && !quickProjectId) {
          setQuickProjectId(pData.projects[0].id);
        }
      }

      if (cData.companies) {
        setCompanies(cData.companies);
        const stored = targetCompany || localStorage.getItem('activeCompanyId') || localStorage.getItem('activeWorkspaceId');
        let currentId = stored;
        if (!currentId || !cData.companies.some((c: any) => c.id === currentId)) {
          currentId = cData.companies.length > 0 ? cData.companies[0].id : '';
        }
        if (currentId && currentId !== activeCompanyId) {
          setActiveCompanyId(currentId);
        }

        if (currentId) {
          // Fetch Audit log and Members in parallel
          try {
            const [aRes, mRes] = await Promise.all([
              fetch(`/api/audit-log?companyId=${currentId}`),
              fetch(`/api/companies/members?companyId=${currentId}`),
            ]);
            const aData: any = await aRes.json();
            const mData: any = await mRes.json();
            if (aData.events) setActivities(aData.events.slice(0, 6));
            if (mData.members) setCompanyMembers(mData.members);
          } catch {}
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('activeCompanyId') || localStorage.getItem('activeWorkspaceId') || '';
    setActiveCompanyId(stored);
    fetchDashboardData(stored);

    try {
      const savedPrefs = localStorage.getItem('taskflow_preferences');
      if (savedPrefs) {
        const p = JSON.parse(savedPrefs);
        if (p.defaultPriority) {
          setTaskPriority(p.defaultPriority);
          setQuickPriority(p.defaultPriority);
        }
        if (p.defaultProject) {
          setTaskProjectId(p.defaultProject);
          setQuickProjectId(p.defaultProject);
        }
      }
    } catch {}

    const handleCompanyChange = (e: any) => {
      const newCompanyId = e.detail?.companyId || e.detail?.workspaceId;
      if (newCompanyId) {
        setActiveCompanyId(newCompanyId);
        fetchDashboardData(newCompanyId);
      }
    };

    window.addEventListener('companyChanged', handleCompanyChange);
    window.addEventListener('workspaceChanged', handleCompanyChange);
    return () => {
      window.removeEventListener('companyChanged', handleCompanyChange);
      window.removeEventListener('workspaceChanged', handleCompanyChange);
    };
  }, []);

  // Inline Quick Add Task Handler
  const handleQuickAddTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickTitle.trim()) return;

    const targetProjId = quickProjectId || (projects.length > 0 ? projects[0].id : '');
    if (!targetProjId) {
      showToast('Please create a project first', 'warn');
      setIsNewProjectOpen(true);
      return;
    }

    try {
      setQuickSubmitting(true);
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quickTitle.trim(),
          projectId: targetProjId,
          priority: quickPriority,
          status: 'todo',
          assignedTo: user.id,
        }),
      });

      if (res.ok) {
        showToast('Task added instantly! ⚡', 'success');
        setQuickTitle('');
        fetchDashboardData();
      } else {
        const err: any = await res.json();
        showToast(err.error || 'Failed to add task', 'warn');
      }
    } catch {
      showToast('Network error', 'warn');
    } finally {
      setQuickSubmitting(false);
    }
  };

  // Modal Full Task Creation
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskProjectId) return;

    try {
      setCreatingTask(true);
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle.trim(),
          description: taskDescription.trim() || undefined,
          projectId: taskProjectId,
          priority: taskPriority,
          status: 'todo',
          dueDate: taskDueDate || null,
          assignedTo: user.id,
        }),
      });

      if (res.ok) {
        showToast('Task created ✓', 'success');
        setTaskTitle('');
        setTaskDescription('');
        setTaskDueDate('');
        setIsNewTaskOpen(false);
        fetchDashboardData();
      } else {
        const err: any = await res.json();
        showToast(err.error || 'Failed to create task', 'warn');
      }
    } catch {
      showToast('Network error', 'warn');
    } finally {
      setCreatingTask(false);
    }
  };

  // Quick Project Creation
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    try {
      setCreatingProject(true);
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: activeCompanyId,
          name: projectName.trim(),
          description: projectDescription.trim() || undefined,
          color: projectColor,
        }),
      });

      if (res.ok) {
        showToast('Project created ✓', 'success');
        setProjectName('');
        setProjectDescription('');
        setIsNewProjectOpen(false);
        fetchDashboardData();
      } else {
        const err: any = await res.json();
        showToast(err.error || 'Failed to create project', 'warn');
      }
    } catch {
      showToast('Network error', 'warn');
    } finally {
      setCreatingProject(false);
    }
  };

  // 1-Tap Toggle Task Status (Todo <-> Done)
  const handleToggleTaskStatus = async (taskId: string, currentStatus: TaskItem['status']) => {
    const nextStatus = currentStatus === 'done' ? 'todo' : 'done';
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
    );
    showToast(nextStatus === 'done' ? 'Task completed! 🎉' : 'Task reopened', 'success');

    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status: nextStatus }),
      });
    } catch {
      fetchDashboardData();
    }
  };

  // Quick Cycle Status: todo -> in_progress -> review -> done -> todo
  const handleCycleStatus = async (taskId: string, currentStatus: TaskItem['status']) => {
    const sequence: Record<TaskItem['status'], TaskItem['status']> = {
      todo: 'in_progress',
      in_progress: 'review',
      review: 'done',
      done: 'todo',
    };
    const next = sequence[currentStatus] || 'todo';
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: next } : t)));
    showToast(`Status updated to ${next.replace('_', ' ')}`, 'info');

    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status: next }),
      });
    } catch {
      fetchDashboardData();
    }
  };

  // Quick Delete Task
  const handleDeleteTask = async (taskId: string, taskTitleName: string) => {
    if (!confirm(`Are you sure you want to delete "${taskTitleName}"?`)) return;

    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    showToast('Task deleted', 'info');

    try {
      await fetch(`/api/tasks?id=${taskId}`, { method: 'DELETE' });
    } catch {
      fetchDashboardData();
    }
  };

  const todayISO = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name ? user.name.split(' ')[0] : 'there';
  const formattedTodayDate = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  // Metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'done');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const reviewTasks = tasks.filter((t) => t.status === 'review');
  const todayTasks = tasks.filter((t) => t.dueDate === todayISO && t.status !== 'done');
  const overdueTasks = tasks.filter((t) => t.dueDate && t.dueDate < todayISO && t.status !== 'done');
  const urgentTasks = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'done');
  const highTasks = tasks.filter((t) => t.priority === 'high' && t.status !== 'done');
  const mediumTasks = tasks.filter((t) => t.priority === 'medium' && t.status !== 'done');
  const lowTasks = tasks.filter((t) => t.priority === 'low' && t.status !== 'done');

  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  // Company metadata
  const currentCompany = companies.find((c) => c.id === activeCompanyId) || companies[0];
  const companyName = currentCompany?.name || 'Acme Workspace';
  const companyTimezone = currentCompany?.timezone || 'UTC';

  // Relative Time helper
  const getRelativeTime = (isoString?: string) => {
    if (!isoString) return 'Just now';
    try {
      const past = new Date(isoString).getTime();
      const diffMs = Date.now() - past;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'Recent';
    }
  };

  // Filter & Sort Tasks
  const filteredTasks = useMemo(() => {
    let list = tasks.filter((task) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          task.title.toLowerCase().includes(q) ||
          (task.projectName && task.projectName.toLowerCase().includes(q)) ||
          (task.description && task.description.toLowerCase().includes(q));
        if (!match) return false;
      }

      switch (taskFilter) {
        case 'urgent':
          return task.priority === 'urgent' && task.status !== 'done';
        case 'today':
          return task.dueDate === todayISO;
        case 'in_progress':
          return task.status === 'in_progress' || task.status === 'review';
        case 'done':
          return task.status === 'done';
        case 'all':
        default:
          return true;
      }
    });

    // Sorting
    return list.sort((a, b) => {
      if (sortBy === 'priority') {
        const score = { urgent: 4, high: 3, medium: 2, low: 1 };
        return score[b.priority] - score[a.priority];
      }
      if (sortBy === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      // 'newest' default
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tasks, searchQuery, taskFilter, sortBy, todayISO]);

  const PROJECT_COLORS = ['#6366f1', '#3b82f6', '#059669', '#ea580c', '#e11d48', '#7c3aed', '#0891b2', '#10b981'];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-24 text-slate-900 dark:text-slate-100 antialiased relative">
      {/* Ambient background glows for rich depth */}
      <div className="absolute -top-16 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute top-48 right-10 w-[450px] h-[450px] bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10"></div>

      {/* Floating Modern Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-20 sm:bottom-8 right-4 sm:right-8 z-50 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 transition-all animate-in fade-in slide-in-from-bottom-4 ${
            toastType === 'warn'
              ? 'bg-amber-900/90 text-white border-amber-500/40'
              : toastType === 'info'
              ? 'bg-blue-900/90 text-white border-blue-500/40'
              : 'bg-slate-900/95 dark:bg-white text-white dark:text-slate-900 border-slate-700/80 dark:border-slate-200'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
          <span className="text-xs font-bold tracking-tight">{toastMessage}</span>
        </div>
      )}

      {/* ========================================================
          1. EXECUTIVE HERO COMMAND BANNER
         ======================================================== */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-white/90 dark:bg-[#111827]/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 shadow-xl shadow-slate-900/5 overflow-hidden transition-all">
        {/* Subtle decorative glowing corner gradient */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-blue-600/15 via-indigo-600/10 to-transparent rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-purple-600/10 via-transparent to-transparent rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="space-y-3 min-w-0 max-w-2xl">
            {/* Top row: Date pill + Company badge */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Date chip */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 text-[11px] font-bold text-slate-600 dark:text-slate-300 shadow-2xs">
                <span>📅</span>
                <span>{formattedTodayDate}</span>
              </div>

              {/* Company capsule with active pulse */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200/80 dark:border-blue-800/70 text-[11px] font-bold text-blue-700 dark:text-blue-300 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="truncate max-w-[200px]">{companyName}</span>
                <span className="text-blue-500/80 dark:text-blue-400/80 font-mono text-[10px]">({companyTimezone})</span>
              </div>

              {/* Overdue alert pill if any */}
              {overdueTasks.length > 0 && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800/80 text-[11px] font-bold text-rose-600 dark:text-rose-400 animate-pulse">
                  <span>⚠️</span>
                  <span>{overdueTasks.length} Overdue</span>
                </div>
              )}
            </div>

            {/* Greeting Headline */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <span>{greeting}, {firstName}!</span>
              <span className="text-2xl sm:text-3xl">👋</span>
            </h1>

            {/* Subtitle with dynamic progress metrics */}
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
              {urgentTasks.length > 0 ? (
                <span>
                  Attention required: You have <strong className="text-rose-600 dark:text-rose-400 font-bold">{urgentTasks.length} urgent task{urgentTasks.length === 1 ? '' : 's'}</strong> and <strong className="text-slate-900 dark:text-white font-bold">{todayTasks.length} due today</strong>.
                </span>
              ) : todayTasks.length > 0 ? (
                <span>
                  You have <strong className="text-blue-600 dark:text-blue-400 font-bold">{todayTasks.length} task{todayTasks.length === 1 ? '' : 's'} scheduled for today</strong>. Everything else is on track!
                </span>
              ) : (
                <span>
                  All clear for today! <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{completedTasks.length} of {totalTasks} tasks completed</strong> ({completionPercentage}% sprint progress).
                </span>
              )}
            </p>
          </div>

          {/* Quick Actions & Circular Sprint Gauge */}
          <div className="flex items-center gap-4 sm:gap-6 self-start lg:self-auto shrink-0 flex-wrap sm:flex-nowrap">
            {/* Circular Pace Gauge */}
            <div className="flex items-center gap-3.5 pr-4 sm:pr-6 border-r border-slate-200 dark:border-slate-800">
              <div className="relative w-15 h-15 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 36 36">
                  <path
                    className="text-slate-200 dark:text-slate-800/80"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-blue-600 dark:text-blue-500 transition-all duration-700 ease-out"
                    strokeDasharray={`${completionPercentage}, 100`}
                    strokeLinecap="round"
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="font-black text-xs text-slate-900 dark:text-white leading-none">
                    {completionPercentage}%
                  </span>
                </div>
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-black text-slate-900 dark:text-white">Sprint Pace</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                  {completedTasks.length}/{totalTasks} Done
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsNewTaskOpen(true)}
                className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <span className="text-lg font-black leading-none">+</span>
                <span>New Task</span>
              </button>

              <button
                type="button"
                onClick={() => setIsNewProjectOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 shadow-2xs transition-all cursor-pointer"
              >
                <span>📁</span>
                <span>Project</span>
              </button>

              <a
                href="/tasks"
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 shadow-2xs transition-all"
              >
                <span>📊</span>
                <span className="hidden sm:inline">Board</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          2. HIGH-IMPACT METRIC KPI CARDS (Rich, Elegant & Sharp)
         ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Tasks & Workload */}
        <div className="relative p-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-500 absolute top-0 left-0"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Workload
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200/60 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-base shadow-2xs group-hover:scale-110 transition-transform">
              📋
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {totalTasks}
            </span>
            <span className="text-[11px] text-slate-400 font-semibold">tasks in play</span>
          </div>
          {/* Mini progress bar */}
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-700"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
            <span>{totalTasks - completedTasks.length} active</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{completedTasks.length} done</span>
          </div>
        </div>

        {/* Card 2: In Progress & Active */}
        <div className="relative p-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-orange-500 absolute top-0 left-0"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              In Progress
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/70 border border-amber-200/60 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-base shadow-2xs group-hover:scale-110 transition-transform">
              ⚡
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-500 tracking-tight">
              {inProgressTasks.length + reviewTasks.length}
            </span>
            <span className="text-[11px] text-slate-400 font-semibold">active tasks</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>{inProgressTasks.length} in build • {reviewTasks.length} in review</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 font-medium">
            Active velocity on sprint board
          </div>
        </div>

        {/* Card 3: Urgent & Due Today */}
        <div className="relative p-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-rose-500 to-red-600 absolute top-0 left-0"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Critical & Due
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200/60 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-base shadow-2xs group-hover:scale-110 transition-transform">
              🚨
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-500 tracking-tight">
              {urgentTasks.length}
            </span>
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
              urgent priority
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-bold">
            <span className={todayTasks.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}>
              {todayTasks.length} due today
            </span>
            {overdueTasks.length > 0 ? (
              <span className="px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px]">
                {overdueTasks.length} overdue
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 text-[10px]">On schedule</span>
            )}
          </div>
          <div className="mt-2 text-[10px] text-slate-400 font-medium">
            Immediate focus checklist
          </div>
        </div>

        {/* Card 4: Sprint Completion Rate */}
        <div className="relative p-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-teal-500 absolute top-0 left-0"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Delivered
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-base shadow-2xs group-hover:scale-110 transition-transform">
              🏆
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-500 tracking-tight">
              {completedTasks.length}
            </span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              ({completionPercentage}%)
            </span>
          </div>
          {/* Progress Bar */}
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
            <span>Sprint Goal: 100%</span>
            <span className="text-emerald-600 dark:text-emerald-400">Pacing well</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          3. PRIORITY DISTRIBUTION DECK (Executive Data Strip)
         ======================================================== */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Priority Distribution
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">
              (Click to filter)
            </span>
          </div>
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            {totalTasks - completedTasks.length} active tasks remaining
          </div>
        </div>

        {/* Segmented Visual Bar */}
        <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
          {totalTasks === 0 ? (
            <div className="w-full h-full bg-slate-200 dark:bg-slate-700"></div>
          ) : (
            <>
              {urgentTasks.length > 0 && (
                <div
                  style={{ width: `${(urgentTasks.length / totalTasks) * 100}%` }}
                  className="h-full bg-rose-500 transition-all duration-500"
                  title={`Urgent: ${urgentTasks.length}`}
                ></div>
              )}
              {highTasks.length > 0 && (
                <div
                  style={{ width: `${(highTasks.length / totalTasks) * 100}%` }}
                  className="h-full bg-amber-500 transition-all duration-500"
                  title={`High: ${highTasks.length}`}
                ></div>
              )}
              {mediumTasks.length > 0 && (
                <div
                  style={{ width: `${(mediumTasks.length / totalTasks) * 100}%` }}
                  className="h-full bg-blue-500 transition-all duration-500"
                  title={`Medium: ${mediumTasks.length}`}
                ></div>
              )}
              {lowTasks.length > 0 && (
                <div
                  style={{ width: `${(lowTasks.length / totalTasks) * 100}%` }}
                  className="h-full bg-slate-400 transition-all duration-500"
                  title={`Low: ${lowTasks.length}`}
                ></div>
              )}
              {completedTasks.length > 0 && (
                <div
                  style={{ width: `${(completedTasks.length / totalTasks) * 100}%` }}
                  className="h-full bg-emerald-500 transition-all duration-500"
                  title={`Completed: ${completedTasks.length}`}
                ></div>
              )}
            </>
          )}
        </div>

        {/* Priority Filter Badges */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <button
            type="button"
            onClick={() => setTaskFilter(taskFilter === 'urgent' ? 'all' : 'urgent')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              taskFilter === 'urgent'
                ? 'bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-500/25'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200/80 dark:border-rose-900/60 hover:border-rose-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Urgent: {urgentTasks.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setTaskFilter('all')}
            className="px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200/80 dark:border-amber-900/60 hover:border-amber-400"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>High: {highTasks.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setTaskFilter('all')}
            className="px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200/80 dark:border-blue-900/60 hover:border-blue-400"
          >
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>Medium: {mediumTasks.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setTaskFilter('all')}
            className="px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400"
          >
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            <span>Low: {lowTasks.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setTaskFilter(taskFilter === 'done' ? 'all' : 'done')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ml-auto ${
              taskFilter === 'done'
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/25'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-900/60 hover:border-emerald-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Completed: {completedTasks.length}</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          4. MAIN WORKSPACE: COMMAND CENTER & PROJECTS
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Task Command Center */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-5 sm:p-7 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-900/5 space-y-5">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-black text-lg text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                  <span>Task Command Center</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                    {filteredTasks.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  1-Click completion • Quick priority & status updates
                </p>
              </div>

              {/* Search & Sort Controls */}
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative flex-1 sm:w-56">
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-7 py-2 rounded-xl bg-slate-50 dark:bg-[#18233c] border border-slate-200 dark:border-slate-700/80 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition-all"
                  />
                  <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Sort dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-[#18233c] border border-slate-200 dark:border-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-600 cursor-pointer"
                >
                  <option value="newest">Newest</option>
                  <option value="priority">Priority</option>
                  <option value="dueDate">Due Date</option>
                  <option value="title">Title</option>
                </select>
              </div>
            </div>

            {/* ⚡ Inline Quick-Add Task Bar */}
            <form
              onSubmit={handleQuickAddTask}
              className="p-2 sm:p-2.5 rounded-2xl bg-slate-50/90 dark:bg-[#18233c]/80 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row items-center gap-2 shadow-inner"
            >
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  placeholder="+ Quick add a task to this project... (Press Enter ↵)"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  className="w-full pl-3 pr-3 py-2 bg-transparent text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                {/* Project selector */}
                <select
                  value={quickProjectId}
                  onChange={(e) => setQuickProjectId(e.target.value)}
                  className="px-2 py-1.5 rounded-xl bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none max-w-[140px] truncate"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                {/* Priority selector */}
                <select
                  value={quickPriority}
                  onChange={(e) => setQuickPriority(e.target.value as any)}
                  className="px-2 py-1.5 rounded-xl bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="urgent">🔴 Urgent</option>
                  <option value="high">🟠 High</option>
                  <option value="medium">🔵 Medium</option>
                  <option value="low">⚪ Low</option>
                </select>

                {/* Quick Add Button */}
                <button
                  type="submit"
                  disabled={quickSubmitting || !quickTitle.trim()}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-40 shadow-xs"
                >
                  {quickSubmitting ? '...' : 'Add ↵'}
                </button>
              </div>
            </form>

            {/* Segmented Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 dark:bg-slate-800/90 rounded-2xl overflow-x-auto scrollbar-none border border-slate-200/60 dark:border-slate-700/60">
              {[
                { id: 'all', label: 'All Tasks', count: totalTasks, icon: '📋' },
                { id: 'urgent', label: 'Urgent', count: urgentTasks.length, icon: '🔴' },
                { id: 'today', label: 'Due Today', count: todayTasks.length, icon: '⏰' },
                { id: 'in_progress', label: 'In Progress', count: inProgressTasks.length + reviewTasks.length, icon: '⚡' },
                { id: 'done', label: 'Completed', count: completedTasks.length, icon: '✅' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTaskFilter(tab.id as any)}
                  className={`flex-1 min-w-[90px] py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap text-center flex items-center justify-center gap-1.5 ${
                    taskFilter === tab.id
                      ? 'bg-white dark:bg-[#111827] text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-slate-700'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="text-xs">{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      taskFilter === tab.id
                        ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400'
                        : 'bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Task Cards List */}
            <div className="space-y-3 pt-1">
              {filteredTasks.length === 0 ? (
                <div className="p-10 text-center rounded-2xl bg-slate-50/70 dark:bg-[#18233c]/50 border border-slate-200/70 dark:border-slate-800 space-y-3">
                  <div className="text-4xl">✨</div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    No tasks found for this view!
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Everything under this category is complete or no tasks match your search.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTaskFilter('all');
                      setSearchQuery('');
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-bold cursor-pointer hover:bg-blue-100 transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                filteredTasks.map((task) => {
                  const isDone = task.status === 'done';
                  const isOverdue = task.dueDate && task.dueDate < todayISO && !isDone;

                  return (
                    <div
                      key={task.id}
                      className={`group p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isDone
                          ? 'bg-slate-50/60 dark:bg-[#18233c]/30 border-slate-200/60 dark:border-slate-800/60 opacity-80'
                          : 'bg-white dark:bg-[#18233c]/70 hover:bg-slate-50 dark:hover:bg-[#1e2c4b] border-slate-200/90 dark:border-slate-700/80 shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500/40'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                        {/* 1-Tap Toggle Circle */}
                        <button
                          type="button"
                          onClick={() => handleToggleTaskStatus(task.id, task.status)}
                          title={isDone ? 'Mark as Todo' : 'Mark as Done'}
                          className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 cursor-pointer transition-all mt-0.5 sm:mt-0 ${
                            isDone
                              ? 'bg-gradient-to-br from-emerald-500 to-teal-500 border-emerald-500 text-white text-xs font-black shadow-sm'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-[#131c31] hover:border-emerald-500 hover:scale-110 shadow-2xs'
                          }`}
                        >
                          {isDone ? '✓' : ''}
                        </button>

                        <div className="min-w-0 flex-1 space-y-1">
                          <p
                            className={`text-sm font-bold truncate transition-all ${
                              isDone
                                ? 'line-through text-slate-400 dark:text-slate-500 font-medium'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {task.title}
                          </p>

                          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium flex-wrap">
                            {/* Project Pill */}
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-[#131c31] text-slate-700 dark:text-slate-300 font-bold text-[10px] border border-slate-200/70 dark:border-slate-700/70 truncate max-w-[140px]">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: task.projectColor || '#6366f1' }}
                              ></span>
                              <span className="truncate">{task.projectName || 'General'}</span>
                            </span>

                            {/* Status badge - clickable to cycle! */}
                            <button
                              type="button"
                              onClick={() => handleCycleStatus(task.id, task.status)}
                              title="Click to advance status"
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide cursor-pointer border transition-colors ${
                                task.status === 'done'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
                                  : task.status === 'in_progress'
                                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900'
                                  : task.status === 'review'
                                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <span>{task.status.replace('_', ' ')}</span>
                              <span className="text-[9px] opacity-60">↻</span>
                            </button>

                            {/* Due Date chip */}
                            {task.dueDate && (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                  isOverdue
                                    ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60'
                                    : task.dueDate === todayISO
                                    ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/60'
                                    : 'bg-slate-100 dark:bg-[#131c31] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <span>📅</span>
                                <span>{isOverdue ? `Overdue (${task.dueDate})` : task.dueDate === todayISO ? 'Today' : task.dueDate}</span>
                              </span>
                            )}

                            {task.assigneeName && (
                              <span className="hidden sm:inline-flex items-center gap-1 text-slate-400 text-[10px]">
                                <span>👤</span>
                                <span>{task.assigneeName}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right actions: Priority tag + quick actions */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 pt-2 sm:pt-0">
                        {/* Priority Badge */}
                        <span
                          className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                            task.priority === 'urgent'
                              ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 shadow-xs shadow-rose-500/10'
                              : task.priority === 'high'
                              ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60'
                              : task.priority === 'medium'
                              ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {task.priority}
                        </span>

                        {/* Quick Delete button on hover */}
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id, task.title)}
                          title="Delete task"
                          className="opacity-60 sm:opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Kanban Link */}
            <div className="pt-3 text-center border-t border-slate-100 dark:border-slate-800">
              <a
                href="/tasks"
                className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline transition-all"
              >
                <span>View Full Kanban Board, Sprints & Columns</span>
                <span>→</span>
              </a>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Projects Health, Team, & Activity */}
        <div className="lg:col-span-4 space-y-6">
          {/* Active Projects Cards */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-900/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                  <span>Projects</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {projects.length}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Delivery health & velocity</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewProjectOpen(true)}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                + New Project
              </button>
            </div>

            <div className="space-y-3">
              {projects.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-[#18233c]/50 border border-slate-200 dark:border-slate-800 space-y-2">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No projects yet</p>
                  <button
                    type="button"
                    onClick={() => setIsNewProjectOpen(true)}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 underline cursor-pointer"
                  >
                    Create first project
                  </button>
                </div>
              ) : (
                projects.map((proj) => {
                  const pTasks = tasks.filter((t) => t.projectId === proj.id);
                  const pDone = pTasks.filter((t) => t.status === 'done');
                  const pRate = pTasks.length > 0 ? Math.round((pDone.length / pTasks.length) * 100) : 0;

                  return (
                    <a
                      key={proj.id}
                      href={`/tasks?projectId=${proj.id}`}
                      className="group p-4 rounded-2xl bg-slate-50/70 dark:bg-[#18233c]/70 hover:bg-white dark:hover:bg-[#1e2c4b] border border-slate-200/90 dark:border-slate-700/80 shadow-2xs hover:shadow-md transition-all block space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 group-hover:scale-125 transition-transform"
                            style={{ backgroundColor: proj.color || '#6366f1' }}
                          ></span>
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {proj.name}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                          {pRate}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pRate}%`,
                            backgroundColor: proj.color || '#6366f1',
                          }}
                        ></div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                        <span>{pDone.length} of {pTasks.length} tasks completed</span>
                        <span className="text-blue-600 dark:text-blue-400 group-hover:underline">Open Board →</span>
                      </div>
                    </a>
                  );
                })
              )}
            </div>
          </div>

          {/* Active Company Team Deck */}
          {companyMembers.length > 0 && (
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-900/5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                    <span>Company Team</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {companyMembers.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Collaborators in this space</p>
                </div>
                <a href="/company" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                  Manage →
                </a>
              </div>

              <div className="space-y-2">
                {companyMembers.slice(0, 4).map((m) => {
                  const mTasks = tasks.filter((t) => t.assignedTo === m.userId && t.status !== 'done');
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/60 dark:bg-[#18233c]/60 border border-slate-200/60 dark:border-slate-700/60 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                          {m.name ? m.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="min-w-0 truncate">
                          <p className="font-bold text-slate-900 dark:text-white truncate">{m.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{m.jobTitle || m.role}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                        {mTasks.length} pending
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Live Recent Activity Timeline */}
          {activities.length > 0 && (
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-900/5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white tracking-tight">Recent Activity</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Live audit trail</p>
                </div>
                <a href="/audit-log" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                  All Activity →
                </a>
              </div>

              <div className="space-y-3 relative pl-2 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {activities.slice(0, 5).map((act) => {
                  const isCreate = act.action === 'create';
                  const isDelete = act.action === 'delete';

                  return (
                    <div key={act.id} className="flex items-start gap-3 text-xs relative">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 ring-4 ring-white dark:ring-[#111827] z-10 ${
                          isCreate
                            ? 'bg-emerald-500 text-white'
                            : isDelete
                            ? 'bg-rose-500 text-white'
                            : 'bg-blue-500 text-white'
                        }`}
                      >
                        {isCreate ? '+' : isDelete ? '✕' : '•'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-slate-700 dark:text-slate-300 font-medium leading-snug">
                          <strong className="font-bold text-slate-900 dark:text-white">
                            {act.userName || 'Member'}
                          </strong>{' '}
                          {act.action} {act.entityType}{' '}
                          {act.entityName && (
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                              "{act.entityName}"
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {getRelativeTime(act.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          MODAL: QUICK CREATE TASK
         ======================================================== */}
      {isNewTaskOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-lg text-slate-900 dark:text-white">Create New Task</h3>
              <button
                type="button"
                onClick={() => setIsNewTaskOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design User Flow & Prototyping"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#18233c] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Project *
                </label>
                <select
                  required
                  value={taskProjectId}
                  onChange={(e) => setTaskProjectId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#18233c] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 font-semibold"
                >
                  <option value="">Select project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-[#18233c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 font-semibold"
                  >
                    <option value="medium">🔵 Medium</option>
                    <option value="urgent">🔴 Urgent</option>
                    <option value="high">🟠 High</option>
                    <option value="low">⚪ Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#18233c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Task milestones, acceptance criteria, or notes..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#18233c] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 resize-none font-medium"
                ></textarea>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewTaskOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTask}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {creatingTask ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: QUICK CREATE PROJECT
         ======================================================== */}
      {isNewProjectOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-lg text-slate-900 dark:text-white">Create New Project</h3>
              <button
                type="button"
                onClick={() => setIsNewProjectOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mobile App Redesign"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#18233c] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Color Tag
                </label>
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {PROJECT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setProjectColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                        projectColor === c ? 'ring-2 ring-offset-2 ring-blue-600 scale-110 shadow-sm' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {projectColor === c && <span className="text-white text-[10px] font-black">✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Short project overview or objectives..."
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#18233c] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 resize-none font-medium"
                ></textarea>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewProjectOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingProject}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {creatingProject ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
