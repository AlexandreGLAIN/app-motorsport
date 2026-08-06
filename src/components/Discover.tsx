import type { Series, Session } from '../types';
import { sessionStart } from '../lib/time';

interface Props {
  series: Series;
  session: Session;
  zone: string;
  onFollow: (seriesId: string) => void;
}

/**
 * Second objectif énoncé dans la vidéo : donner envie d'aller regarder d'autres
 * catégories. On met en avant une course d'une catégorie que l'utilisateur ne
 * suit pas encore, avec le bouton pour l'ajouter à sa sélection.
 */
export function Discover({ series, session, zone, onFollow }: Props) {
  const start = sessionStart(session, zone);

  return (
    <section className="discover" style={{ ['--series-color' as string]: series.color }}>
      <div className="discover__text">
        <span className="discover__kicker">À découvrir</span>
        <h2 className="discover__title">
          {series.name} <span className="discover__sep">·</span> {session.eventName}
        </h2>
        <p className="discover__when">
          {session.label} — {start.toFormat('cccc d MMMM')}
          {!session.timeTbd && ` à ${start.toFormat('HH:mm')}`}
          {series.broadcasts[0] && ` · ${series.broadcasts[0].name}`}
        </p>
      </div>

      <button type="button" className="discover__cta" onClick={() => onFollow(series.id)}>
        Suivre {series.shortName}
      </button>
    </section>
  );
}
