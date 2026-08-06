import type { Broadcast } from '../types';

/**
 * Où regarder la session, et à quel prix.
 *
 * Deux informations comptent autant que le nom de la chaîne : faut-il un
 * abonnement, et l'information est-elle sûre. Les droits TV se renégocient
 * chaque saison ; une diffusion non confirmée est signalée plutôt que présentée
 * comme un fait.
 */
export function BroadcastBadges({ broadcasts }: { broadcasts: Broadcast[] }) {
  if (broadcasts.length === 0) {
    return <span className="broadcast broadcast--unknown">Diffusion inconnue</span>;
  }

  return (
    <div className="broadcasts">
      {broadcasts.map((broadcast) => {
        const unsure = broadcast.confidence !== 'high';

        const badge = (
          <>
            <span aria-hidden="true">{broadcast.kind === 'tv' ? '📺' : '▶️'}</span>
            <span className="broadcast__name">{broadcast.name}</span>
            {broadcast.subscription ? (
              <span className="broadcast__tag" title="Abonnement payant nécessaire">
                abo
              </span>
            ) : (
              <span className="broadcast__tag broadcast__tag--free" title="Accès gratuit">
                gratuit
              </span>
            )}
            {unsure && (
              <span
                className="broadcast__tag broadcast__tag--unsure"
                title={
                  broadcast.confidence === 'medium'
                    ? 'Diffusion probable, non confirmée pour cette saison'
                    : 'Diffusion à vérifier'
                }
              >
                à confirmer
              </span>
            )}
          </>
        );

        const className = `broadcast${unsure ? ' broadcast--unsure' : ''}`;

        return broadcast.url ? (
          <a
            key={broadcast.name}
            className={className}
            href={broadcast.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            {badge}
          </a>
        ) : (
          <span key={broadcast.name} className={className}>
            {badge}
          </span>
        );
      })}
    </div>
  );
}
