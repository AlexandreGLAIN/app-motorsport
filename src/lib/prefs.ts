import { useCallback, useEffect, useState } from 'react';

/**
 * Préférences persistées dans le navigateur : catégories suivies, fuseau,
 * type de sessions. Aucun compte, aucun serveur — le site est public et
 * consultable par n'importe qui, les réglages restent sur l'appareil.
 */

const PREFIX = 'app-motorsport:';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    // localStorage indisponible (navigation privée stricte, quota) : on
    // retombe sur la valeur par défaut plutôt que de casser le rendu.
    return fallback;
  }
}

export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => read(key, initial));

  useEffect(() => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* écriture impossible : la préférence vaudra pour la session en cours */
    }
  }, [key, value]);

  const reset = useCallback(() => setValue(initial), [initial]);

  return [value, setValue, reset] as const;
}
