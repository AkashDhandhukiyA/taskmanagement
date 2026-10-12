import React, { useState, useEffect, useRef } from 'react';

interface Notification {
  id: string;
  type: string;
  title: string;
  desc: string;
  time: string;
  link: string;
}

export default function HeaderSearchNotifications({ user }: { user: any }) {
  // Search state
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ tasks: any[]; projects: any[] }>({ tasks: [], projects: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Load notifications
  useEffect(() => {
    async function fetchNotifs() {
      try {
        const res = await fetch('/api/notifications');
        const data: any = await res.json();
        if (data.notifications) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchNotifs();
  }, []);

  // Search debounce
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults({ tasks: [], projects: [] });
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const data: any = await res.json();
        setSearchResults({
          tasks: data.tasks || [],
          projects: data.projects || [],
        });
        setShowSearchDropdown(true);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotificationPanel(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-between">
      {/* Global Search Input (Desktop) */}
      <div ref={searchRef} className="relative flex-1 max-w-md hidden md:block">
        <div className="relative w-full">
          <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (query.trim()) setShowSearchDropdown(true);
            }}
            placeholder="Search tasks, projects, tags... (Press / to focus)"
            className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl pl-10 pr-8 py-2 focus:outline-none focus:border-blue-600 focus:bg-white transition-all placeholder:text-slate-400 font-medium"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setShowSearchDropdown(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Live Search Results Popover (Desktop) */}
        {showSearchDropdown && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50 space-y-3 max-h-80 overflow-y-auto">
            {isSearching ? (
              <p className="text-center py-4 text-xs text-slate-400 font-medium">Searching...</p>
            ) : searchResults.tasks.length === 0 && searchResults.projects.length === 0 ? (
              <p className="text-center py-4 text-xs text-slate-400 font-medium">No results found for "{query}"</p>
            ) : (
              <>
                {searchResults.projects.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">Projects</span>
                    <div className="mt-1 space-y-1">
                      {searchResults.projects.map((p) => (
                        <a
                          key={p.id}
                          href="/projects"
                          className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 transition-colors"
                        >
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color || '#2563eb' }}></span>
                          <span className="text-xs font-bold text-slate-800">{p.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.tasks.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">Tasks</span>
                    <div className="mt-1 space-y-1">
                      {searchResults.tasks.map((t) => (
                        <a
                          key={t.id}
                          href="/tasks"
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs">☑️</span>
                            <span className="text-xs font-semibold text-slate-800 truncate">{t.title}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-50 text-blue-700">
                            {t.status}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right Action Icons */}
      <div className="flex items-center gap-2 sm:gap-3 ml-auto">
        {/* Mobile Search Button */}
        <button
          onClick={() => setIsMobileSearchOpen(true)}
          className="md:hidden p-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          title="Search"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
          Cloudflare D1
        </span>

        {/* Notifications Icon & Popover */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => {
              setShowNotificationPanel(!showNotificationPanel);
              setUnreadCount(0);
            }}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors cursor-pointer relative"
            title="Notifications"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white"></span>
            )}
          </button>

          {/* Notifications Dropdown Panel (Responsive) */}
          {showNotificationPanel && (
            <>
              {/* Mobile Backdrop */}
              <div
                onClick={() => setShowNotificationPanel(false)}
                className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 sm:hidden"
              />

              <div className="fixed inset-x-3 top-18 sm:top-full sm:absolute sm:inset-x-auto sm:right-0 sm:mt-2 w-auto sm:w-85 max-w-sm sm:max-w-none mx-auto sm:mx-0 bg-white border border-slate-200/90 rounded-2xl shadow-2xl sm:shadow-xl p-4 z-50 space-y-3 animate-in fade-in duration-100">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">Live Notifications</span>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {notifications.length} recent
                    </span>
                  </div>
                  <button
                    onClick={() => setShowNotificationPanel(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 text-xs sm:hidden rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2 max-h-[60vh] sm:max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-1.5">
                      <span className="text-xl">🔔</span>
                      <p>No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <a
                        key={n.id}
                        href={n.link}
                        onClick={() => setShowNotificationPanel(false)}
                        className="block p-3 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100 hover:border-blue-200"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <p className="text-xs font-bold text-slate-800">{n.title}</p>
                          <span className="text-[9px] text-slate-400 font-medium shrink-0">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{n.desc}</p>
                      </a>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Profile Avatar */}
        <a href="/settings" className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-slate-100 shrink-0">
          <img
            src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.name || 'Maya')}`}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </a>
      </div>

      {/* Mobile Search Overlay Modal */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col p-4">
          <div className="bg-white rounded-2xl p-4 shadow-2xl space-y-3 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="relative flex-1">
                <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search tasks, projects..."
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>
              <button
                onClick={() => {
                  setIsMobileSearchOpen(false);
                  setQuery('');
                }}
                className="p-2 text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {isSearching ? (
                <p className="text-center py-6 text-xs text-slate-400">Searching...</p>
              ) : query && searchResults.tasks.length === 0 && searchResults.projects.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-400">No results found</p>
              ) : (
                <>
                  {searchResults.projects.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Projects</span>
                      <div className="mt-1 space-y-1">
                        {searchResults.projects.map((p) => (
                          <a
                            key={p.id}
                            href="/projects"
                            onClick={() => setIsMobileSearchOpen(false)}
                            className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100"
                          >
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color || '#2563eb' }}></span>
                            <span className="text-xs font-bold text-slate-800">{p.name}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.tasks.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Tasks</span>
                      <div className="mt-1 space-y-1">
                        {searchResults.tasks.map((t) => (
                          <a
                            key={t.id}
                            href="/tasks"
                            onClick={() => setIsMobileSearchOpen(false)}
                            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100"
                          >
                            <span className="text-xs font-bold text-slate-800 truncate">{t.title}</span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-50 text-blue-700">
                              {t.status}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
