import React, { useEffect, useState } from 'react';
import type { Task, Project } from '../task/TaskBoard';

export default function DashboardMetrics() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [tRes, pRes] = await Promise.all([
          fetch('/api/tasks'),
          fetch('/api/projects'),
        ]);
        const tData: any = await tRes.json();
        const pData: any = await pRes.json();
        if (tData.tasks) setTasks(tData.tasks);
        if (pData.projects) setProjects(pData.projects);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-slate-800/40 rounded-2xl border border-slate-800"></div>
        ))}
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'done');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const todayTasks = tasks.filter((t) => t.dueDate === todayStr);
  const overdueTasks = tasks.filter((t) => t.dueDate && t.dueDate < todayStr && t.status !== 'done');
  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Today's Tasks */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-[#131b2e] to-[#0d1322] border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Today's Tasks</span>
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 text-sm">📅</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{todayTasks.length}</span>
            <span className="text-xs text-slate-400">due today</span>
          </div>
          <div className="mt-2 text-[11px] text-blue-400 flex items-center gap-1">
            <span>● Priority focus</span>
          </div>
        </div>

        {/* In Progress */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-[#131b2e] to-[#0d1322] border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">In Progress</span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 text-sm">⚡</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{inProgressTasks.length}</span>
            <span className="text-xs text-slate-400">active tasks</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-400 flex items-center gap-1">
            <span>● Actively rolling</span>
          </div>
        </div>

        {/* Completed */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-[#131b2e] to-[#0d1322] border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Completed</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm">✅</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{completedTasks.length}</span>
            <span className="text-xs text-slate-400">finished</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1">
            <span>● {completionRate}% overall completion</span>
          </div>
        </div>

        {/* Overdue */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-[#131b2e] to-[#0d1322] border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Overdue</span>
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-400 text-sm">⚠️</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{overdueTasks.length}</span>
            <span className="text-xs text-slate-400">need action</span>
          </div>
          <div className="mt-2 text-[11px] text-rose-400 flex items-center gap-1">
            <span>● Needs immediate attention</span>
          </div>
        </div>
      </div>

      {/* Progress & Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overall Completion & Velocity */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0d1322] border border-slate-800/80 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-100">Project Velocity & Health</h3>
              <p className="text-xs text-slate-400 mt-0.5">Live status distribution computed at the edge</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
              {totalTasks} Total Tasks
            </span>
          </div>

          {/* Large Multi-Segment Progress Bar */}
          <div className="space-y-2">
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${(tasks.filter((t) => t.status === 'done').length / (totalTasks || 1)) * 100}%` }}
                className="bg-emerald-500 transition-all duration-500"
                title="Done"
              ></div>
              <div
                style={{ width: `${(tasks.filter((t) => t.status === 'review').length / (totalTasks || 1)) * 100}%` }}
                className="bg-purple-500 transition-all duration-500"
                title="Review"
              ></div>
              <div
                style={{ width: `${(tasks.filter((t) => t.status === 'in_progress').length / (totalTasks || 1)) * 100}%` }}
                className="bg-blue-500 transition-all duration-500"
                title="In Progress"
              ></div>
              <div
                style={{ width: `${(tasks.filter((t) => t.status === 'todo').length / (totalTasks || 1)) * 100}%` }}
                className="bg-slate-600 transition-all duration-500"
                title="To Do"
              ></div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Done ({tasks.filter(t => t.status === 'done').length})</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500"></span>Review ({tasks.filter(t => t.status === 'review').length})</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span>In Progress ({tasks.filter(t => t.status === 'in_progress').length})</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-600"></span>To Do ({tasks.filter(t => t.status === 'todo').length})</span>
            </div>
          </div>

          {/* Project List with mini progress */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Projects</h4>
            <div className="space-y-2">
              {projects.map((proj) => {
                const pTasks = tasks.filter((t) => t.projectId === proj.id);
                const pDone = pTasks.filter((t) => t.status === 'done');
                const pct = pTasks.length > 0 ? Math.round((pDone.length / pTasks.length) * 100) : 0;

                return (
                  <div key={proj.id} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: proj.color }}></span>
                      <span className="text-xs font-semibold text-slate-200">{proj.name}</span>
                    </div>
                    <div className="flex items-center gap-3 w-40">
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }}></div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 w-8 text-right">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Activity Card */}
        <div className="p-6 rounded-2xl bg-[#0d1322] border border-slate-800/80 space-y-4">
          <h3 className="font-bold text-base text-slate-100">Recent Activity</h3>
          <div className="space-y-3.5">
            {tasks.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-start gap-3 text-xs">
                <span className="mt-0.5 w-2 h-2 rounded-full bg-indigo-400 shrink-0"></span>
                <div>
                  <p className="font-medium text-slate-200">{t.title}</p>
                  <p className="text-[10px] text-slate-400">
                    Status: <span className="capitalize text-slate-300">{t.status.replace('_', ' ')}</span> • Project: {t.projectName}
                  </p>
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <p className="text-xs text-slate-400 italic">No recent activity found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
