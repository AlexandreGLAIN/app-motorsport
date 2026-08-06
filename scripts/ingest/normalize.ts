import type { SessionKind } from '../../src/types.js';

/**
 * Traduction des identifiants de session vers un libellé français.
 *
 * Deux vocabulaires cohabitent : les clés camelCase du jeu de données
 * sportstimes (`fp1`, `sprintQualifying`, `feature`…) et les intitulés anglais
 * en clair des flux ICS (`Race`, `Free Practice 2`, `Day 1`…). Les deux passent
 * par ici pour que l'interface n'ait jamais à connaître la source.
 */
const LABELS: Record<string, string> = {
  // — clés sportstimes —
  fp1: 'Essais libres 1',
  fp2: 'Essais libres 2',
  fp3: 'Essais libres 3',
  practice: 'Essais libres',
  practice1: 'Essais libres 1',
  practice2: 'Essais libres 2',
  practice3: 'Essais libres 3',
  qualifying: 'Qualifications',
  qualifying1: 'Qualifications 1',
  qualifying2: 'Qualifications 2',
  sprintqualifying: 'Qualifications sprint',
  sprintqualifying1: 'Qualifications sprint 1',
  sprintqualifying2: 'Qualifications sprint 2',
  sprint: 'Course sprint',
  sprintrace: 'Course sprint',
  sprint1: 'Course sprint 1',
  sprint2: 'Course sprint 2',
  gp: 'Course',
  race: 'Course',
  race1: 'Course 1',
  race2: 'Course 2',
  feature: 'Course principale',
  featurerace: 'Course principale',
  warmup: 'Warm-up',
  shakedown: 'Shakedown',
  hyperpole: 'Hyperpole',
  // — intitulés ICS en anglais —
  'free practice': 'Essais libres',
  'free practice 1': 'Essais libres 1',
  'free practice 2': 'Essais libres 2',
  'free practice 3': 'Essais libres 3',
  'qualifying practice': 'Qualifications',
  'sprint race': 'Course sprint',
  'sprint qualifying': 'Qualifications sprint',
  'warm up': 'Warm-up',
  'night practice': 'Essais de nuit',
  'test day': 'Journée d’essais',
};

/** Motifs contrôlant la famille de session, testés dans l'ordre. */
const KIND_PATTERNS: Array<[RegExp, SessionKind]> = [
  [/sprint.*qual|qual.*sprint/i, 'qualifying'],
  [/sprint/i, 'sprint'],
  [/qualif|hyperpole|pole/i, 'qualifying'],
  [/practice|essais|fp\d|warm|shakedown/i, 'practice'],
  [/race|course|gp|feature|day\s*\d|journée/i, 'race'],
];

/** Durées de course par catégorie, en minutes. Sert au repère « en direct ». */
const RACE_DURATION: Record<string, number> = {
  f1: 120,
  f2: 60,
  f3: 45,
  'f1-academy': 40,
  motogp: 50,
  fe: 60,
  indycar: 150,
  wec: 360,
  imsa: 160,
  wrc: 600,
};

const BASE_DURATION: Record<SessionKind, number> = {
  practice: 60,
  qualifying: 60,
  sprint: 45,
  race: 120,
  other: 60,
};

/**
 * Formes numérotées ou composées qu'on ne peut pas lister une par une :
 * l'IndyCar va jusqu'à `Practice8`, le WRC jusqu'à `Day 4`.
 */
function translatePattern(text: string): string | undefined {
  const day = text.match(/^day\s*(\d+)$/i);
  if (day) return `Journée ${day[1]}`;

  const leg = text.match(/^(?:leg|stage)\s*(\d+)$/i);
  if (leg) return `Étape ${leg[1]}`;

  const practice = text.match(/^(?:free\s*)?practice\s*(\d+)$/i);
  if (practice) return `Essais libres ${practice[1]}`;

  if (/^final\s*practice$/i.test(text)) return 'Derniers essais libres';
  if (/^(?:open\s*)?test(?:ing)?$/i.test(text)) return 'Essais privés';

  const race = text.match(/^race\s*(\d+)$/i);
  if (race) return `Course ${race[1]}`;

  return undefined;
}

/**
 * Libellé français d'une session à partir de sa clé (sportstimes) ou de son
 * intitulé anglais (ICS). Un identifiant inconnu est rendu lisible plutôt que
 * masqué : mieux vaut afficher « Super Pole » que rien du tout.
 */
