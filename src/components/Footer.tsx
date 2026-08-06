import { DateTime } from 'luxon';
import type { SourceReport } from '../types';

interface Props {
  generatedAt: string;
  sources: SourceReport[];
  sessionCount: number;
}

/**
 * Transparence sur la fraîcheur et la santé des données.
 *
 * Un agrégateur qui se met à jour tout seul finit par se tromper tout seul : la
 * date de dernière mise à jour et l'état des sources sont affichés pour qu'une
 * panne se voie, au lieu d'être masquée par un calendrier resté figé.
 */
export function Footer({ generatedAt, sources, sessionCount }: Props) {
  const generated = DateTime.fromISO(generatedAt).setZone('Europe/Paris');
  const failed = sources.filter((s) => !s.ok);

  return (
    <footer className="footer">
      <p className="footer__line">
        <strong>{sessionCount}</strong> sessions · mise à jour le{' '}
        <time dateTime={generatedAt}>{generated.toFormat("d MMMM yyyy 'à' HH:mm")}</time> (Paris) ·
        actualisation quotidienne
      </p>

      {failed.length > 0 && (
        <p className="footer__warn">
          ⚠ {failed.length} source(s) indisponible(s) lors de la dernière passe :{' '}
          {failed.map((s) => s.label).join(', ')}. Les horaires affichés pour ces catégories
          proviennent de la passe précédente.
        </p>
      )}

      <details className="footer__details">
        <summary>Sources et diffusion</summary>
        <ul className="footer__sources">
          {sources.map((s) => (
            <li key={s.id}>
              <span className={s.ok ? 'dot dot--ok' : 'dot dot--ko'} aria-hidden="true" />
              <a href={s.url} target="_blank" rel="noreferrer noopener">
                {s.label}
              </a>{' '}
              — {s.sessionCount} sessions
            </li>
          ))}
        </ul>
        <p className="footer__note">
          Horaires agrégés depuis des jeux de données et calendriers publics. Les informations de
          diffusion concernent la France et sont vérifiées manuellement en début de saison : celles
          marquées « à confirmer » n’ont pas été revalidées pour la saison en cours. Les droits TV
          changent, vérifiez auprès du diffuseur avant de vous fier à un horaire.
        </p>
      </details>
    </footer>
  );
}
