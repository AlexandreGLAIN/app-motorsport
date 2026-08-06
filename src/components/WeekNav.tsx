import type { DateTime } from 'luxon';
import { formatWeekRange } from '../lib/time';

interface Props {
  weekStart: DateTime;
  /** Décalage en semaines par rapport à la semaine courante. */
  offset: number;
  onChange: (offset: number) => void;
}

export function WeekNav({ weekStart, offset, onChange }: Props) {
  const title = formatWeekRange(weekStart);

  const subtitle =
    offset === 0
      ? 'Cette semaine'
      : offset === 1
        ? 'Semaine prochaine'
        : offset === -1
          ? 'Semaine dernière'
          : offset > 0
            ? `Dans ${offset} semaines`
            : `Il y a ${Math.abs(offset)} semaines`;

  return (
    <nav className="weeknav" aria-label="Navigation par semaine">
      <button
        type="button"
        className="weeknav__arrow"
        onClick={() => onChange(offset - 1)}
        aria-label="Semaine précédente"
      >
        ‹
      </button>

      <div className="weeknav__label">
        <span className="weeknav__range">{title}</span>
        <span className="weeknav__sub">{subtitle}</span>
      </div>

      <button
        type="button"
        className="weeknav__arrow"
        onClick={() => onChange(offset + 1)}
        aria-label="Semaine suivante"
      >
        ›
      </button>

      {offset !== 0 && (
        <button type="button" className="weeknav__today" onClick={() => onChange(0)}>
          Aujourd’hui
        </button>
      )}
    </nav>
  );
}
