import type { Session, SessionKind } from '../types';

/**
 * Filtre par type de session.
 *
 * Un week-end de course, c'est une dizaine de sessions dont beaucoup d'essais
 * libres. Ceux qui ne veulent que l'essentiel doivent pouvoir le dire en un clic.
 */
export type KindFilter = 'all' | 'competitive' | 'races';

const KIND_SETS: Record<KindFilter, SessionKind[] | null> = {
  all: null,
  competitive: ['race', 'sprint', 'qualifying'],
  races: ['race', 'sprint'],
};

export const KIND_FILTERS: Array<{ id: KindFilter; label: string; hint: string }> = [
  { id: 'all', label: 'Tout', hint: 'Essais, qualifs, sprints et courses' },
  { id: 'competitive', label: 'Qualifs & courses', hint: 'Sans les essais libres' },
  { id: 'races', label: 'Courses', hint: 'Courses et sprints uniquement' },
];

export function matchesKind(session: Session, filter: KindFilter): boolean {
  const allowed = KIND_SETS[filter];
  return allowed === null || allowed.includes(session.kind);
}

/**
 * Applique les deux filtres. Une sélection de catégories vide vaut « toutes » :
 * l'utilisateur qui décoche tout veut voir le calendrier complet, pas une page
 * blanche.
 */
export function filterSessions(
  sessions: Session[],
  selectedSeries: string[],
  kindFilter: KindFilter,
): Session[] {
  const all = selectedSeries.length === 0;
  return sessions.filter(
    (s) => (all || selectedSeries.includes(s.seriesId)) && matchesKind(s, kindFilter),
  );
}
