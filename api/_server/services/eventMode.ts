import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getESTDateString } from "../dateHelpers.js";
import type { Actor } from "../../../shared/schema.js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface EventConfig {
  id: string;
  name: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface EventModeResponse {
  active: boolean;
  event: (EventConfig & { daysRemaining: number }) | null;
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

interface CacheEntry {
  tmdb_person_id: number;
  profile_path: string | null;
}

interface TmdbCache {
  films: Record<string, number>;
  actors: Record<string, CacheEntry>;
}

// ── Event Configuration ──────────────────────────────────────────────────────

const EVENTS: EventConfig[] = [
  {
    id: "oscars-2026",
    name: "Oscars Mode",
    description: "All games feature Oscar-winning movies & actors",
    startDate: "2026-03-17",
    endDate: "2026-03-31",
  },
];

// Acting categories (directors excluded — they lack cast credits)
const ACTING_CATEGORIES = new Set([
  "best_actor",
  "best_actress",
  "supporting_actor",
  "supporting_actress",
]);

// Categories that are non-live-action (excluded when they're the ONLY category won)
const NON_LIVE_ACTION_CATEGORIES = new Set([
  "animated",
  "documentary",
  "international",
]);

// ── Service ──────────────────────────────────────────────────────────────────

class EventModeService {
  private oscarData: { films: OscarFilm[]; actors: OscarActor[] } | null = null;
  private tmdbCache: TmdbCache | null = null;
  private dataReady = true;
  private moviePoolCache = new Map<string, number[]>();
  private actorPoolCache = new Map<string, Actor[]>();

  private resolveDataDir(): string | null {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const candidates = [
      process.env.EVENT_MODE_DATA_DIR,
      path.resolve(process.cwd(), "data"),
      path.resolve(__dirname, "..", "..", "..", "data"),
    ].filter((value): value is string => Boolean(value));

    for (const candidate of candidates) {
      if (fs.existsSync(path.join(candidate, "oscar-winners.json"))) {
        return candidate;
      }
    }

    console.error(
      `Oscar data not found. Checked: ${candidates.map((candidate) => path.join(candidate, "oscar-winners.json")).join(", ")}`,
    );
    return null;
  }

  // ── Event Detection ──────────────────────────────────────────────────

  /**
   * Check whether an event is active for a specific date.
   * All generators MUST use this with their target challenge date.
   */
  getEventForDate(dateString: string): { active: boolean; event: EventConfig | null } {
    for (const event of EVENTS) {
      if (dateString >= event.startDate && dateString <= event.endDate) {
        this.loadData();
        if (!this.dataReady) {
          return { active: false, event: null };
        }
        return { active: true, event };
      }
    }
    return { active: false, event: null };
  }

  /**
   * Convenience: check today's EST date. Used only by the /api/event-mode endpoint.
   */
  getActiveEvent(): EventModeResponse {
    const today = getESTDateString();
    const { active, event } = this.getEventForDate(today);

    if (!active || !event) {
      return { active: false, event: null };
    }

    const todayDate = new Date(today + "T00:00:00");
    const endDate = new Date(event.endDate + "T00:00:00");
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    return {
      active: true,
      event: { ...event, daysRemaining },
    };
  }

  // ── Data Loading ─────────────────────────────────────────────────────

  private loadData(): void {
    if (this.oscarData && this.tmdbCache) return;

    const dataDir = this.resolveDataDir();
    if (!dataDir) {
      this.dataReady = false;
      this.oscarData = { films: [], actors: [] };
      this.tmdbCache = { films: {}, actors: {} };
      return;
    }

    const oscarPath = path.join(dataDir, "oscar-winners.json");
    const cachePath = path.join(dataDir, "oscar-tmdb-cache.json");

    const raw = JSON.parse(fs.readFileSync(oscarPath, "utf-8"));
    this.oscarData = { films: raw.films || [], actors: raw.actors || [] };

    if (fs.existsSync(cachePath)) {
      this.tmdbCache = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
    } else {
      console.error(`TMDB cache not found at ${cachePath}. Run scripts/resolve-oscar-tmdb-ids.ts first.`);
      this.dataReady = false;
      this.tmdbCache = { films: {}, actors: {} };
      return;
    }

    const resolvedFilmCount = this.oscarData.films.filter((film) => film.tmdb_id ?? this.tmdbCache!.films[film.imdb_id]).length;
    const resolvedActorCount = this.oscarData.actors.filter((actor) => actor.tmdb_person_id ?? this.tmdbCache!.actors[actor.imdb_id]?.tmdb_person_id).length;

    if (resolvedFilmCount < 100 || resolvedActorCount < 100) {
      console.error(
        `Oscar dataset incomplete: ${resolvedFilmCount} films and ${resolvedActorCount} actors resolved. ` +
        "Run scripts/resolve-oscar-tmdb-ids.ts and commit data/oscar-tmdb-cache.json before enabling event mode.",
      );
      this.dataReady = false;
      return;
    }

    this.dataReady = true;
  }

  // ── Movie Pool ───────────────────────────────────────────────────────

  /**
   * Get Oscar-winning movie TMDB IDs, filtered by year range.
   * Excludes films whose categories are ONLY animated/documentary/international.
   */
  getOscarMoviePool(opts?: { yearMin?: number; yearMax?: number }): number[] {
    const cacheKey = `${opts?.yearMin ?? ""}:${opts?.yearMax ?? ""}`;
    const cached = this.moviePoolCache.get(cacheKey);
    if (cached) return cached;

    this.loadData();
    const films = this.oscarData!.films;
    const tmdbCache = this.tmdbCache!;

    const result: number[] = [];

    for (const film of films) {
      // Resolve TMDB ID: inline first, then cache
      const tmdbId = film.tmdb_id ?? tmdbCache.films[film.imdb_id];
      if (!tmdbId) continue;

      // Exclude films whose categories are ONLY non-live-action
      if (film.categories_won.length > 0) {
        const hasLiveAction = film.categories_won.some((c) => !NON_LIVE_ACTION_CATEGORIES.has(c));
        if (!hasLiveAction) continue;
      }

      // Parse year for filtering
      const yearNum = this.parseYear(film.year);
      if (opts?.yearMin && yearNum < opts.yearMin) continue;
      if (opts?.yearMax && yearNum > opts.yearMax) continue;

      result.push(tmdbId);
    }

    this.moviePoolCache.set(cacheKey, result);
    console.log(`Oscar movie pool (yearMin=${opts?.yearMin}, yearMax=${opts?.yearMax}): ${result.length} films`);
    return result;
  }

  // ── Actor Pool ───────────────────────────────────────────────────────

  /**
   * Get Oscar-winning actors as Actor[] for Six Degrees.
   * Tiered by year of most recent acting win.
   * Directors excluded — only acting categories.
   */
  getOscarActorPool(opts?: { tier: "easy" | "medium" | "hard" }): Actor[] {
    const tier = opts?.tier ?? "hard";
    const cached = this.actorPoolCache.get(tier);
    if (cached) return cached;

    this.loadData();
    const actors = this.oscarData!.actors;
    const tmdbCache = this.tmdbCache!;

    const yearMin = tier === "easy" ? 2010 : tier === "medium" ? 2000 : 0;

    const result: Actor[] = [];

    for (const actor of actors) {
      // Only include actors with acting category wins
      const actingWins = actor.oscar_wins.filter((w) => ACTING_CATEGORIES.has(w.category));
      if (actingWins.length === 0) continue;

      // Filter by year of most recent acting win
      const latestYear = Math.max(...actingWins.map((w) => this.parseYear(w.year)));
      if (latestYear < yearMin) continue;

      // Resolve TMDB person ID: inline first, then cache
      const personId = actor.tmdb_person_id ?? tmdbCache.actors[actor.imdb_id]?.tmdb_person_id;
      if (!personId) continue;

      // Get profile_path from cache
      const profilePath = tmdbCache.actors[actor.imdb_id]?.profile_path ?? null;

      result.push({
        id: personId,
        name: actor.name,
        profile_path: profilePath,
      });
    }

    this.actorPoolCache.set(tier, result);
    console.log(`Oscar actor pool (tier=${tier}, yearMin=${yearMin}): ${result.length} actors`);
    return result;
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private parseYear(yearStr: string): number {
    // Handle "1927/28" format → take first year
    const match = yearStr.match(/(\d{4})/);
    return match ? parseInt(match[1], 10) : 0;
  }
}

export const eventModeService = new EventModeService();
