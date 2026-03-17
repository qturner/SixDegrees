# Oscars Event Mode — Implementation Plan

## Context

The 98th Academy Awards just happened (March 15, 2026). We're building a 2-week event mode (March 17-31) where all 3 game modes draw exclusively from Oscar-winning movies and actors. The backend auto-reverts to normal gameplay when the event ends. This also establishes the pattern for future event modes.

The core insight: Oscar mode is a **data-source swap, not a logic fork**. Each game mode's algorithm (BFS pathfinding, cast ordering, reveal ordering) stays untouched — we only replace where movies/actors come from.

### Critical design decisions

1. **Date-scoped activation**: All event checks use `getEventForDate(dateString)`. Every generator call site passes its target challenge date — including cron, admin, and backfill routes (11 Six Degrees call sites, 1 Cast Call, 1 Premier — all enumerated below).
2. **Expanded actor pool**: Six Degrees uses all 323 Oscar-winning actors (tiered by difficulty), not just 2026 nominees. Survives the existing 7-day/42-actor exclusion window.
3. **Non-overlapping year ranges for Premier**: Easy/medium/hard draw from distinct year buckets so difficulties don't cannibalize each other against the shared 14-day exclusion.
4. **Genre/language filters preserved**: Oscar movie pool excludes animated-only and documentary-only films at the source. Cast Call and Premier branches apply the same TMDB genre/language checks as the existing code after fetching details.
5. **Directors excluded from actor pool**: Only acting category winners from `actors` array. Directors lack cast credits.
6. **Fully static data**: Resolution script caches TMDB IDs AND profile_path for actors. Zero runtime TMDB resolution calls.

---

## Phase 0: TMDB ID Resolution Script (run once, commit cache)

**New file:** `scripts/resolve-oscar-tmdb-ids.ts`

- Read `data/oscar-winners.json`
- For each film in `films` array missing `tmdb_id`: call TMDB `/find/{imdb_id}?external_source=imdb_id`, extract movie ID
- For each actor in `actors` array missing `tmdb_person_id`: same `/find` endpoint, extract person ID
- **Also fetch `profile_path`** for every actor with a resolved `tmdb_person_id` via TMDB `/person/{id}` — store in cache so `getOscarActorPool()` needs zero runtime API calls
- For nominees_2026 acting entries missing `tmdb_person_id` (4 people: Wagner Moura, Renate Reinsve, Inga Ibsdotter Lilleaas, Teyana Taylor): resolve via `/find` or `/search/person?query=name` fallback for empty imdb_id
- Rate limit: batches of 35 with 10s pause (~728 films + ~323 actors = ~5 min)
- Output: `data/oscar-tmdb-cache.json`:
  ```json
  {
    "films": { "tt0019071": 12345, ... },
    "actors": {
      "nm0001499": { "tmdb_person_id": 23882, "profile_path": "/abc.jpg" },
      ...
    },
    "resolved_at": "2026-03-16T..."
  }
  ```
- Commit the cache file — zero runtime API calls needed

---

## Phase 1: Event Mode Service (backend core)

**New file:** `api/_server/services/eventMode.ts`

### Interfaces
```typescript
interface EventConfig {
  id: string;            // "oscars-2026"
  name: string;          // "Oscars Mode"
  description: string;
  startDate: string;     // "2026-03-17" (ISO date)
  endDate: string;       // "2026-03-31"
}
```

### Hardcoded events array
```typescript
const EVENTS: EventConfig[] = [{
  id: "oscars-2026",
  name: "Oscars Mode",
  description: "All games feature Oscar-winning movies & actors",
  startDate: "2026-03-17",
  endDate: "2026-03-31",
}];
```

### Key methods

| Method | Purpose |
|--------|---------|
| `getEventForDate(dateString: string)` | Check a specific date string (YYYY-MM-DD) against event windows. Returns `{ active: boolean; event: EventConfig \| null }`. **All generators must use this, passing their target challenge date.** |
| `getActiveEvent()` | Convenience — calls `getEventForDate()` with today's EST date via `getESTDateString()`. Used only by the `/api/event-mode` endpoint. |
| `getOscarMoviePool(opts)` | See Movie Pool section below. |
| `getOscarActorPool(opts)` | See Actor Pool section below. |

### Movie pool: `getOscarMoviePool(opts?: { yearMin?: number, yearMax?: number })`

Returns TMDB IDs from the `films` array. Loads `oscar-winners.json` + `oscar-tmdb-cache.json`, merges (inline `tmdb_id` for 2026 films, cache lookup for historical). **Filters at source:**
- Exclude films whose `categories_won` contains ONLY "animated" and/or "documentary" and/or "international" (films that also won live-action categories stay in)
- Skip films without a resolved TMDB ID
- Filter by `yearMin`/`yearMax` when provided

