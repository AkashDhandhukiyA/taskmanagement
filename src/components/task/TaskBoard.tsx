import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';

export interface Task {
  id: string;
  projectId: string;
  projectName?: string;
  projectColor?: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'review' | 'done';
  assignedTo?: string | null;
  assigneeName?: string | null;
  assigneeAvatar?: string | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface Comment {
  id: string;
  taskId: string;
  message: string;
  createdAt: string;
  userName: string;
  userAvatar?: string;
}

type QuickFilter = 'all' | 'mine' | 'urgent' | 'high' | 'today' | 'overdue' | 'unassigned';

const COLUMNS: { id: Task['status']; label: string; dotColor: string; badgeBg: string }[] = [
  { id: 'todo', label: 'To Do', dotColor: 'bg-amber-500', badgeBg: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'in_progress', label: 'In Progress', dotColor: 'bg-blue-600', badgeBg: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'review', label: 'In Review', dotColor: 'bg-purple-600', badgeBg: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'done', label: 'Done', dotColor: 'bg-emerald-600', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

const PRIORITY_META: Record<
  Task['priority'],
  { label: string; dot: string; text: string; activeBg: string; activeBorder: string }
> = {
  urgent: { label: 'Urgent', dot: '🔴', text: 'text-rose-600', activeBg: 'bg-rose-50', activeBorder: 'border-rose-300' },
  high:   { label: 'High',   dot: '🟠', text: 'text-amber-700', activeBg: 'bg-amber-50', activeBorder: 'border-amber-300' },
  medium: { label: 'Medium', dot: '🔵', text: 'text-blue-700', activeBg: 'bg-blue-50', activeBorder: 'border-blue-300' },
  low:    { label: 'Low',    dot: '⚪', text: 'text-slate-600', activeBg: 'bg-slate-100', activeBorder: 'border-slate-300' },
};

const PRIORITY_ORDER: Task['priority'][] = ['low', 'medium', 'high', 'urgent'];

export default function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'table'>('kanban');
  const [activeMobileLane, setActiveMobileLane] = useState<Task['status']>('todo');

  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState<Task['priority']>('medium');
  const [formStatus, setFormStatus] = useState<Task['status']>('todo');
  const [formDueDate, setFormDueDate] = useState('');
  const [formProjectId, setFormProjectId] = useState('');
  const [formAssignedTo, setFormAssignedTo] = useState('');

  const currentUserId =
    typeof window !== 'undefined'
      ? localStorage.getItem('userId') || localStorage.getItem('activeUserId') || ''
      : '';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksRes, projectsRes, usersRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/projects'),
        fetch('/api/users'),
      ]);

      const tasksJson: any = await tasksRes.json();
      const projectsJson: any = await projectsRes.json();
      const usersJson: any = await usersRes.json();

