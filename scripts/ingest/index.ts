import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { CalendarFile, Session, SourceReport } from '../../src/types.js';
import { SERIES } from './config/series.js';
import { SOURCES, type SourceDef } from './config/sources.js';
import { fetchIcsSeason, icsUrl } from './sources/ics.js';
import { fetchSportstimesSeason, sportstimesUrl } from './sources/sportstimes.js';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  PIPELINE D'INGESTION
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Interroge toutes les sources, normalise, et écrit `public/data/calendar.json`.
 * Conçu pour tourner une fois par jour sans surveillance :
 *
 *   • une source en panne ne fait pas échouer la passe ;
 *   • les sessions d'une source en panne sont reprises du fichier précédent,
 *     pour qu'une indisponibilité passagère ne vide jamais le calendrier ;
 *   • le rapport par source est écrit dans le fichier et affiché dans l'app,
 *     pour qu'une source silencieusement morte se remarque.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUTPUT = resolve(ROOT, 'public/data/calendar.json');

/** Saisons interrogées : l'année en cours et la suivante (souvent déjà publiée). */
function targetSeasons(now: Date): number[] {
  const year = now.getUTCFullYear();
  return [year, year + 1];
}

function sourceUrl(source: SourceDef, season: number): string {
  return source.type === 'sportstimes'
    ? sportstimesUrl(source.slug, season)
    : icsUrl(source.urlTemplate, season);
}

async function fetchSource(source: SourceDef, season: number): Promise<Session[] | null> {
  return source.type === 'sportstimes'
    ? fetchSportstimesSeason(source.seriesId, source.slug, season)
    : fetchIcsSeason(source.seriesId, source.urlTemplate, source.prefix, season);
}

/** Lit le calendrier précédent, s'il existe. Sert de filet de sécurité. */
async function readPrevious(): Promise<CalendarFile | null> {
  try {
    return JSON.parse(await readFile(OUTPUT, 'utf8')) as CalendarFile;
  } catch {
    return null;
  }
}

interface SourceOutcome {
  report: SourceReport;
  sessions: Session[];
}

async function ingestSource(
  source: SourceDef,
  seasons: number[],
  previous: CalendarFile | null,
): Promise<SourceOutcome> {
  const collected: Session[] = [];
  const errors: string[] = [];
  let anySeasonFound = false;

  for (const season of seasons) {
    try {
      const sessions = await fetchSource(source, season);
      // `null` = saison absente chez la source, pas une erreur.
      if (sessions === null) continue;
      anySeasonFound = true;
      collected.push(...sessions);
    } catch (err) {
      errors.push(`${season}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const url = sourceUrl(source, seasons[0]);

  // Rien de récupéré ET au moins une erreur -> on reprend l'existant.
  if (collected.length === 0 && errors.length > 0) {
    const carried = (previous?.sessions ?? []).filter((s) => s.seriesId === source.seriesId);
    return {
      report: {
        id: source.seriesId,
        label: source.label,
        url,
        ok: false,
        sessionCount: carried.length,
        error:
          `${errors.join(' | ')}` +
          (carried.length > 0 ? ` — ${carried.length} sessions reprises de la passe précédente` : ''),
      },
      sessions: carried,
    };
  }

  return {
    report: {
      id: source.seriesId,
      label: source.label,
      url,
      ok: errors.length === 0 && anySeasonFound,
      sessionCount: collected.length,
      error: errors.length > 0 ? errors.join(' | ') : undefined,
    },
    sessions: collected,
  };
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  const now = new Date();
  const seasons = targetSeasons(now);
  const previous = await readPrevious();

  console.log(`Ingestion des saisons ${seasons.join(', ')} — ${SOURCES.length} sources\n`);

  // En parallèle : les sources sont indépendantes et hébergées sur des domaines
  // différents, rien ne justifie de les enchaîner.
  const outcomes = await Promise.all(
    SOURCES.map((source) => ingestSource(source, seasons, previous)),
  );

  const sessions: Session[] = [];
  const seen = new Set<string>();

  for (const outcome of outcomes) {
    for (const session of outcome.sessions) {
      // Une même session ne doit apparaître qu'une fois, même si deux sources
      // finissent par se recouvrir.
      if (seen.has(session.id)) continue;
      seen.add(session.id);
      sessions.push(session);
    }
  }

  sessions.sort((a, b) => a.startUtc.localeCompare(b.startUtc) || a.id.localeCompare(b.id));

  const reports = outcomes.map((o) => o.report);

  if (sessions.length === 0) {
    console.error('\nAucune session récupérée : le fichier existant est conservé.');
    for (const r of reports) console.error(`  ✗ ${r.label} — ${r.error ?? 'aucune donnée'}`);
    process.exitCode = 1;
    return;
  }

  const calendar: CalendarFile = {
    generatedAt: now.toISOString(),
    seasons,
    series: SERIES,
    sessions,
    sources: reports,
  };

  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(calendar, null, 2)}\n`, 'utf8');

  for (const r of reports) {
    const mark = r.ok ? '✓' : '✗';
    const detail = r.error ? ` — ${r.error}` : '';
    console.log(`  ${mark} ${r.label.padEnd(12)} ${String(r.sessionCount).padStart(4)} sessions${detail}`);
  }

  const failed = reports.filter((r) => !r.ok).length;
  console.log(
    `\n${sessions.length} sessions écrites dans public/data/calendar.json ` +
      `(${((Date.now() - startedAt) / 1000).toFixed(1)}s, ${failed} source(s) en échec)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
