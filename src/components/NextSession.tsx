import type { DateTime } from 'luxon';
import type { Series, Session } from '../types';
import { formatCountdown, formatTime, isLive, sessionStart } from '../lib/time';
import { BroadcastBadges } from './BroadcastBadges';

interface Props {
  session: Session;
  series: Series;
  zone: string;
  now: DateTime;
}

/**
 * Le bandeau du haut répond à la question posée dans la vidéo — « quand ? » et
 * « comment ? » — sans que l'utilisateur ait à chercher dans la grille.
 */
export function NextSession({ session, series, zone, now }: Props) {
  const live = isLive(session, now);
  const start = sessionStart(session, zone);

  return (
    <section
      className={`next${live ? ' next--live' : ''}`}
      style={{ ['--series-color' as string]: series.color }}
      aria-label={live ? 'Session en direct' : 'Prochaine session'}
    >
      <div className="next__top">
        <span className="next__kicker">{live ? '● En direct' : 'Prochaine session'}</span>
        {!live && <span className="next__countdown">{formatCountdown(start, now)}</span>}
      </div>

      <div className="next__main">
        <span className="series-pill series-pill--lg" style={{ backgroundColor: series.color }}>
          {series.shortName}
        </span>
        <div>
          <h2 className="next__title">
            {session.label} <span className="next__sep">·</span> {session.eventName}
          </h2>
          <p className="next__when">
            {session.timeTbd ? (
              <>
                {start.toFormat('cccc d MMMM')} <span className="next__tbd">horaire à confirmer</span>
              </>
            ) : (
              <>
                {start.toFormat('cccc d MMMM')} à {formatTime(session, zone)}
              </>
            )}
          </p>
        </div>
      </div>

      <BroadcastBadges broadcasts={series.broadcasts} />
    </section>
  );
}
