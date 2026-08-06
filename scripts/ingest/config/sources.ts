/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  SOURCES DE DONNÉES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Chaque catégorie déclare d'où viennent ses horaires. Ajouter une source =
 * ajouter une entrée ici (et une entrée dans `series.ts` pour l'affichage).
 *
 * Deux familles d'adaptateurs :
 *
 *   `sportstimes` — jeu de données ouvert, horaires à la minute en UTC.
 *                   C'est la source à privilégier quand la catégorie y figure.
 *
 *   `ics`         — flux iCalendar publics, pour les championnats sans données
 *                   structurées (WEC, WRC, IMSA). Ces flux donnent la date mais
 *                   pas toujours l'heure : les sessions concernées ressortent
 *                   avec « horaire à confirmer ».
 *
 * `{year}` est remplacé par la saison au moment de la requête.
 */

export interface SportstimesSource {
  type: 'sportstimes';
  seriesId: string;
  label: string;
  /** Dossier de la catégorie dans le dépôt `sportstimes/f1`. */
  slug: string;
}

export interface IcsSource {
  type: 'ics';
  seriesId: string;
  label: string;
  urlTemplate: string;
  /** Préfixe à retirer du SUMMARY, ex. « WEC » dans « WEC Imola 6h - Race ». */
  prefix: string;
}

export type SourceDef = SportstimesSource | IcsSource;

const ICS_BASE = 'https://bmorganqwe98.github.io/racing-{year}-calendar';

export const SOURCES: SourceDef[] = [
  { type: 'sportstimes', seriesId: 'f1', slug: 'f1', label: 'Formule 1' },
  { type: 'sportstimes', seriesId: 'f2', slug: 'f2', label: 'Formule 2' },
  { type: 'sportstimes', seriesId: 'f3', slug: 'f3', label: 'Formule 3' },
  { type: 'sportstimes', seriesId: 'f1-academy', slug: 'f1-academy', label: 'F1 Academy' },
  { type: 'sportstimes', seriesId: 'motogp', slug: 'motogp', label: 'MotoGP' },
  { type: 'sportstimes', seriesId: 'fe', slug: 'fe', label: 'Formule E' },
  { type: 'sportstimes', seriesId: 'indycar', slug: 'indycar', label: 'IndyCar' },
  { type: 'ics', seriesId: 'wec', urlTemplate: `${ICS_BASE}/wec.ics`, prefix: 'WEC', label: 'WEC' },
  { type: 'ics', seriesId: 'wrc', urlTemplate: `${ICS_BASE}/wrc.ics`, prefix: 'WRC', label: 'WRC' },
  {
    type: 'ics',
    seriesId: 'imsa',
    urlTemplate: `${ICS_BASE}/imsa.ics`,
    prefix: 'IMSA',
    label: 'IMSA',
  },
];
