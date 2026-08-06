import { DateTime } from 'luxon';
import type { Session } from '../types';

/** Fuseau par défaut de l'application. Tous les horaires sont réglés sur Paris. */
export const PARIS = 'Europe/Paris';

/** Instant de début d'une session, exprimé dans le fuseau demandé. */
export function sessionStart(session: Session, zone: string): DateTime {
  return DateTime.fromISO(session.startUtc, { zone: 'utc' }).setZone(zone);
}

/**
 * Jour auquel rattacher une session, au format `yyyy-MM-dd`.
 *
 * Une session sans horaire connu porte une date, pas un instant : la convertir
 * dans un fuseau la ferait basculer d'un jour à l'autre sans raison. On garde
 * donc la date brute telle que la source la publie.
 */
export function dayKey(session: Session, zone: string): string {
  if (session.timeTbd && session.tbdDate) return session.tbdDate;
  return sessionStart(session, zone).toFormat('yyyy-MM-dd');
}

/** Lundi de la semaine contenant `dt` (semaine ISO). */
export function startOfWeek(dt: DateTime): DateTime {
  return dt.startOf('week');
}

/** Les sept clés de jour d'une semaine, du lundi au dimanche. */
export function weekDayKeys(weekStart: DateTime): string[] {
  return Array.from({ length: 7 }, (_, i) => weekStart.plus({ days: i }).toFormat('yyyy-MM-dd'));
}

/** « 3 – 9 août 2026 », en évitant de répéter un mois identique. */
export function formatWeekRange(weekStart: DateTime): string {
  const weekEnd = weekStart.plus({ days: 6 });
  const sameMonth = weekStart.hasSame(weekEnd, 'month');

  return sameMonth
    ? `${weekStart.toFormat('d')} – ${weekEnd.toFormat('d MMMM yyyy')}`
    : `${weekStart.toFormat('d MMM')} – ${weekEnd.toFormat('d MMM yyyy')}`;
}

/** « vendredi 7 août » à partir d'une clé `yyyy-MM-dd`. */
export function formatDayHeading(key: string): string {
  return DateTime.fromISO(key).toFormat('cccc d MMMM');
}

/** « 14:00 » dans le fuseau demandé. */
export function formatTime(session: Session, zone: string): string {
  return sessionStart(session, zone).toFormat('HH:mm');
}

/** Nom lisible d'un fuseau : « Paris », « Los Angeles », « UTC ». */
export function zoneLabel(zone: string): string {
  if (zone === 'UTC') return 'UTC';
  return zone.split('/').pop()?.replace(/_/g, ' ') ?? zone;
}

/**
 * Décalage affiché à côté du fuseau, ex. « UTC+2 ». Permet de comprendre d'un
 * coup d'œil de combien un horaire a bougé par rapport à Paris.
 */
export function zoneOffset(zone: string, at: DateTime): string {
  const offset = at.setZone(zone).offset / 60;
  if (offset === 0) return 'UTC';
  const sign = offset > 0 ? '+' : '−';
  const abs = Math.abs(offset);
  return `UTC${sign}${Number.isInteger(abs) ? abs : abs.toFixed(1)}`;
}

/**
 * « dans 3 j », « dans 2 h 15 », « dans 12 min ».
 *
 * L'unité s'adapte à l'échéance : à trois jours, les minutes sont du bruit ;
 * à dix minutes, elles sont toute l'information.
 */
export function formatCountdown(target: DateTime, now: DateTime): string {
  const diff = target.diff(now, ['days', 'hours', 'minutes']).toObject();
  const days = Math.floor(diff.days ?? 0);
  const hours = Math.floor(diff.hours ?? 0);
  const minutes = Math.floor(diff.minutes ?? 0);

  if (days >= 1) return hours > 0 ? `dans ${days} j ${hours} h` : `dans ${days} j`;
  if (hours >= 1) return `dans ${hours} h ${String(minutes).padStart(2, '0')}`;
  if (minutes >= 1) return `dans ${minutes} min`;
  return 'imminent';
}

/**
 * Une session est « en direct » entre son début et sa fin estimée.
 *
 * La durée est une estimation par catégorie, pas une donnée officielle : elle
 * sert à afficher un repère, jamais à annoncer une heure de fin.
 */
export function isLive(session: Session, now: DateTime): boolean {
  if (session.timeTbd) return false;
  const start = DateTime.fromISO(session.startUtc, { zone: 'utc' });
  return now >= start && now < start.plus({ minutes: session.durationMin });
}

/** Session terminée (selon la même estimation de durée). */
export function isPast(session: Session, now: DateTime): boolean {
  const start = DateTime.fromISO(session.startUtc, { zone: 'utc' });
  const end = session.timeTbd ? start.endOf('day') : start.plus({ minutes: session.durationMin });
  return now >= end;
}
