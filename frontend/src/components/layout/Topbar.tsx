import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { notificationsApi } from '../../api/notificationsApi';

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const ADMIN_ROLES = ['SUPER_USER', 'ADMIN'];

export function Topbar() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const canAccessSettings = ADMIN_ROLES.includes(user?.systemRole ?? '');
  const qc = useQueryClient();

  const [showNotifs, setShowNotifs] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  const { data: countData } = useQuery({
    queryKey: ['notif-count'],
    queryFn: notificationsApi.getUnreadCount,
    refetchInterval: 30000,
  });

  const { data: notifs = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.getAll,
    enabled: showNotifs,
  });

  const markReadMut = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notif-count'] });
    },
  });

  const markAllMut = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notif-count'] });
    },
  });

  useEffect(() => {
    if (!showNotifs) return;
    function handler(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node) && !bellRef.current?.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifs]);

  const unread = countData?.count ?? 0;

  return (
    <header className="flex items-center justify-between pl-16 lg:pl-6 pr-6 py-4 bg-white border-b border-gray-100 shrink-0">
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Welcome, {user?.fullName ?? 'User'}
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">{formatDate()}</p>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden sm:block">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            placeholder="Search projects, tasks…"
            className="w-56 pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
              placeholder-gray-400 transition"
          />
        </div>

        {/* Notifications bell */}
        <div className="relative">
          <button
            ref={bellRef}
            onClick={() => setShowNotifs((v) => !v)}
            className="relative p-2 rounded-xl hover:bg-gray-50 text-gray-500 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unread > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-rose-500 text-white text-[9px] font-bold leading-none">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>

          {showNotifs && (
            <div
              ref={panelRef}
              className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-800">Notifications</span>
                {unread > 0 && (
                  <button
                    onClick={() => markAllMut.mutate()}
                    className="text-[11px] text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                {notifs.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">No notifications yet</div>
                ) : (
                  notifs.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.isRead && markReadMut.mutate(n.id)}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition ${!n.isRead ? 'bg-blue-50/40' : ''}`}
                    >
                      <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${!n.isRead ? 'bg-primary-500' : 'bg-transparent'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 leading-tight">{n.title}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{fmtRelative(n.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Settings gear — only for Super User & Admin */}
        {canAccessSettings && (
          <button
            onClick={() => navigate('/settings/company')}
            className="p-2 rounded-xl hover:bg-gray-50 text-gray-500 hover:text-primary-600 transition"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}