      if (tasksJson.tasks) setTasks(tasksJson.tasks);
      if (usersJson.users) setTeamMembers(usersJson.users);
      if (projectsJson.projects) {
        setProjects(projectsJson.projects);
        if (projectsJson.projects.length > 0 && !formProjectId) {
          setFormProjectId(projectsJson.projects[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTask = async (e: any) => {
    e.preventDefault();
    if (!formTitle.trim() || !formProjectId) return;

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription,
          projectId: formProjectId,
          priority: formPriority,
          status: formStatus,
          dueDate: formDueDate || null,
          assignedTo: formAssignedTo || null,
        }),
      });

      if (res.ok) {
        setIsCreateOpen(false);
        setFormTitle('');
        setFormDescription('');
        setFormDueDate('');
        setFormAssignedTo('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTaskPatch = async (taskId: string, patch: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t))
    );
    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, ...patch }),
      });
    } catch (err) {
      console.error(err);
      fetchData();
    }
  };

  const handleStatusChange = (taskId: string, newStatus: Task['status']) =>
    handleTaskPatch(taskId, { status: newStatus });

  const handlePriorityChange = (taskId: string, newPriority: Task['priority']) =>
    handleTaskPatch(taskId, { priority: newPriority });

  const handleDueDateChange = (taskId: string, newDate: string | null) =>
    handleTaskPatch(taskId, { dueDate: newDate });

  const handleProjectChange = (taskId: string, newProjectId: string) => {
    const proj = projects.find((p) => p.id === newProjectId);
    handleTaskPatch(taskId, {
      projectId: newProjectId,
      projectName: proj?.name,
      projectColor: proj?.color,
    });
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as Task['status'];
    handleStatusChange(draggableId, newStatus);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await fetch(`/api/tasks?id=${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        if (selectedTask?.id === taskId) setSelectedTask(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openTaskDetail = async (task: Task) => {
    setSelectedTask(task);
    try {
      const res = await fetch(`/api/comments?taskId=${task.id}`);
      const data: any = await res.json();
      if (data.comments) setComments(data.comments);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: any) => {
    e.preventDefault();
    if (!selectedTask || !newComment.trim()) return;

    try {
      setSubmittingComment(true);
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: selectedTask.id,
          message: newComment,
        }),
      });

      if (res.ok) {
        const json: any = await res.json();
        setComments((prev) => [...prev, json.comment]);
        setNewComment('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const todayISO = new Date().toISOString().slice(0, 10);

  const matchesQuickFilter = (task: Task): boolean => {
    switch (quickFilter) {
      case 'mine':
        return !!currentUserId && task.assignedTo === currentUserId;
      case 'urgent':
        return task.priority === 'urgent';
      case 'high':
        return task.priority === 'high';
      case 'today':
        return task.dueDate === todayISO;
      case 'overdue':
        return !!task.dueDate && task.dueDate < todayISO && task.status !== 'done';
      case 'unassigned':
        return !task.assignedTo;
      case 'all':
      default:
        return true;
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesProject = selectedProject === 'all' || task.projectId === selectedProject;
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesProject && matchesSearch && matchesQuickFilter(task);
  });

  const quickFilters: { id: QuickFilter; label: string; count: number; tone: string }[] = [
    { id: 'all', label: 'All Tasks', count: tasks.length, tone: 'slate' },
    { id: 'mine', label: 'My Tasks', count: tasks.filter((t) => !!currentUserId && t.assignedTo === currentUserId).length, tone: 'blue' },
    { id: 'urgent', label: 'Urgent', count: tasks.filter((t) => t.priority === 'urgent').length, tone: 'rose' },
    { id: 'high', label: 'High', count: tasks.filter((t) => t.priority === 'high').length, tone: 'amber' },
    { id: 'today', label: 'Due Today', count: tasks.filter((t) => t.dueDate === todayISO).length, tone: 'indigo' },
    { id: 'overdue', label: 'Overdue', count: tasks.filter((t) => !!t.dueDate && t.dueDate < todayISO && t.status !== 'done').length, tone: 'red' },
    { id: 'unassigned', label: 'Unassigned', count: tasks.filter((t) => !t.assignedTo).length, tone: 'slate' },
  ];

  const getPriorityBadge = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">Urgent</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">Low</span>;
    }
  };

  const chipClass = (isActive: boolean, tone: string) => {
    if (isActive) {
      switch (tone) {
        case 'blue':   return 'bg-blue-600 text-white border-blue-600 shadow-sm';
        case 'rose':   return 'bg-rose-600 text-white border-rose-600 shadow-sm';
        case 'amber':  return 'bg-amber-500 text-white border-amber-500 shadow-sm';
        case 'indigo': return 'bg-indigo-600 text-white border-indigo-600 shadow-sm';
        case 'red':    return 'bg-red-600 text-white border-red-600 shadow-sm';
        case 'slate':
        default:       return 'bg-slate-800 text-white border-slate-800 shadow-sm';
      }
    }
    return 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50';
  };

  // ---------- Reusable styled inline selectors ----------

  const PrioritySelect = ({
    value,
    onChange,
    size = 'sm',
  }: {
    value: Task['priority'];
    onChange: (p: Task['priority']) => void;
    size?: 'sm' | 'md';
  }) => {
    const meta = PRIORITY_META[value];
    const sizeCls =
      size === 'sm'
        ? 'text-[10px] px-2 py-0.5 rounded-lg'
        : 'text-xs px-2.5 py-1.5 rounded-xl';
    return (
      <div className="relative inline-flex">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as Task['priority'])}
          onClick={(e) => e.stopPropagation()}
          className={`appearance-none cursor-pointer border font-bold pr-6 ${sizeCls} ${meta.activeBg} ${meta.text} ${meta.activeBorder}`}
        >
          {PRIORITY_ORDER.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_META[p].dot} {PRIORITY_META[p].label}
            </option>
          ))}
        </select>
        <svg
          className={`pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 ${meta.text}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    );
  };

  // ✅ FIXED — clean pill, no overlay that overflows
  const ProjectSelect = ({
    value,
    onChange,
    size = 'sm',
  }: {
    value: string;
    onChange: (id: string) => void;
    size?: 'sm' | 'md';
  }) => {
    const proj = projects.find((p) => p.id === value);
    const color = proj?.color || '#2563eb';
    const sizeCls =
      size === 'sm'
        ? 'text-[10px] px-2 py-0.5 rounded-lg'
        : 'text-xs px-2.5 py-1.5 rounded-xl';

    return (
      <div className="relative inline-flex items-center max-w-[140px]">
        <span
          className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/90 z-10"
          aria-hidden
        ></span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className={`appearance-none cursor-pointer font-bold text-white border pr-6 pl-4 truncate ${sizeCls}`}
          style={{ backgroundColor: color, borderColor: color }}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id} style={{ color: '#0f172a', background: '#ffffff' }}>
              📁 {p.name}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-white z-10"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    );
  };

  const StatusSelect = ({
    value,
    onChange,
    size = 'sm',
  }: {
    value: Task['status'];
    onChange: (s: Task['status']) => void;
    size?: 'sm' | 'md';
  }) => {
    const col = COLUMNS.find((c) => c.id === value)!;
    const sizeCls =
      size === 'sm'
        ? 'text-[10px] px-2 py-0.5 rounded-lg'
        : 'text-xs px-2.5 py-1.5 rounded-xl';
    return (
      <div className="relative inline-flex">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as Task['status'])}
          onClick={(e) => e.stopPropagation()}
          className={`appearance-none cursor-pointer border font-bold pr-6 ${sizeCls} ${col.badgeBg}`}
        >
          {COLUMNS.map((c) => (
            <option key={c.id} value={c.id}>
              → {c.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-500"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    );
  };

  const formatDateLabel = (iso?: string | null) => {
    if (!iso) return 'No date';
    const d = new Date(iso + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const DueDateSelect = ({
    value,
    onChange,
    size = 'sm',
  }: {
    value?: string | null;
    onChange: (date: string | null) => void;
    size?: 'sm' | 'md';
  }) => {
    const sizeCls =
      size === 'sm'
        ? 'text-[10px] px-2 py-0.5 rounded-lg'
        : 'text-xs px-2.5 py-1.5 rounded-xl';
    const isOverdue = !!value && value < todayISO;
    const isToday = value === todayISO;
    const tone = isOverdue
      ? 'bg-rose-50 text-rose-600 border-rose-300'
      : isToday
      ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
      : 'bg-slate-50 text-slate-600 border-slate-200';

    return (
      <div className="relative inline-flex items-center gap-1">
        <span className={`inline-flex items-center gap-1 border font-bold ${sizeCls} ${tone}`}>
          <span>📅</span>
          <span>{formatDateLabel(value)}</span>
        </span>
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value || null)}
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label="Change due date"
        />
        {value && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="text-slate-400 hover:text-rose-500 text-[10px] font-bold px-1"
            title="Clear date"
          >
            ✕
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Toolbar */}
      <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'kanban' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kanban
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'list' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'table' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Table
              </button>
            </div>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="sm:hidden flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/25 transition-all cursor-pointer shrink-0"
            >
              <span>+ New</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-1 sm:justify-end">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="bg-slate-50 text-xs font-semibold text-slate-700 border border-slate-200 rounded-xl px-2.5 sm:px-3 py-2 focus:outline-none focus:border-blue-600 flex-1 sm:flex-none max-w-[170px] sm:max-w-[200px] truncate"
            >
              <option value="all">All Projects ({tasks.length})</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  📁 {p.name}
                </option>
              ))}
            </select>

            <div className="relative flex-1 sm:w-48 sm:flex-none">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="bg-slate-50 text-xs text-slate-800 border border-slate-200 rounded-xl pl-3 pr-7 py-2 focus:outline-none focus:border-blue-600 w-full font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="hidden sm:flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/25 transition-all cursor-pointer shrink-0"
            >
              <span>+ New Task</span>
            </button>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Quick Filters</span>
            <div className="flex-1 h-px bg-slate-100"></div>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'thin' }}>
            {quickFilters.map((chip) => {
              const isActive = quickFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setQuickFilter(chip.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border whitespace-nowrap transition-all active:scale-95 cursor-pointer shrink-0 ${chipClass(isActive, chip.tone)}`}
                >
                  <span>{chip.label}</span>
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                      isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs font-semibold">Loading tasks...</p>
        </div>
      ) : (
        <>
          {/* KANBAN */}
          {viewMode === 'kanban' && (
            <div className="space-y-4 w-full">
              <div className="md:hidden grid grid-cols-4 gap-1 p-1 bg-slate-200/70 rounded-2xl w-full">
                {COLUMNS.map((col) => {
                  const count = filteredTasks.filter((t) => t.status === col.id).length;
                  const isSelected = activeMobileLane === col.id;
                  return (
                    <button
                      key={col.id}
                      onClick={() => setActiveMobileLane(col.id)}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                        isSelected
                          ? 'bg-white text-blue-600 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${col.dotColor}`}></span>
                        <span className="truncate text-[11px]">{col.label}</span>
                      </div>
                      <span className={`text-[10px] font-extrabold ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <DragDropContext onDragEnd={onDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
                  {COLUMNS.map((column) => {
                    const columnTasks = filteredTasks.filter((t) => t.status === column.id);
                    const isVisibleOnMobile = activeMobileLane === column.id;

                    return (
                      <div
                        key={column.id}
                        className={`${isVisibleOnMobile ? 'flex' : 'hidden md:flex'} flex-col bg-slate-100/70 rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs min-h-[480px] w-full`}
                      >
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${column.dotColor}`}></span>
                            <h2 className="font-bold text-xs text-slate-800">{column.label}</h2>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${column.badgeBg}`}>
                            {columnTasks.length}
                          </span>
                        </div>

                        <Droppable droppableId={column.id}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`space-y-2.5 flex-1 overflow-y-auto min-h-[140px] rounded-xl p-1 transition-all ${
                                snapshot.isDraggingOver
                                  ? 'bg-blue-50/80 border-2 border-blue-400 border-dashed shadow-inner'
                                  : 'border-2 border-transparent'
                              }`}
                            >
                              {columnTasks.length === 0 && !snapshot.isDraggingOver ? (
                                <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400 font-medium">
                                  No tasks in this lane
                                </div>
                              ) : (
                                columnTasks.map((task, index) => (
                                  <Draggable key={task.id} draggableId={task.id} index={index}>
                                    {(dragProvided, dragSnapshot) => (
                                      <div
                                        ref={dragProvided.innerRef}
                                        {...dragProvided.draggableProps}
                                        {...dragProvided.dragHandleProps}
                                        onClick={() => openTaskDetail(task)}
                                        className={`group p-3.5 bg-white rounded-2xl transition-all shadow-xs relative cursor-grab active:cursor-grabbing select-none ${
                                          dragSnapshot.isDragging
                                            ? 'shadow-2xl border-2 border-blue-500 ring-4 ring-blue-500/20 rotate-1 scale-[1.02] z-50'
                                            : 'hover:border-blue-400 border border-slate-200/90 hover:shadow-md'
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                          <ProjectSelect
                                            value={task.projectId}
                                            onChange={(pid) => handleProjectChange(task.id, pid)}
                                          />
                                          <div className="flex items-center gap-1.5">
                                            <PrioritySelect
                                              value={task.priority}
                                              onChange={(p) => handlePriorityChange(task.id, p)}
                                            />
                                            <span className="text-slate-300 group-hover:text-slate-500 text-xs font-bold leading-none" title="Drag task">
                                              ⠿
                                            </span>
                                          </div>
                                        </div>

                                        <h3 className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                                          {task.title}
                                        </h3>

                                        {task.description && (
                                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                                            {task.description}
                                          </p>
                                        )}

                                        <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100 text-[10px] text-slate-400 font-semibold">
                                          <DueDateSelect
                                            value={task.dueDate}
                                            onChange={(d) => handleDueDateChange(task.id, d)}
                                          />

                                          <div className="flex items-center gap-1.5">
                                            {task.assigneeAvatar && (
                                              <img
                                                src={task.assigneeAvatar}
                                                alt=""
                                                className="w-4 h-4 rounded-full"
                                              />
                                            )}
                                            <StatusSelect
                                              value={task.status}
                                              onChange={(s) => handleStatusChange(task.id, s)}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </Draggable>
                                ))
                              )}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    );
                  })}
                </div>
              </DragDropContext>
            </div>
          )}

          {/* LIST */}
          {viewMode === 'list' && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-2xs">
              {filteredTasks.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-medium">No tasks found</div>
              ) : (
                filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => openTaskDetail(task)}
                    className="p-3 sm:p-3.5 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(task.id, task.status === 'done' ? 'todo' : 'done');
                        }}
                        className={`w-4 h-4 rounded-md border flex items-center justify-center text-xs transition-colors shrink-0 mt-0.5 sm:mt-0 ${
                          task.status === 'done'
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {task.status === 'done' && '✓'}
                      </button>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold text-slate-900 truncate ${task.status === 'done' ? 'line-through text-slate-400' : ''}`}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1">{task.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pl-7 sm:pl-0 shrink-0 flex-wrap">
                      <ProjectSelect
                        value={task.projectId}
                        onChange={(pid) => handleProjectChange(task.id, pid)}
                      />
                      <PrioritySelect
                        value={task.priority}
                        onChange={(p) => handlePriorityChange(task.id, p)}
                      />
                      <DueDateSelect
                        value={task.dueDate}
                        onChange={(d) => handleDueDateChange(task.id, d)}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TABLE */}
          {viewMode === 'table' && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-2xs -mx-2 sm:mx-0">
              <table className="w-full min-w-[720px] text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Task</th>
                    <th className="p-3.5">Project</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Priority</th>
                    <th className="p-3.5">Due Date</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.map((task) => (
                    <tr
                      key={task.id}
                      onClick={() => openTaskDetail(task)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="p-3.5 font-bold text-slate-900">{task.title}</td>
                      <td className="p-3.5">
                        <ProjectSelect
                          value={task.projectId}
                          onChange={(pid) => handleProjectChange(task.id, pid)}
                        />
                      </td>
                      <td className="p-3.5">
                        <StatusSelect
                          value={task.status}
                          onChange={(s) => handleStatusChange(task.id, s)}
                        />
                      </td>
                      <td className="p-3.5">
                        <PrioritySelect
                          value={task.priority}
                          onChange={(p) => handlePriorityChange(task.id, p)}
                        />
                      </td>
                      <td className="p-3.5">
                        <DueDateSelect
                          value={task.dueDate}
                          onChange={(d) => handleDueDateChange(task.id, d)}
                        />
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTask(task.id);
                          }}
                          className="text-rose-600 hover:text-rose-700 font-bold p-1"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* CREATE TASK MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-base text-slate-900">Create New Task</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5 pt-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="Task title..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Details, requirements..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Project *</label>
                  <select
                    value={formProjectId}
                    onChange={(e) => setFormProjectId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>📁 {p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as Task['priority'])}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
                  >
                    {PRIORITY_ORDER.map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_META[p].dot} {PRIORITY_META[p].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Lane</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as Task['status'])}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
                  >
                    {COLUMNS.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assign To Team Member</label>
                <select
                  value={formAssignedTo}
                  onChange={(e) => setFormAssignedTo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/30"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TASK DETAIL DRAWER */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="w-full sm:max-w-lg bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl pb-16 sm:pb-0">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ProjectSelect
                  value={selectedTask.projectId}
                  onChange={(pid) => {
                    handleProjectChange(selectedTask.id, pid);
                    const proj = projects.find((p) => p.id === pid);
                    setSelectedTask({
                      ...selectedTask,
                      projectId: pid,
                      projectName: proj?.name,
                      projectColor: proj?.color,
                    });
                  }}
                />
                <PrioritySelect
                  value={selectedTask.priority}
                  onChange={(p) => {
                    handlePriorityChange(selectedTask.id, p);
                    setSelectedTask({ ...selectedTask, priority: p });
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 p-1"
                >
                  Delete
                </button>
                <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-slate-600 text-base p-1">
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <h2 className="text-lg font-black text-slate-900">{selectedTask.title}</h2>
                <div className="mt-2 flex items-center gap-2">
                  <DueDateSelect
                    value={selectedTask.dueDate}
                    size="md"
                    onChange={(d) => {
                      handleDueDateChange(selectedTask.id, d);
                      setSelectedTask({ ...selectedTask, dueDate: d });
                    }}
                  />
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Description</h4>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {selectedTask.description || 'No description provided.'}
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Status</h4>
                <StatusSelect
                  value={selectedTask.status}
                  size="md"
                  onChange={(s) => {
                    handleStatusChange(selectedTask.id, s);
                    setSelectedTask({ ...selectedTask, status: s });
                  }}
                />
              </div>

              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Move Lane</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {COLUMNS.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => {
                        handleStatusChange(selectedTask.id, col.id);
                        setSelectedTask({ ...selectedTask, status: col.id });
                      }}
                      className={`py-2 px-1 text-xs font-bold rounded-xl border text-center transition-all ${
                        selectedTask.status === col.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comments */}
              <div className="pt-4 border-t border-slate-100 space-y-3 pb-24 sm:pb-6">
                <h4 className="text-xs font-bold text-slate-800">Comments ({comments.length})</h4>
                <div className="space-y-2">
                  {comments.map((c) => (
                    <div key={c.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center justify-between font-bold text-slate-800 text-[11px]">
                        <span>{c.userName}</span>
                        <span className="text-[9px] text-slate-400">{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-slate-600 text-xs mt-1">{c.message}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <button
                    type="submit"
                    disabled={submittingComment || !newComment.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold"
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