Cached in memory after first load (data is static).

### Actor pool: `getOscarActorPool(opts?: { tier: "easy" | "medium" | "hard" })`

Returns `Actor[]` from the `actors` array (323 Oscar-winning actors). **Excludes directors** — only actors whose `oscar_wins` include acting categories (`best_actor`, `best_actress`, `supporting_actor`, `supporting_actress`).

Tiered by year of most recent win:
- **easy**: Winners from 2010+ (~50-60 actors)
- **medium**: Winners from 2000+ (~100+ actors)
- **hard**: All acting winners (~300+ actors)

Resolves `tmdb_person_id` and `profile_path` from `oscar-tmdb-cache.json` — no runtime TMDB calls. Skips actors without resolved IDs.

### Data loading
- Lazy-load JSON files on first call, cache in module-level variables
- Oscar data is static — load once, serve forever
- Export as singleton: `export const eventModeService = new EventModeService();`

---

## Phase 2: API Endpoint

**Modify:** `api/_server/routes.ts`

Add `GET /api/event-mode` route:
- Import `eventModeService`
- Call `eventModeService.getActiveEvent()` (this is the one place that uses today's date)
- Compute `daysRemaining` from endDate
- Return `{ active, event: { ...config, daysRemaining } }` or `{ active: false, event: null }`

---

## Phase 3: Six Degrees Oscar Mode

**Modify:** `api/_server/services/gameLogic.ts`

**Hook point:** `getActorPoolForDifficulty()` at line 327

Thread `targetDate` through the call chain:
1. `generateAllDailyChallenges(excludeActorIds, targetDate?)` — add optional param
2. `generateDailyActors(difficulty, excludeActorIds, targetDate?)` — add optional param
3. `getActorPoolForDifficulty(difficulty, targetDate?)` — add optional param

```typescript
private async getActorPoolForDifficulty(difficulty: DifficultyLevel, targetDate?: string): Promise<Actor[]> {
  if (targetDate) {
    const event = eventModeService.getEventForDate(targetDate);
    if (event.active) {
      return eventModeService.getOscarActorPool({ tier: difficulty });
    }
  }

  // Existing logic unchanged
  if (difficulty === "easy") return tmdbService.getActorsByTier("easy");
  return tmdbService.getQualityActorPool();
}
```

### All `generateDailyActors` / `generateAllDailyChallenges` call sites requiring `targetDate`:

| Location | Date available as | Generates for |
|----------|------------------|---------------|
| `routes.ts:327` — `createChallengeForDifficulty(date, ...)` | `date` param | specific date |
| `routes.ts:362` — `generateChallengesForDate(date)` | `date` param | specific date |
| `routes.ts:419` — backfill in `ensureDailyChallenges()` | `date` param | specific date |
| `routes.ts:517` — admin test route | available in context | test date |
| `routes.ts:1042` — `/api/generate-challenge` | `getESTDateString()` → `today` | today |
| `routes.ts:1186` — promote route, generate next | `tomorrow` var | tomorrow |
| `routes.ts:1209` — promote route, generate active | `today` var | today |
| `routes.ts:1229` — promote route, generate next | `tomorrow` var | tomorrow |
| `routes.ts:1321` — `/api/admin/next-challenge` | `tomorrow` var | tomorrow |
| `routes.ts:1366` — `/api/admin/reset-next-challenge` | `tomorrow` var | tomorrow |
| `index.ts:217` — cron job | `tomorrow` var (line ~181) | tomorrow |

All sites have the target date readily available — just need to pass it through.

---

## Phase 4: Cast Call Oscar Mode

**Modify:** `api/_server/services/castCallLogic.ts`

**Hook point:** `generateCastCallChallenge()` at line 22, inside the retry loop

Add `targetDate?: string` parameter. Single call site: `routes.ts:2759` in `ensureCastCallChallenges(date)` — pass `date`.

```typescript
async generateCastCallChallenge(
  difficulty: CastCallDifficulty,
  excludeMovieIds: number[],
  targetDate?: string,
): Promise<CastCallChallengeData | null> {
```

Inside the retry loop, before existing discover logic:

```typescript
let movie: { id: number; title: string; poster_path: string | null } | undefined;

if (targetDate) {
  const event = eventModeService.getEventForDate(targetDate);
  if (event.active) {
    const pool = eventModeService.getOscarMoviePool({
      yearMin: difficulty === "easy" ? 2000 : difficulty === "medium" ? 1990 : undefined,
    });
    const candidates = pool.filter(id => !excludeMovieIds.includes(id));
    if (candidates.length === 0) continue;
    const tmdbId = candidates[Math.floor(Math.random() * candidates.length)];
    const details = await tmdbService.getMovieDetails(tmdbId);
    if (!details) continue;

    // Preserve existing language/genre filters (castCallLogic.ts:32-33)
    // Check English original language + exclude animation (16) and documentary (99)
    // NOTE: requires adding originalLanguage to getMovieDetails() return in tmdb.ts:697
    if (details.originalLanguage !== "en") continue;
    const genreIds = details.genres.map(g => g.id);
    if (genreIds.includes(16) || genreIds.includes(99)) continue;

    movie = { id: tmdbId, title: details.title, poster_path: details.posterPath };
  }
}

if (!movie) {
  // Existing discoverMovies() logic unchanged
}
```

Everything after movie selection is identical: `getMovieCastWithOrder()`, filter by photos, `minCast` check, `selectAndOrderActors()`.

---

## Phase 5: Premier Oscar Mode

**Modify:** `api/_server/services/premierLogic.ts`

**Hook point:** `generateChallenge()` at line 16, inside the retry loop

Add `targetDate?: string` parameter. Single call site: `routes.ts:3201` in `ensurePremierChallenges(date)` — pass `date`.

### Non-overlapping year ranges (prevents cross-difficulty pool cannibalization)

The 14-day exclusion in `ensurePremierChallenges()` (routes.ts:3172-3196) is shared across ALL difficulties. Over 14 days, each difficulty consumes 9 × 14 = 126 movies. With overlapping year ranges, medium/hard would eat into easy's pool.

**Solution: non-overlapping year buckets:**
- **Easy**: 2000+ (~200 films) → `yearMin: 2000`
- **Medium**: 1970-1999 (~230 films) → `yearMin: 1970, yearMax: 1999`
- **Hard**: pre-1970 (~310 films) → `yearMax: 1969`

Each bucket has 200+ films vs 126 max exclusions — comfortable margin.

```typescript
if (targetDate) {
  const event = eventModeService.getEventForDate(targetDate);
  if (event.active) {
    const yearOpts = difficulty === "easy"
      ? { yearMin: 2000 }
      : difficulty === "medium"
      ? { yearMin: 1970, yearMax: 1999 }
      : { yearMax: 1969 };

    const pool = eventModeService.getOscarMoviePool(yearOpts);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const candidates = [];
    for (const tmdbId of shuffled.slice(0, 50)) {
      if (usedIds.has(tmdbId)) continue;
      const details = await tmdbService.getMovieDetails(tmdbId);
      if (!details?.posterPath || !details?.releaseDate) continue;

      // Preserve existing genre filters (premierLogic.ts:45-46)
      // Exclude animation (16), documentary (99), TV movie (10770)
      const genreIds = details.genres.map(g => g.id);
      if (genreIds.includes(16) || genreIds.includes(99) || genreIds.includes(10770)) continue;

      candidates.push({ id: tmdbId, ...details });
    }
    allCandidates = candidates;
  }
}

if (!allCandidates) {
  // Existing 3-page discover logic unchanged
}
```

Year uniqueness and `assignRevealOrder()` completely unchanged.

---

## Phase 6: iOS — EventMode Model + API

**New file:** `SixDegrees/Models/EventMode.swift`
```swift
struct EventModeResponse: Codable {
    let active: Bool
    let event: EventConfig?
}

struct EventConfig: Codable, Identifiable {
    let id: String
    let name: String
    let description: String
    let startDate: String
    let endDate: String
    var daysRemaining: Int?
}
```

**Modify:** `SixDegrees/Utilities/Constants.swift`
- Add `static let eventMode = "/api/event-mode"` to the API enum

**Modify:** `SixDegrees/Services/APIService.swift`
- Add `func getEventMode() async throws -> EventModeResponse`

---

## Phase 7: iOS — Event Banner

**New file:** `SixDegrees/Views/Components/EventBanner.swift`

- Gold-themed card using existing `.goldCard()` modifier from Theme.swift
- Trophy icon (`trophy.fill` SF Symbol) in `SixDegreesColor.gold`
- Title: event name in `SixDegreesFont.sectionTitle`
- Subtitle: event description in `SixDegreesFont.caption`
- Countdown: "X days remaining" from `daysRemaining`
- Dismiss button (X) — stores dismissed event ID in `@AppStorage`

**Modify:** `SixDegrees/Views/Game/GameTabRootView.swift`
- Add `@State private var eventMode: EventModeResponse?`
- Fetch on appear: `eventMode = try? await APIService.shared.getEventMode()`
- Also refetch on `scenePhase == .active` (foreground resume)
- Pass to GameModesView

**Modify:** `SixDegrees/Views/Game/GameModesView.swift`
- Add `eventMode: EventModeResponse?` prop
- Insert `EventBanner` between header and game cards when active + not dismissed

---

## Files Summary

### Backend — New files
| File | Purpose |
|------|---------|
| `scripts/resolve-oscar-tmdb-ids.ts` | One-time TMDB ID resolution + profile_path cache |
| `data/oscar-tmdb-cache.json` | Generated cache (committed) |
| `api/_server/services/eventMode.ts` | Event mode service |

### Backend — Modified files
| File | Change |
|------|--------|
| `api/_server/routes.ts` | Add GET /api/event-mode route; pass `targetDate` to all generator call sites (11 Six Degrees, 1 Cast Call, 1 Premier) |
| `api/_server/services/gameLogic.ts` | Add `targetDate` param to `generateAllDailyChallenges` + `generateDailyActors` + `getActorPoolForDifficulty`; Oscar actor pool swap |
| `api/_server/services/castCallLogic.ts` | Add `targetDate` param to `generateCastCallChallenge`; Oscar movie sourcing with English/genre filters |
| `api/_server/services/premierLogic.ts` | Add `targetDate` param to `generateChallenge`; Oscar movie sourcing with non-overlapping year ranges and genre filters |
| `api/_server/services/tmdb.ts` | Add `originalLanguage` to `getMovieDetails()` return type (line 697) — needed for Cast Call English-language filter |
| `api/_server/index.ts` | Pass `tomorrow` to `generateDailyActors` in cron job (line 217) |

### iOS — New files
| File | Purpose |
|------|---------|
| `SixDegrees/Models/EventMode.swift` | Codable model |
| `SixDegrees/Views/Components/EventBanner.swift` | Banner component |

### iOS — Modified files
| File | Change |
|------|--------|
| `SixDegrees/Utilities/Constants.swift` | Add event-mode endpoint constant |
| `SixDegrees/Services/APIService.swift` | Add getEventMode() method |
| `SixDegrees/Views/Game/GameTabRootView.swift` | Fetch event mode, pass to view |
| `SixDegrees/Views/Game/GameModesView.swift` | Accept + display EventBanner |

### Existing utilities to reuse
| Utility | Location | Usage |
|---------|----------|-------|
| `getESTDateString()` | `api/_server/dateHelpers.ts` | Event date comparison |
| `getTomorrowDateString()` | `api/_server/dateHelpers.ts` | Cron/admin date threading |
| `tmdbService.getMovieDetails()` | `api/_server/services/tmdb.ts` | Fetch Oscar movie details + genre/language check |
| `tmdbService.getMovieCastWithOrder()` | `api/_server/services/tmdb.ts` | Cast Call cast fetching |
| `SixDegreesColor.gold` / `.goldCard()` | `Utilities/Theme.swift` | Banner styling |
| `SixDegreesFont`, `SixDegreesSpacing` | `Utilities/Theme.swift` | Banner typography/layout |

---

## Verification

### Backend
```bash
# Build check
npx tsc --noEmit

# Run TMDB resolution script
npx tsx scripts/resolve-oscar-tmdb-ids.ts
# Verify: jq '.films | length' data/oscar-tmdb-cache.json  (expect ~733, the historical films without inline tmdb_id)
# Verify: jq '.actors | length' data/oscar-tmdb-cache.json  (expect ~323)
# Verify profile_path cached: jq '.actors | to_entries[0].value.profile_path' data/oscar-tmdb-cache.json

# Test event mode endpoint
curl -s localhost:5000/api/event-mode | jq

# Test challenge generation (with event dates set to include today)
curl -s localhost:5000/api/daily-challenges | jq '.[].startActorName'
curl -s localhost:5000/api/cast-call/today | jq '.[].movieTitle'
curl -s localhost:5000/api/premier/daily | jq '.[0].movies[].title'

# Verify genre/language filters: no animated/documentary movies in Cast Call or Premier
# Verify Premier non-overlapping ranges: easy movies should be 2000+, medium 1970-1999, hard pre-1970

# Verify date-scoped generation:
# 1. Set event to March 17-31, generate for March 16 — should use normal mode
# 2. Generate for March 17 — should use Oscar mode
# 3. Generate for April 1 — should use normal mode

# Verify normal mode works when event dates are in the past
```

### iOS
- Build in Xcode, run on simulator
- Verify banner appears on GameModesView when event is active
- Verify banner dismiss persists across app launches
- Verify banner hidden when no event active
- Verify countdown displays correctly

---

## Implementation Order

1. **Resolution script** (Phase 0) — run it, commit cache
2. **Event mode service** (Phase 1) — the foundation everything depends on
3. **API endpoint** (Phase 2) — enables iOS work to start
4. **Game mode integrations** (Phases 3-5) — each passes `targetDate`, applies filters
5. **iOS model + API** (Phase 6) — depends on Phase 2
6. **iOS banner** (Phase 7) — depends on Phase 6
