import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'gantt-archived-projects';

function readMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / serialization errors
  }
}

export function useArchivedProjects() {
  const [archivedMap, setArchivedMap] = useState(readMap);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setArchivedMap(readMap());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const archive = useCallback((id) => {
    setArchivedMap(prev => {
      const next = { ...prev, [id]: new Date().toISOString() };
      writeMap(next);
      return next;
    });
  }, []);

  const restore = useCallback((id) => {
    setArchivedMap(prev => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      writeMap(next);
      return next;
    });
  }, []);

  return { archivedMap, archive, restore };
}
