import { DateTime } from 'luxon';
import { useMemo, useState } from 'react';

import { Discover } from './components/Discover';
import { DaySection } from './components/DaySection';
import { Filters } from './components/Filters';
import { Footer } from './components/Footer';
import { NextSession } from './components/NextSession';
import { WeekNav } from './components/WeekNav';
import { filterSessions, type KindFilter } from './lib/filters';
import { usePersistentState } from './lib/prefs';
import { PARIS, dayKey, isPast, startOfWeek, weekDayKeys } from './lib/time';
import { useCalendar, useNow } from './lib/useCalendar';
import type { Series, Session } from './types';

/** Catégories mises en avant par défaut pour la suggestion « à découvrir ». */
const MAINSTREAM = ['f1', 'motogp'];

/** Horizon de la suggestion « à découvrir », en jours. */
const DISCOVER_HORIZON_DAYS = 28;

export default function App() {
  const state = useCalendar();
  const nowDate = useNow();

  const [selected, setSelected] = usePersistentState<string[]>('series', []);
  const [kindFilter, setKindFilter] = usePersistentState<KindFilter>('kind', 'all');
  const [zone, setZone] = usePersistentState<string>('zone', PARIS);
  const [weekOffset, setWeekOffset] = useState(0);

  const now = useMemo(() => DateTime.fromJSDate(nowDate).setZone(zone), [nowDate, zone]);
  const data = state.status === 'ready' ? state.data : null;

  const seriesById = useMemo(
    () => new Map<string, Series>((data?.series ?? []).map((s) => [s.id, s])),
    [data],
  );

  /** Sessions retenues par les filtres, toutes semaines confondues. */
  const visible = useMemo(
    () => filterSessions(data?.sessions ?? [], selected, kindFilter),
    [data, selected, kindFilter],
  );

  const currentWeekStart = useMemo(() => startOfWeek(now), [now]);
  const weekStart = useMemo(
    () => currentWeekStart.plus({ weeks: weekOffset }),
    [currentWeekStart, weekOffset],
  );

  /** Les sessions de la semaine affichée, regroupées par jour. */
  const days = useMemo(() => {
    const keys = weekDayKeys(weekStart);
    const inWeek = new Set(keys);
    const grouped = new Map<string, Session[]>();

    for (const session of visible) {
      const key = dayKey(session, zone);
      if (!inWeek.has(key)) continue;
      const bucket = grouped.get(key);
      if (bucket) bucket.push(session);
      else grouped.set(key, [session]);
    }

    // Les sessions sans horaire connu passent en fin de journée : elles ne
    // peuvent pas être classées entre deux horaires précis.
    for (const bucket of grouped.values()) {
      bucket.sort((a, b) => {
        if (a.timeTbd !== b.timeTbd) return a.timeTbd ? 1 : -1;
        return a.startUtc.localeCompare(b.startUtc);
      });
    }

    return keys.filter((key) => grouped.has(key)).map((key) => ({ key, sessions: grouped.get(key)! }));
  }, [visible, weekStart, zone]);

  /** Catégories déjà présentes dans la semaine affichée. */
  const seriesInWeek = useMemo(
    () => new Set(days.flatMap((day) => day.sessions.map((s) => s.seriesId))),
    [days],
  );

  /** Première session à venir ou en cours, tous jours confondus. */
  const upcoming = useMemo(() => visible.find((s) => !isPast(s, now)), [visible, now]);

  /** Une course d'une catégorie non suivie, pour donner envie d'élargir. */
  const discovery = useMemo(() => {
    if (!data) return null;

    const followed = new Set(selected.length > 0 ? selected : MAINSTREAM);
    const horizon = now.plus({ days: DISCOVER_HORIZON_DAYS });

    const session = data.sessions.find((s) => {
      // Inutile de « faire découvrir » une catégorie déjà listée juste au-dessus.
      if (followed.has(s.seriesId) || seriesInWeek.has(s.seriesId)) return false;
      if (s.kind !== 'race') return false;
      const start = DateTime.fromISO(s.startUtc, { zone: 'utc' });
      return start >= now && start <= horizon;
    });

    if (!session) return null;
    const series = seriesById.get(session.seriesId);
    return series ? { series, session } : null;
  }, [data, selected, now, seriesById, seriesInWeek]);

  /**
   * Semaine suivante contenant au moins une session — l'intersaison et les
   * trêves estivales laissent des semaines entières vides.
   */
  const nextBusyWeekOffset = useMemo(() => {
    const lastKey = weekDayKeys(weekStart)[6];
    const next = visible.find((s) => dayKey(s, zone) > lastKey);
    if (!next) return null;

    const target = startOfWeek(DateTime.fromISO(dayKey(next, zone), { zone }));
    return Math.round(target.diff(currentWeekStart, 'weeks').weeks);
  }, [visible, weekStart, zone, currentWeekStart]);

  function toggleSeries(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  if (state.status === 'loading') {
    return (
      <main className="shell">
        <Header />
        <p className="placeholder">Chargement du calendrier…</p>
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="shell">
        <Header />
        <p className="placeholder placeholder--error">
          Impossible de charger le calendrier ({state.message}). Réessayez dans un instant.
        </p>
      </main>
    );
  }

  const calendar = state.data;
  const todayKey = now.toFormat('yyyy-MM-dd');

  return (
    <main className="shell">
      <Header />

      {upcoming && seriesById.has(upcoming.seriesId) && (
        <NextSession
          session={upcoming}
          series={seriesById.get(upcoming.seriesId)!}
          zone={zone}
          now={now}
        />
      )}

      <WeekNav weekStart={weekStart} offset={weekOffset} onChange={setWeekOffset} />

      <Filters
        series={calendar.series}
        selected={selected}
        onToggleSeries={toggleSeries}
        onClearSeries={() => setSelected([])}
        kindFilter={kindFilter}
        onKindFilter={setKindFilter}
        zone={zone}
        onZone={setZone}
        now={now}
      />

      {days.length > 0 ? (
        <div className="week">
          {days.map(({ key, sessions }) => (
            <DaySection
              key={key}
              dayKey={key}
              sessions={sessions}
              seriesById={seriesById}
              zone={zone}
              now={now}
              isToday={key === todayKey}
            />
          ))}
        </div>
      ) : (
        <div className="empty">
          <p className="empty__title">Aucune session cette semaine.</p>
          <p className="empty__hint">
            {selected.length > 0
              ? 'Pas de course dans les catégories que vous suivez — élargissez la sélection ou avancez d’une semaine.'
              : 'Trêve entre deux manches.'}
          </p>
          {nextBusyWeekOffset !== null && (
            <button
              type="button"
              className="empty__cta"
              onClick={() => setWeekOffset(nextBusyWeekOffset)}
            >
              Aller à la prochaine semaine de course
            </button>
          )}
        </div>
      )}

      {discovery && (
        <Discover
          series={discovery.series}
          session={discovery.session}
          zone={zone}
          onFollow={(id) => setSelected((current) => (current.includes(id) ? current : [...current, id]))}
        />
      )}

      <Footer
        generatedAt={calendar.generatedAt}
        sources={calendar.sources}
        sessionCount={calendar.sessions.length}
      />
    </main>
  );
}

function Header() {
  return (
    <header className="header">
      <h1 className="header__title">
        <span className="header__flag" aria-hidden="true" />
        Le Calendrier
      </h1>
      <p className="header__tagline">
        Tout le sport auto de la semaine — courses, qualifs et sprints, horaires réglés sur Paris,
        et où les regarder. Au même endroit.
      </p>
    </header>
  );
}
