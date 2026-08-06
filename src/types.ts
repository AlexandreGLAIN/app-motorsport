/**
 * Modèle de données partagé entre le pipeline d'ingestion (scripts/ingest)
 * et l'interface (src). Une seule définition, aucune divergence possible.
 */

/** Famille de session, utilisée pour le filtrage et le style. */
export type SessionKind = 'race' | 'sprint' | 'qualifying' | 'practice' | 'other';

/** Discipline, pour regrouper les catégories dans les filtres. */
export type Discipline = 'monoplace' | 'endurance' | 'moto' | 'rallye' | 'tout-terrain';

/** Niveau de fiabilité d'une information de diffusion. */
export type Confidence = 'high' | 'medium' | 'unverified';

/** Où regarder une session, en France. */
export interface Broadcast {
  /** Nom affiché, ex. « Canal+ », « HBO Max ». */
  name: string;
  /** Chaîne TV linéaire ou plateforme de streaming. */
  kind: 'tv' | 'streaming';
  /** Un abonnement payant est-il nécessaire ? */
  subscription: boolean;
  /** Page officielle de la chaîne / plateforme. */
  url?: string;
  /**
   * Les droits TV changent de saison en saison. `high` = droits confirmés
   * pour la saison en cours, `medium` = très probable, `unverified` = à vérifier.
   * L'interface affiche un avertissement en dessous de `high`.
   */
  confidence: Confidence;
}

/** Une catégorie / championnat. */
export interface Series {
  /** Identifiant stable, ex. « f1 », « motogp ». */
  id: string;
  /** Nom complet en français, ex. « Formule 1 ». */
  name: string;
  /** Nom court pour les pastilles, ex. « F1 ». */
  shortName: string;
  discipline: Discipline;
  /** Couleur d'accent de la catégorie (hex). */
  color: string;
  /** Ordre d'affichage (plus petit = plus haut). */
  priority: number;
  /** Diffusion en France pour cette catégorie. */
  broadcasts: Broadcast[];
}

/** Une session : essais, qualifs, sprint ou course. */
export interface Session {
  /** Identifiant stable et déterministe. */
  id: string;
  seriesId: string;
  /** Numéro de manche dans la saison. */
  round: number;
  /** Nom de l'épreuve, ex. « Grand Prix d'Australie ». */
  eventName: string;
  /** Circuit / ville. */
  location: string;
  /** Libellé de la session en français, ex. « Essais libres 1 ». */
  label: string;
  kind: SessionKind;
  /** Début en UTC, format ISO 8601. Toujours présent. */
  startUtc: string;
  /**
   * Durée estimée en minutes, utilisée uniquement pour détecter « en direct ».
   * Ce n'est pas une donnée officielle.
   */
  durationMin: number;
  /**
   * `true` quand la source ne donne que la date, sans horaire précis
   * (cas du WEC, du WRC et de l'IMSA). L'interface affiche « horaire à confirmer ».
   */
  timeTbd: boolean;
  /**
   * Date de l'épreuve (YYYY-MM-DD) quand `timeTbd` vaut `true`. Sert à ranger la
   * session dans le bon jour sans dépendre du fuseau d'affichage — une date sans
   * heure n'a pas de fuseau, la convertir en produirait un faux décalage.
   */
  tbdDate?: string;
  /** Identifiant de la source d'où vient la session. */
  source: string;
}

/** Compte-rendu d'une source après une passe d'ingestion. */
export interface SourceReport {
  id: string;
  label: string;
  url: string;
  ok: boolean;
  sessionCount: number;
  /** Message d'erreur si la source a échoué. */
  error?: string;
}

/** Le fichier généré, servi tel quel au navigateur. */
export interface CalendarFile {
  /** Date de génération, ISO 8601 UTC. */
  generatedAt: string;
  /** Saisons couvertes, ex. [2026, 2027]. */
  seasons: number[];
  series: Series[];
  /** Toutes les sessions, triées par date croissante. */
  sessions: Session[];
  sources: SourceReport[];
}
