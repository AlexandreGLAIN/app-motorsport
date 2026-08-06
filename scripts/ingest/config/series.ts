import type { Series } from '../../../src/types.js';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  CATALOGUE DES CATÉGORIES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * C'est le seul fichier à toucher pour ajouter/retirer une catégorie ou pour
 * corriger une info de diffusion en début de saison.
 *
 * À propos de `confidence` sur les diffusions : les droits TV se renégocient
 * régulièrement. Une valeur autre que `high` fait afficher « à confirmer »
 * dans l'interface — mieux vaut une info honnêtement datée qu'une info fausse
 * affichée avec assurance.
 *
 * Droits vérifiés pour la saison 2026 (France) :
 *   • F1        → Canal+ (contrat en cours)
 *   • MotoGP    → Canal+ (prolongation six ans annoncée)
 *   • WRC       → Canal+ (prolongation huit ans, jusqu'en 2030)
 *   • WEC       → Eurosport / HBO Max (Warner Bros. Discovery, jusqu'en 2030)
 *                 + FIA WEC+ (plateforme officielle du championnat)
 * Les autres catégories sont marquées `medium` ou `unverified` : à confirmer
 * avant chaque saison.
 */

const CANAL: Series['broadcasts'][number] = {
  name: 'Canal+',
  kind: 'tv',
  subscription: true,
  url: 'https://www.canalplus.com/sport/',
  confidence: 'high',
};

/** Même diffuseur, mais droits non renégociés/confirmés pour la catégorie. */
const canalAt = (confidence: 'medium' | 'unverified'): Series['broadcasts'][number] => ({
  ...CANAL,
  confidence,
});

export const SERIES: Series[] = [
  {
    id: 'f1',
    name: 'Formule 1',
    shortName: 'F1',
    discipline: 'monoplace',
    color: '#e10600',
    priority: 1,
    broadcasts: [CANAL],
  },
  {
    id: 'f2',
    name: 'Formule 2',
    shortName: 'F2',
    discipline: 'monoplace',
    color: '#2f80ed',
    priority: 2,
    // Diffusée dans le cadre des week-ends F1, généralement sur les antennes Canal+.
    broadcasts: [canalAt('medium')],
  },
  {
    id: 'f3',
    name: 'Formule 3',
    shortName: 'F3',
    discipline: 'monoplace',
    color: '#9b51e0',
    priority: 3,
    broadcasts: [canalAt('medium')],
  },
  {
    id: 'f1-academy',
    name: 'F1 Academy',
    shortName: 'F1A',
    discipline: 'monoplace',
    color: '#ff5fa2',
    priority: 4,
    broadcasts: [
      canalAt('unverified'),
      {
        name: 'YouTube F1 Academy',
        kind: 'streaming',
        subscription: false,
        url: 'https://www.youtube.com/@F1Academy',
        confidence: 'medium',
      },
    ],
  },
  {
    id: 'motogp',
    name: 'MotoGP',
    shortName: 'MotoGP',
    discipline: 'moto',
    color: '#ff8a00',
    priority: 5,
    broadcasts: [
      CANAL,
      {
        name: 'MotoGP VideoPass',
        kind: 'streaming',
        subscription: true,
        url: 'https://www.motogp.com/en/videopass',
        confidence: 'high',
      },
    ],
  },
  {
    id: 'wec',
    name: "Championnat du monde d'endurance",
    shortName: 'WEC',
    discipline: 'endurance',
    color: '#00b894',
    priority: 6,
    broadcasts: [
      {
        name: 'Eurosport',
        kind: 'tv',
        subscription: true,
        url: 'https://www.eurosport.fr/',
        confidence: 'high',
      },
      {
        name: 'HBO Max',
        kind: 'streaming',
        subscription: true,
        url: 'https://www.hbomax.com/',
        confidence: 'high',
      },
      {
        name: 'FIA WEC+',
        kind: 'streaming',
        subscription: true,
        url: 'https://www.fiawec.com/',
        confidence: 'high',
      },
    ],
  },
  {
    id: 'wrc',
    name: 'Championnat du monde des rallyes',
    shortName: 'WRC',
    discipline: 'rallye',
    color: '#f2c94c',
    priority: 7,
    broadcasts: [
      CANAL,
      {
        name: 'WRC+ All Live',
        kind: 'streaming',
        subscription: true,
        url: 'https://www.wrc.com/',
        confidence: 'high',
      },
    ],
  },
  {
    id: 'fe',
    name: 'Formule E',
    shortName: 'FE',
    discipline: 'monoplace',
    color: '#00c2ff',
    priority: 8,
    broadcasts: [
      canalAt('unverified'),
      {
        name: 'Formula E (YouTube)',
        kind: 'streaming',
        subscription: false,
        url: 'https://www.youtube.com/@fiaformulae',
        confidence: 'medium',
      },
    ],
  },
  {
    id: 'indycar',
    name: 'IndyCar',
    shortName: 'IndyCar',
    discipline: 'monoplace',
    color: '#4d61ff',
    priority: 9,
    broadcasts: [canalAt('unverified')],
  },
  {
    id: 'imsa',
    name: 'IMSA SportsCar',
    shortName: 'IMSA',
    discipline: 'endurance',
    color: '#a3e635',
    priority: 10,
    broadcasts: [
      {
        name: 'IMSA TV',
        kind: 'streaming',
        subscription: false,
        url: 'https://www.imsa.com/tvlive/',
        confidence: 'unverified',
      },
    ],
  },
];

export const SERIES_BY_ID = new Map(SERIES.map((s) => [s.id, s]));
