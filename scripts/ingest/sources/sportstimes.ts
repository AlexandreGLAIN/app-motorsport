import type { Session } from '../../../src/types.js';
import { fetchJson, NotFoundError } from '../http.js';
import { eventTitle, sessionDuration, sessionId, sessionKind, sessionLabel } from '../normalize.js';

/**
 * Adaptateur pour le jeu de données ouvert `sportstimes/f1` (licence MIT).
 *
 * C'est la meilleure source disponible : horaires à la minute près, déjà en UTC,
 * un fichier JSON par catégorie et par saison, mis à jour par la communauté.
 * Couvre F1, F2, F3, F1 Academy, Formule E, IndyCar et MotoGP.
 */

const BASE = 'https://raw.githubusercontent.com/sportstimes/f1/main/_db';

/** Forme d'une manche telle que publiée par la source. */
interface RawRace {
  name?: string;
  location?: string;
  round?: number;
  slug?: string;
  /** Clé de session -> date ISO en UTC. */
  sessions?: Record<string, string>;
  /** Certaines manches sont annoncées avant que le calendrier soit ferme. */
  tbc?: boolean;
  canceled?: boolean;
}

interface RawSeason {
  races?: RawRace[];
}

export function sportstimesUrl(slug: string, season: number): string {
  return `${BASE}/${slug}/${season}.json`;
}

/**
 * Récupère une saison. Renvoie `null` si la saison n'est pas (encore) publiée —
 * c'est attendu quand on demande l'année suivante en début d'année.
 */
export async function fetchSportstimesSeason(
  seriesId: string,
  slug: string,
  season: number,
): Promise<Session[] | null> {
  let raw: RawSeason;
  try {
    raw = await fetchJson<RawSeason>(sportstimesUrl(slug, season));
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }

  const sessions: Session[] = [];

  for (const [index, race] of (raw.races ?? []).entries()) {
    if (race.canceled) continue;

    const round = race.round ?? index + 1;
    // `location` est renseigné pour la plupart des catégories (ville ou pays) ;
    // l'IndyCar le laisse vide et ne fournit que le nom commercial de l'épreuve.
    const eventName = eventTitle(race.location?.trim() || race.name?.trim() || `Manche ${round}`);

    for (const [key, iso] of Object.entries(race.sessions ?? {})) {
      const start = new Date(iso);
      // Une date invalide est écartée plutôt que propagée jusqu'à l'affichage.
      if (Number.isNaN(start.getTime())) continue;

      const label = sessionLabel(key);
      const kind = sessionKind(key);

      sessions.push({
        id: sessionId({ seriesId, season, round, label }),
        seriesId,
        round,
        eventName,
        location: race.location?.trim() || eventName,
        label,
        kind,
        startUtc: start.toISOString(),
        durationMin: sessionDuration(seriesId, kind, eventName),
        timeTbd: false,
        source: `sportstimes:${slug}`,
      });
    }
  }

  return sessions;
}
