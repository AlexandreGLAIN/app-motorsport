import type { Session } from '../../../src/types.js';
import { fetchText, NotFoundError } from '../http.js';
import { eventTitle, sessionDuration, sessionId, sessionKind, sessionLabel } from '../normalize.js';

/**
 * Adaptateur iCalendar générique — utilisé pour le WEC, le WRC et l'IMSA, qui
 * ne publient pas de JSON exploitable.
 *
 * Ces flux donnent la date de chaque session mais pas toujours l'heure : les
 * évènements « journée entière » sont marqués `timeTbd`, et l'interface affiche
 * « horaire à confirmer » plutôt que d'inventer une heure de départ.
 *
 * Le format iCalendar utilisé par ces flux est simple (VEVENT plats, pas de
 * récurrence, pas de VTIMEZONE), d'où cet analyseur minimal plutôt qu'une
 * dépendance lourde : moins de surface, et un comportement qu'on maîtrise.
 */

export function icsUrl(template: string, season: number): string {
  return template.replace(/\{year\}/g, String(season));
}

/** Une propriété iCalendar : nom, paramètres, valeur. */
interface IcsProperty {
  name: string;
  params: Record<string, string>;
  value: string;
}

/**
 * Recolle les lignes pliées. iCalendar coupe à 75 octets et préfixe la suite
 * d'une espace ou d'une tabulation ; sans ce traitement les descriptions
 * ressortent tronquées en plein milieu d'un mot.
 */
function unfold(text: string): string[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const out: string[] = [];

  for (const line of lines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }

  return out;
}

function parseProperty(line: string): IcsProperty | null {
  const colon = line.indexOf(':');
  if (colon === -1) return null;

  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const [name, ...paramParts] = head.split(';');

  const params: Record<string, string> = {};
  for (const part of paramParts) {
    const eq = part.indexOf('=');
    if (eq > 0) params[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1);
  }

  return { name: name.toUpperCase(), params, value };
}

/** Décode les séquences échappées du format (\n, \, \; \\). */
function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

interface ParsedDate {
  /** Instant UTC. Pour une date sans heure : midi UTC (voir `dateOnly`). */
  date: Date;
  /** `true` si la source ne donne qu'une date, sans heure. */
  dateOnly: boolean;
  /** Date brute YYYY-MM-DD, conservée telle quelle quand `dateOnly`. */
  isoDate: string;
}

function parseIcsDate(prop: IcsProperty): ParsedDate | null {
  const raw = prop.value.trim();

  // Date seule : 20260419
  const dateOnly = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly || prop.params.VALUE === 'DATE') {
    const m = dateOnly ?? raw.match(/^(\d{4})(\d{2})(\d{2})/);
    if (!m) return null;
    const isoDate = `${m[1]}-${m[2]}-${m[3]}`;
    // Midi UTC : un point d'ancrage qui ne bascule pas de jour, quel que soit
    // le fuseau d'affichage. Le jour réel reste porté par `isoDate`.
    return { date: new Date(`${isoDate}T12:00:00Z`), dateOnly: true, isoDate };
  }

  // Date-heure : 20260419T130000Z (ou sans Z = heure locale du flux, traitée en UTC)
  const dt = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!dt) return null;

  const iso = `${dt[1]}-${dt[2]}-${dt[3]}T${dt[4]}:${dt[5]}:${dt[6]}Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  return { date, dateOnly: false, isoDate: `${dt[1]}-${dt[2]}-${dt[3]}` };
}

/** Découpe le texte en blocs VEVENT, chacun réduit à un dictionnaire de propriétés. */
function parseEvents(text: string): IcsProperty[][] {
  const events: IcsProperty[][] = [];
  let current: IcsProperty[] | null = null;

  for (const line of unfold(text)) {
    if (line === 'BEGIN:VEVENT') {
      current = [];
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current) events.push(current);
      current = null;
      continue;
    }
    if (!current) continue;

    const prop = parseProperty(line);
    if (prop) current.push(prop);
  }

  return events;
}

function firstValue(props: IcsProperty[], name: string): IcsProperty | undefined {
  return props.find((p) => p.name === name);
}

/**
 * Extrait le nom d'épreuve et le numéro de manche depuis la DESCRIPTION, qui
 * contient une ligne du type « Round 1: 6 Hours of Imola ». C'est plus propre
 * que le SUMMARY, souvent abrégé (« WEC Imola 6h »).
 */
function parseRoundFromDescription(description: string): { round?: number; event?: string } {
  const m = description.match(/Round\s+(\d+)\s*:\s*([^\n]+)/i);
  if (!m) return {};
  return { round: Number(m[1]), event: m[2].trim() };
}

/**
 * Isole l'intitulé de session du SUMMARY : « WEC Imola 6h - Race » -> « Race ».
 * Le séparateur est le dernier « - » entouré d'espaces, car les noms d'épreuve
 * en contiennent parfois (« Spa-Francorchamps »).
 */
function parseSummary(summary: string, seriesPrefix: string): { event: string; session: string } {
  let text = summary.trim();

  const prefix = new RegExp(`^${seriesPrefix}\\s+`, 'i');
  text = text.replace(prefix, '');

  const sep = text.lastIndexOf(' - ');
  if (sep === -1) return { event: text, session: 'Course' };

  return { event: text.slice(0, sep).trim(), session: text.slice(sep + 3).trim() };
}

export async function fetchIcsSeason(
  seriesId: string,
  urlTemplate: string,
  seriesPrefix: string,
  season: number,
): Promise<Session[] | null> {
  let text: string;
  try {
    text = await fetchText(icsUrl(urlTemplate, season));
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }

  // Une page d'erreur HTML renvoyée en 200 ne doit pas passer pour un calendrier.
  if (!text.includes('BEGIN:VCALENDAR')) {
    throw new Error(`Réponse non-iCalendar pour ${seriesId} (${icsUrl(urlTemplate, season)})`);
  }

  const sessions: Session[] = [];
  const seenIds = new Set<string>();

  for (const [index, props] of parseEvents(text).entries()) {
    const summaryProp = firstValue(props, 'SUMMARY');
    const startProp = firstValue(props, 'DTSTART');
    if (!summaryProp || !startProp) continue;

    const parsedDate = parseIcsDate(startProp);
    if (!parsedDate) continue;

    const description = unescapeText(firstValue(props, 'DESCRIPTION')?.value ?? '');
    const summary = unescapeText(summaryProp.value);

    const fromSummary = parseSummary(summary, seriesPrefix);
    const fromDescription = parseRoundFromDescription(description);

    const round = fromDescription.round ?? index + 1;
    const eventName = eventTitle(fromDescription.event ?? fromSummary.event);
    const label = sessionLabel(fromSummary.session);
    const kind = sessionKind(fromSummary.session);
    const location = unescapeText(firstValue(props, 'LOCATION')?.value ?? '') || eventName;

    // Le WRC répète « Day 1 » d'un rallye à l'autre : l'id inclut la manche,
    // mais deux sessions homonymes dans la même manche resteraient en conflit.
    let id = sessionId({ seriesId, season, round, label });
    if (seenIds.has(id)) id = `${id}-${index}`;
    seenIds.add(id);

    sessions.push({
      id,
      seriesId,
      round,
      eventName,
      location,
      label,
      kind,
      startUtc: parsedDate.date.toISOString(),
      durationMin: sessionDuration(seriesId, kind, eventName),
      timeTbd: parsedDate.dateOnly,
      ...(parsedDate.dateOnly ? { tbdDate: parsedDate.isoDate } : {}),
      source: `ics:${seriesId}`,
    });
  }

  return sessions;
}
