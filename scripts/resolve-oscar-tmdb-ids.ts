/**
 * One-time script to resolve IMDb IDs → TMDB IDs for Oscar-winning films and actors.
 * Also fetches profile_path for each actor so the event mode service needs zero runtime API calls.
 *
 * Usage: TMDB_API_KEY=xxx npx tsx scripts/resolve-oscar-tmdb-ids.ts
 * Output: data/oscar-tmdb-cache.json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.API_KEY || "";
const TMDB_BASE = "https://api.themoviedb.org/3";
const BATCH_SIZE = 35;
const BATCH_DELAY_MS = 10_000;

if (!TMDB_API_KEY) {
  console.error("Error: Set TMDB_API_KEY or API_KEY environment variable");
  process.exit(1);
}

interface OscarFilm {
  title: string;
  imdb_id: string;
  categories_won: string[];
  year: string;
  ceremony: number;
  tmdb_id?: number;
}

interface OscarActor {
  name: string;
  imdb_id: string;
  oscar_wins: { category: string; film: string; year: string; ceremony: number }[];
  tmdb_person_id?: number;
}

interface Nominee {
  name: string;
  film: string;
  imdb_id: string;
  film_tmdb_id?: number;
  tmdb_person_id?: number;
}

interface OscarData {
  metadata: Record<string, unknown>;
  films: OscarFilm[];
  actors: OscarActor[];
  nominees_2026: Record<string, Nominee[] | { title: string; tmdb_id: number | null }[]>;
}

interface CacheEntry {
  tmdb_person_id: number;
  profile_path: string | null;
}

interface Cache {
  films: Record<string, number>; // imdb_id -> tmdb movie id
  actors: Record<string, CacheEntry>; // imdb_id -> { tmdb_person_id, profile_path }
  resolved_at: string;
}

async function tmdbRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set("api_key", TMDB_API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      if (res.status === 429) {
        console.warn("Rate limited, waiting 15s...");
        await sleep(15_000);
        return tmdbRequest(endpoint, params);
      }
      console.warn(`TMDB ${res.status} for ${endpoint}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`Fetch error for ${endpoint}:`, err);
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveImdbToTmdbMovie(imdbId: string): Promise<number | null> {
  if (!imdbId || !imdbId.startsWith("tt")) return null;

  const result = await tmdbRequest<{
    movie_results: { id: number }[];
  }>(`/find/${imdbId}`, { external_source: "imdb_id" });

  if (result?.movie_results?.length) {
    return result.movie_results[0].id;
  }
  return null;
}

async function resolveImdbToTmdbPerson(imdbId: string): Promise<number | null> {
  if (!imdbId || !imdbId.startsWith("nm")) return null;

  const result = await tmdbRequest<{
    person_results: { id: number }[];
  }>(`/find/${imdbId}`, { external_source: "imdb_id" });

  if (result?.person_results?.length) {
    return result.person_results[0].id;
  }
  return null;
}

async function searchPerson(name: string): Promise<number | null> {
  const result = await tmdbRequest<{
    results: { id: number; name: string }[];
  }>("/search/person", { query: name });

  if (result?.results?.length) {
    return result.results[0].id;
  }
  return null;
}

async function getPersonProfilePath(personId: number): Promise<string | null> {
  const result = await tmdbRequest<{ profile_path: string | null }>(`/person/${personId}`);
  return result?.profile_path ?? null;
}

async function processBatch<T>(
  items: T[],
  processor: (item: T) => Promise<void>,
  label: string,
): Promise<void> {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    console.log(`${label}: processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(items.length / BATCH_SIZE)} (${i + 1}-${Math.min(i + BATCH_SIZE, items.length)} of ${items.length})`);
    await Promise.all(batch.map(processor));

    if (i + BATCH_SIZE < items.length) {
      console.log(`  Waiting ${BATCH_DELAY_MS / 1000}s for rate limit...`);
      await sleep(BATCH_DELAY_MS);
    }
  }
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const dataPath = path.join(__dirname, "..", "data", "oscar-winners.json");
  const cachePath = path.join(__dirname, "..", "data", "oscar-tmdb-cache.json");

  console.log("Loading oscar-winners.json...");
  const oscarData: OscarData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  // Load existing cache if present (for incremental updates)
  let cache: Cache = { films: {}, actors: {}, resolved_at: "" };
  if (fs.existsSync(cachePath)) {
    console.log("Loading existing cache for incremental update...");
    cache = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
  }

  // ── Phase 1: Resolve film IMDb → TMDB IDs ──────────────────────────────
  const filmsToResolve = oscarData.films.filter(
    (f) => !f.tmdb_id && f.imdb_id && f.imdb_id.startsWith("tt") && !cache.films[f.imdb_id],
  );
  console.log(`\nFilms to resolve: ${filmsToResolve.length} (${oscarData.films.length} total, ${Object.keys(cache.films).length} cached)`);

  let filmResolved = 0;
  let filmFailed = 0;

  await processBatch(filmsToResolve, async (film) => {
    const tmdbId = await resolveImdbToTmdbMovie(film.imdb_id);
    if (tmdbId) {
      cache.films[film.imdb_id] = tmdbId;
      filmResolved++;
    } else {
      console.warn(`  Could not resolve film: ${film.title} (${film.imdb_id})`);
      filmFailed++;
    }
  }, "Films");

  console.log(`Films: ${filmResolved} resolved, ${filmFailed} failed, ${Object.keys(cache.films).length} total cached`);

  // ── Phase 2: Resolve actor IMDb → TMDB person IDs ──────────────────────
  const actorsToResolve = oscarData.actors.filter(
    (a) => !a.tmdb_person_id && a.imdb_id && a.imdb_id.startsWith("nm") && !cache.actors[a.imdb_id],
  );
  console.log(`\nActors to resolve IDs: ${actorsToResolve.length}`);

  let actorResolved = 0;

  await processBatch(actorsToResolve, async (actor) => {
    const personId = await resolveImdbToTmdbPerson(actor.imdb_id);
    if (personId) {
      cache.actors[actor.imdb_id] = { tmdb_person_id: personId, profile_path: null };
      actorResolved++;
    } else {
      console.warn(`  Could not resolve actor: ${actor.name} (${actor.imdb_id})`);
    }
  }, "Actor IDs");

  console.log(`Actor IDs: ${actorResolved} newly resolved`);

  // ── Phase 2b: Resolve missing nominees_2026 person IDs ─────────────────
  const actingCategories = ["best_actor", "best_actress", "best_supporting_actor", "best_supporting_actress"];
  const nomineesToResolve: Nominee[] = [];

  for (const category of actingCategories) {
    const nominees = oscarData.nominees_2026[category] as Nominee[] | undefined;
    if (!nominees) continue;

    for (const nominee of nominees) {
      if (nominee.tmdb_person_id) continue;
      if (nominee.imdb_id && cache.actors[nominee.imdb_id]) continue;
      nomineesToResolve.push(nominee);
    }
  }

  console.log(`\nNominees to resolve: ${nomineesToResolve.length}`);

  for (const nominee of nomineesToResolve) {
    let personId: number | null = null;

    if (nominee.imdb_id && nominee.imdb_id.startsWith("nm")) {
      personId = await resolveImdbToTmdbPerson(nominee.imdb_id);
    }

    if (!personId) {
      console.log(`  Searching by name: ${nominee.name}`);
      personId = await searchPerson(nominee.name);
    }

    if (personId) {
      const key = nominee.imdb_id || `name:${nominee.name}`;
      cache.actors[key] = { tmdb_person_id: personId, profile_path: null };
      console.log(`  Resolved nominee: ${nominee.name} → ${personId}`);
    } else {
      console.warn(`  Could not resolve nominee: ${nominee.name}`);
    }

    await sleep(300); // gentle rate limiting for individual requests
  }

  // ── Phase 3: Fetch profile_path for all actors ─────────────────────────
  // Collect all actor entries that need profile_path fetched
  const actorsNeedingProfile: { key: string; personId: number }[] = [];

  // From actors array — include those with inline tmdb_person_id too
  for (const actor of oscarData.actors) {
    const personId = actor.tmdb_person_id || cache.actors[actor.imdb_id]?.tmdb_person_id;
    if (!personId) continue;

    const key = actor.imdb_id;
    // Ensure entry exists in cache
    if (!cache.actors[key]) {
      cache.actors[key] = { tmdb_person_id: personId, profile_path: null };
    } else if (cache.actors[key].profile_path !== null && cache.actors[key].profile_path !== undefined) {
      continue; // already cached
    }

    actorsNeedingProfile.push({ key, personId });
  }

  // From nominees_2026 acting categories
  for (const category of actingCategories) {
    const nominees = oscarData.nominees_2026[category] as Nominee[] | undefined;
    if (!nominees) continue;

    for (const nominee of nominees) {
      const key = nominee.imdb_id || `name:${nominee.name}`;
      const personId = nominee.tmdb_person_id || cache.actors[key]?.tmdb_person_id;
      if (!personId) continue;

      if (!cache.actors[key]) {
        cache.actors[key] = { tmdb_person_id: personId, profile_path: null };
      } else if (cache.actors[key].profile_path !== null && cache.actors[key].profile_path !== undefined) {
        continue;
      }

      // Avoid duplicates
      if (!actorsNeedingProfile.some((a) => a.personId === personId)) {
        actorsNeedingProfile.push({ key, personId });
      }
    }
  }

  console.log(`\nActors needing profile_path: ${actorsNeedingProfile.length}`);

  await processBatch(actorsNeedingProfile, async ({ key, personId }) => {
    const profilePath = await getPersonProfilePath(personId);
    cache.actors[key].profile_path = profilePath;
  }, "Profile paths");

  // ── Write cache ────────────────────────────────────────────────────────
  cache.resolved_at = new Date().toISOString();

  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
  console.log(`\nCache written to ${cachePath}`);
  console.log(`  Films: ${Object.keys(cache.films).length}`);
  console.log(`  Actors: ${Object.keys(cache.actors).length}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