export function sessionLabel(raw: string): string {
  const key = raw.trim();
  const direct = LABELS[key.toLowerCase()];
  if (direct) return direct;

  const numbered = translatePattern(key);
  if (numbered) return numbered;

  // camelCase / snake_case inconnu -> « Sprint Shootout »
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

export function sessionKind(raw: string): SessionKind {
  for (const [pattern, kind] of KIND_PATTERNS) {
    if (pattern.test(raw)) return kind;
  }
  return 'other';
}

export function sessionDuration(seriesId: string, kind: SessionKind, eventName: string): number {
  if (kind !== 'race') return BASE_DURATION[kind];
  // Les 24 Heures (Le Mans, Daytona, Spa…) ne rentrent dans aucune moyenne.
  if (/\b24\s*(h|hours|heures)\b/i.test(eventName)) return 24 * 60;
  if (/\b12\s*(h|hours|heures)\b/i.test(eventName)) return 12 * 60;
  if (/\b10\s*(h|hours|heures)\b/i.test(eventName)) return 10 * 60;
  if (/\b8\s*(h|hours|heures)\b/i.test(eventName)) return 8 * 60;
  return RACE_DURATION[seriesId] ?? BASE_DURATION.race;
}

/**
 * Noms de pays en français. Le MotoGP nomme ses manches par pays et en anglais
 * (`Thailand`, `United States`) : sans cette table, l'app afficherait des noms
 * anglais au milieu d'une interface française.
 *
 * Les valeurs non listées ressortent inchangées — les noms de villes
 * (`Melbourne`, `Imola`) et les noms d'épreuve sponsorisés (`Rolex 24 at
 * Daytona`) sont des noms propres et n'ont pas à être traduits.
 */
const COUNTRIES_FR: Record<string, string> = {
  argentina: 'Argentine',
  australia: 'Australie',
  austria: 'Autriche',
  azerbaijan: 'Azerbaïdjan',
  bahrain: 'Bahreïn',
  belgium: 'Belgique',
  brazil: 'Brésil',
  brasil: 'Brésil',
  canada: 'Canada',
  chile: 'Chili',
  china: 'Chine',
  croatia: 'Croatie',
  czechia: 'Tchéquie',
  'czech republic': 'Tchéquie',
  denmark: 'Danemark',
  estonia: 'Estonie',
  finland: 'Finlande',
  france: 'France',
  germany: 'Allemagne',
  'great britain': 'Grande-Bretagne',
  greece: 'Grèce',
  hungary: 'Hongrie',
  india: 'Inde',
  indonesia: 'Indonésie',
  ireland: 'Irlande',
  italy: 'Italie',
  japan: 'Japon',
  kenya: 'Kenya',
  malaysia: 'Malaisie',
  mexico: 'Mexique',
  monaco: 'Monaco',
  netherlands: 'Pays-Bas',
  'new zealand': 'Nouvelle-Zélande',
  norway: 'Norvège',
  paraguay: 'Paraguay',
  poland: 'Pologne',
  portugal: 'Portugal',
  qatar: 'Qatar',
  'san marino': 'Saint-Marin',
  'saudi arabia': 'Arabie saoudite',
  singapore: 'Singapour',
  'south africa': 'Afrique du Sud',
  'south korea': 'Corée du Sud',
  spain: 'Espagne',
  'españa': 'Espagne',
  sweden: 'Suède',
  switzerland: 'Suisse',
  thailand: 'Thaïlande',
  turkey: 'Turquie',
  'united arab emirates': 'Émirats arabes unis',
  'united kingdom': 'Royaume-Uni',
  'united states': 'États-Unis',
  vietnam: 'Viêt Nam',
};

/** Nombres écrits en toutes lettres dans les noms d'épreuves d'endurance. */
const HOUR_WORDS: Record<string, number> = {
  four: 4,
  six: 6,
  eight: 8,
  ten: 10,
  twelve: 12,
  'twenty-four': 24,
};

/** Traduit un nom de lieu s'il s'agit d'un pays connu, sinon le laisse tel quel. */
export function placeName(raw: string): string {
  const trimmed = raw.trim();
  return COUNTRIES_FR[trimmed.toLowerCase()] ?? trimmed;
}

/**
 * Met en forme un nom d'épreuve.
 *
 * Les courses d'endurance s'appellent « 6 Hours of Imola » ou « Mobil 1 Twelve
 * Hours of Sebring » : on en extrait le lieu et la durée pour produire
 * « Imola — 6 h », ce qui retire au passage le préfixe sponsor et donne une
 * ligne homogène dans la liste.
 */
export function eventTitle(raw: string): string {
  const trimmed = raw.trim();

  const endurance = trimmed.match(
    /(?:^|\s)(\d+|four|six|eight|ten|twelve|twenty-four)\s*hours?\s+of\s+(.+)$/i,
  );

  if (endurance) {
    const token = endurance[1].toLowerCase();
    const hours = HOUR_WORDS[token] ?? Number(token);
    const place = placeName(endurance[2]);
    if (Number.isFinite(hours)) return `${place} — ${hours} h`;
  }

  return placeName(trimmed);
}

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    // Retire les diacritiques décomposés par NFD (é -> e + U+0301).
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Identifiant déterministe : deux ingestions successives produisent le même id
 * pour la même session, ce qui rend le `calendar.json` comparable d'un jour sur
 * l'autre (diff lisible dans Git, pas de churn artificiel).
 */
export function sessionId(parts: {
  seriesId: string;
  season: number;
  round: number;
  label: string;
}): string {
  return `${parts.seriesId}-${parts.season}-r${parts.round}-${slugify(parts.label)}`;
}
