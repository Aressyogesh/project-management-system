import { useState } from 'react';

export function usePageSize(key: string, defaultSize = 25): [number, (n: number) => void] {
  const storageKey = `pms_pageSize_${key}`;
  const [pageSize, setPageSizeState] = useState<number>(() => {
    const stored = localStorage.getItem(storageKey);
    const parsed = stored ? parseInt(stored, 10) : NaN;
    return [10, 25, 50, 100].includes(parsed) ? parsed : defaultSize;
  });

  function setPageSize(n: number) {
    localStorage.setItem(storageKey, String(n));
    setPageSizeState(n);
  }

  return [pageSize, setPageSize];
}
