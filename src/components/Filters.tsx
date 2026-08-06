import { DateTime } from 'luxon';
import type { Series } from '../types';
import { KIND_FILTERS, type KindFilter } from '../lib/filters';
import { PARIS, zoneLabel, zoneOffset } from '../lib/time';

interface Props {
  series: Series[];
  selected: string[];
  onToggleSeries: (id: string) => void;
  onClearSeries: () => void;
  kindFilter: KindFilter;
  onKindFilter: (value: KindFilter) => void;
  zone: string;
  onZone: (zone: string) => void;
  now: DateTime;
}

/** Fuseaux proposés, en plus de Paris et de celui de l'appareil. */
const EXTRA_ZONES = [
  'Europe/London',
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Asia/Tokyo',
  'Australia/Sydney',
];

function zoneOptions(): string[] {
  let local = PARIS;
  try {
    local = Intl.DateTimeFormat().resolvedOptions().timeZone || PARIS;
  } catch {
    /* environnement sans base de fuseaux : Paris fera l'affaire */
  }
  return [...new Set([PARIS, local, ...EXTRA_ZONES])];
}

export function Filters({
  series,
  selected,
  onToggleSeries,
  onClearSeries,
  kindFilter,
  onKindFilter,
  zone,
  onZone,
  now,
}: Props) {
  const allSelected = selected.length === 0;

  return (
    <section className="filters" aria-label="Filtres">
      <div className="filters__row">
        <span className="filters__legend">Catégories</span>
        <div className="chips">
          <button
            type="button"
            className={`chip${allSelected ? ' chip--on' : ''}`}
            onClick={onClearSeries}
            aria-pressed={allSelected}
          >
            Toutes
          </button>

          {series.map((s) => {
            const on = selected.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                className={`chip${on ? ' chip--on' : ''}`}
                style={on ? { backgroundColor: s.color, borderColor: s.color } : undefined}
                onClick={() => onToggleSeries(s.id)}
                aria-pressed={on}
                title={s.name}
              >
                <span className="chip__dot" style={{ backgroundColor: s.color }} aria-hidden="true" />
                {s.shortName}
              </button>
            );
          })}
        </div>
      </div>

      <div className="filters__row filters__row--split">
        <div className="filters__group">
          <span className="filters__legend">Sessions</span>
          <div className="segmented" role="group" aria-label="Type de sessions">
            {KIND_FILTERS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`segmented__item${kindFilter === option.id ? ' segmented__item--on' : ''}`}
                onClick={() => onKindFilter(option.id)}
                aria-pressed={kindFilter === option.id}
                title={option.hint}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="filters__group">
          <label className="filters__legend" htmlFor="zone-select">
            Fuseau
          </label>
          <select
            id="zone-select"
            className="select"
            value={zone}
            onChange={(event) => onZone(event.target.value)}
          >
            {zoneOptions().map((z) => (
              <option key={z} value={z}>
                {zoneLabel(z)} ({zoneOffset(z, now)})
                {z === PARIS ? ' — par défaut' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
