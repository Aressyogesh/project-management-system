import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { usersApi, type CelebrationEntry } from '../api/users.api';
import { useAuthStore } from '../store/authStore';

interface CelebrationsContextValue {
  celebrations: CelebrationEntry[];
  celebrationMap: Map<string, 'BIRTHDAY' | 'ANNIVERSARY'>;
}

const CelebrationsContext = createContext<CelebrationsContextValue>({
  celebrations: [],
  celebrationMap: new Map(),
});

export function useCelebrations() {
  return useContext(CelebrationsContext);
}

function todayKey() {
  return new Date().toDateString();
}

export function CelebrationsProvider({ children }: { children: ReactNode }) {
  const [celebrations, setCelebrations] = useState<CelebrationEntry[]>([]);
  const [fetchedOn, setFetchedOn] = useState('');
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;
    const today = todayKey();
    if (fetchedOn === today) return;
    usersApi.getCelebrationsToday().then((data) => {
      setFetchedOn(today);
      if (!data.length) { setCelebrations([]); return; }
      setCelebrations(data);
    }).catch(() => {});
  }, [isAuthenticated, fetchedOn]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible' && fetchedOn !== todayKey()) {
        setFetchedOn('');
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [isAuthenticated, fetchedOn]);

  const celebrationMap = new Map<string, 'BIRTHDAY' | 'ANNIVERSARY'>(
    celebrations.map((c) => [c.user.id, c.type]),
  );

  return (
    <CelebrationsContext.Provider value={{ celebrations, celebrationMap }}>
      {children}
    </CelebrationsContext.Provider>
  );
}
