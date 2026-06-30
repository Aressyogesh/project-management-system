import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { usersApi, type CelebrationEntry } from '../api/users.api';

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

const todayKey = () => new Date().toISOString().slice(0, 10);

export function CelebrationsProvider({ children }: { children: ReactNode }) {
  const [celebrations, setCelebrations] = useState<CelebrationEntry[]>([]);

  useEffect(() => {
    usersApi.getCelebrationsToday().then((data) => {
      if (!data.length) return;
      setCelebrations(data);

      const key = `celebration-announced-${todayKey()}`;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '1');
        usersApi.postCelebrationAnnouncement().catch(() => {});
      }
    }).catch(() => {});
  }, []);

  const celebrationMap = new Map<string, 'BIRTHDAY' | 'ANNIVERSARY'>(
    celebrations.map((c) => [c.user.id, c.type]),
  );

  return (
    <CelebrationsContext.Provider value={{ celebrations, celebrationMap }}>
      {children}
    </CelebrationsContext.Provider>
  );
}
