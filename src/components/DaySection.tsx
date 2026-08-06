import type { DateTime } from 'luxon';
import type { Series, Session } from '../types';
import { formatDayHeading } from '../lib/time';
import { SessionRow } from './SessionRow';

interface Props {
  dayKey: string;
  sessions: Session[];
  seriesById: Map<string, Series>;
  zone: string;
  now: DateTime;
  isToday: boolean;
}

export function DaySection({ dayKey, sessions, seriesById, zone, now, isToday }: Props) {
  return (
    <section className={`day${isToday ? ' day--today' : ''}`}>
      <h2 className="day__heading">
        <span className="day__name">{formatDayHeading(dayKey)}</span>
        {isToday && <span className="day__badge">aujourd’hui</span>}
        <span className="day__count">
          {sessions.length} session{sessions.length > 1 ? 's' : ''}
        </span>
      </h2>

      <div className="day__list">
        {sessions.map((session) => {
          const series = seriesById.get(session.seriesId);
          // Une session dont la catégorie a disparu du catalogue ne doit pas
          // faire planter la page : on la saute silencieusement.
          if (!series) return null;

          return (
            <SessionRow
              key={session.id}
              session={session}
              series={series}
              zone={zone}
              now={now}
            />
          );
        })}
      </div>
    </section>
  );
}
