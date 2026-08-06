import { useEffect, useState } from 'react';
import type { CalendarFile } from '../types';

export type CalendarState =
  | { status: 'loading' }
  | { status: 'ready'; data: CalendarFile }
  | { status: 'error'; message: string };

/**
 * Charge le calendrier généré chaque jour par le pipeline d'ingestion.
 *
 * Le paramètre `v` porte la date du jour : le fichier reste donc en cache tant
 * qu'il n'a pas été régénéré, et une nouvelle passe est prise en compte sans
 * attendre l'expiration du cache du CDN.
 */
export function useCalendar(): CalendarState {
  const [state, setState] = useState<CalendarState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    const day = new Date().toISOString().slice(0, 10);
    const url = `${import.meta.env.BASE_URL}data/calendar.json?v=${day}`;

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<CalendarFile>;
      })
      .then((data) => setState({ status: 'ready', data }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Erreur inconnue',
        });
      });

    return () => controller.abort();
  }, []);

  return state;
}

/** Horloge partagée, réévaluée périodiquement pour les compteurs et le « en direct ». */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
