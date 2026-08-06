import { DateTime } from 'luxon';
import type { Series, Session } from '../types';
import { formatTime, isLive, isPast } from '../lib/time';
import { BroadcastBadges } from './BroadcastBadges';

interface Props {
  session: Session;
  series: Series;
  zone: string;
  now: DateTime;
}

export function SessionRow({ session, series, zone, now }: Props) {
  const live = isLive(session, now);
  const past = !live && isPast(session, now);

  const classes = ['session'];
  if (live) classes.push('session--live');
  if (past) classes.push('session--past');
  if (session.kind === 'race') classes.push('session--race');

  return (
    <article className={classes.join(' ')} style={{ ['--series-color' as string]: series.color }}>
      <div className="session__time">
        {session.timeTbd ? (
          <span className="session__tbd" title="La source ne publie pas encore l'horaire">
            horaire
            <br />à confirmer
          </span>
        ) : (
          <time dateTime={session.startUtc}>{formatTime(session, zone)}</time>
        )}
        {live && <span className="session__live">EN DIRECT</span>}
      </div>

      <div className="session__body">
        <div className="session__heading">
          <span className="series-pill" style={{ backgroundColor: series.color }}>
            {series.shortName}
          </span>
          <span className="session__event">{session.eventName}</span>
          <span className="session__round">Manche {session.round}</span>
        </div>

        <h3 className="session__label">{session.label}</h3>

        <BroadcastBadges broadcasts={series.broadcasts} />
      </div>
    </article>
  );
}
