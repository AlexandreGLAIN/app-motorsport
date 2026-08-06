const USER_AGENT =
  'app-motorsport-calendar/1.0 (+https://github.com/; agrégateur de calendriers sport auto, usage personnel)';

export class NotFoundError extends Error {}

/**
 * `fetch` avec en-tête d'identification, délai maximal et quelques tentatives.
 *
 * Un 404 remonte comme `NotFoundError` : c'est un cas normal (une saison qui
 * n'existe pas encore côté source), pas une panne, et l'appelant l'ignore
 * silencieusement au lieu de faire échouer toute l'ingestion.
 */
export async function fetchText(
  url: string,
  { attempts = 3, timeoutMs = 20_000 }: { attempts?: number; timeoutMs?: number } = {},
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        headers: { 'user-agent': USER_AGENT, accept: '*/*' },
        signal: controller.signal,
      });

      if (res.status === 404) throw new NotFoundError(`404 ${url}`);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);

      return await res.text();
    } catch (err) {
      if (err instanceof NotFoundError) throw err;
      lastError = err;
      // Petite temporisation croissante : on ne martèle pas la source.
      if (attempt < attempts) await sleep(500 * attempt);
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function fetchJson<T>(url: string): Promise<T> {
  return JSON.parse(await fetchText(url)) as T;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
