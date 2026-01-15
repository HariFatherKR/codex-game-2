import { useEffect, useState } from 'react';

export const useLocalStorage = <T,>(key: string, initial: T) => {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setValue(JSON.parse(stored) as T);
      } catch {
        setValue(initial);
      }
    }
  }, [initial, key]);

  const update = (next: T) => {
    setValue(next);
    localStorage.setItem(key, JSON.stringify(next));
  };

  return [value, update] as const;
};
