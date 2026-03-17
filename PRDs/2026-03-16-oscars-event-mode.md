# Oscars Event Mode — PRD
Generated: 2026-03-16

## Overview

A time-limited "Oscars Mode" event where all three game modes (Six Degrees, Cast Call, Première) draw exclusively from Oscar-winning movies and actors. Runs for 1 week following the 98th Academy Awards (March 15, 2026). The backend automatically reverts to normal gameplay when the event ends — no manual intervention needed.

## Problem Statement

- **Who:** Six Degrees players looking for themed, topical content
- **Pain:** The Oscars just happened — there's cultural momentum to capitalize on. Movie fans are engaged and thinking about Oscar films right now.
- **Why now:** 98th ceremony was last night (March 15, 2026). Strike while the iron is hot. This also establishes the pattern for future event modes (Halloween horror, Summer blockbusters, etc.)
- **Opportunity:** Event modes drive engagement, social sharing ("I connected 2026 Oscar nominees!"), and give us a reason to push notifications to dormant users.

## Scope

### In Scope
- Server-driven event mode system (start/end dates, auto-revert)
- Oscar-filtered challenge generation for all 3 game modes
- `/api/event-mode` endpoint for iOS app to detect active events
- In-app banner/alert for Oscars Mode
- Oscar dataset integration (`data/oscar-winners.json`)
- TMDB ID resolution for historical Oscar films (IMDb → TMDB)
- X/Twitter posts announcing Oscar mode

### Out of Scope
- Custom UI themes (gold Oscar styling) — nice-to-have for v2
- Leaderboard reset or separate Oscar leaderboard
- Oscar trivia/facts overlays
- Push notifications to dormant users (separate feature)

## Event Configuration

### Timing
- **Start:** 2026-03-17 (Monday after the ceremony)
- **End:** 2026-03-23 (1 full week)
- **Reversion:** Automatic — when `endDate < now`, all generation logic falls through to normal behavior

### Data Source
- **File:** `data/oscar-winners.json` (committed to repo, 232 KB)
- **Films:** 742 Oscar-winning films across 10 categories (1927–2026)
- **Actors:** 323 Oscar-winning actors with IMDb IDs
- **2026 Nominees:** Full lists for all acting + directing categories with TMDB person IDs
- **TMDB IDs:** Resolved for 2026 films; historical films need runtime resolution via TMDB `/find/{imdb_id}`

## Technical Architecture

### New: Event Mode Service

**File:** `api/_server/services/eventMode.ts`

```typescript
interface EventMode {
  id: string;
  name: string;
  description: string;
  startDate: string;    // ISO date YYYY-MM-DD
  endDate: string;      // ISO date YYYY-MM-DD
  config: {
    oscarDataFile?: string;
    // Future event types can add their own config
  };
}

interface EventModeService {
  // Check if any event mode is currently active
  getActiveEvent(): EventMode | null;
  
  // Get Oscar movie pool (TMDB IDs) for challenge generation
  getOscarMoviePool(options?: { minYear?: number }): Promise<number[]>;
  
  // Get Oscar actor pool (TMDB person IDs) for Six Degrees
  getOscarActorPool(options?: { nominees2026Only?: boolean }): Promise<Actor[]>;
  
  // Resolve IMDb → TMDB IDs (cached after first resolution)
  resolveTmdbIds(): Promise<Map<string, number>>;
}
```

**Event configuration** can be stored as a simple JSON config or as a constant in the service file — no database table needed for v1 since events are infrequent:

```typescript
const EVENTS: EventMode[] = [
  {
    id: "oscars-2026",
    name: "Oscars Mode",
    description: "🏆 All games feature Oscar-winning movies and actors",
    startDate: "2026-03-17",
    endDate: "2026-03-23",
    config: { oscarDataFile: "oscar-winners.json" },
  },
];
```

### New: API Endpoint

**`GET /api/event-mode`**

Returns the currently active event mode (or `null`):

```json
{
  "active": true,
  "event": {
    "id": "oscars-2026",
    "name": "Oscars Mode",
    "description": "🏆 All games feature Oscar-winning movies and actors",
    "startDate": "2026-03-17",
    "endDate": "2026-03-31",
    "daysRemaining": 12
  }
}
```

When no event is active:
```json
{
  "active": false,
  "event": null
}
```

### TMDB ID Resolution Strategy

The Oscar dataset has IMDb IDs (`tt*`) for 728 historical films but needs TMDB IDs for the game to use them. Strategy:

1. **On first use:** Load `oscar-winners.json`, batch-resolve IMDb → TMDB via TMDB's `/find/{imdb_id}?external_source=imdb_id` endpoint
2. **Cache results:** Write resolved IDs back to a `data/oscar-tmdb-cache.json` file
3. **Subsequent loads:** Read from cache (no API calls needed)
4. **Rate limiting:** TMDB allows ~40 requests/10 seconds. 728 films = ~3 minutes to resolve. Do this once at startup when event mode is active, or provide a CLI/admin script to pre-resolve.

**Alternative (simpler):** Pre-resolve all IDs before deployment using a script with Dylan's TMDB key. Ship the cache file. Zero runtime API calls needed.

```typescript
// Pre-resolution script: scripts/resolve-oscar-tmdb-ids.ts
// Run once: npx tsx scripts/resolve-oscar-tmdb-ids.ts
// Outputs: data/oscar-tmdb-cache.json
```

---

## Game Mode Changes

### 1. Six Degrees — Oscar Mode

**Goal:** Connect actors who appeared in Oscar-nominated/winning films from the 2026 ceremony.

**How it works:**
- **Actor pool:** Instead of `tmdbService.getQualityActorPool()`, draw from the 2026 Oscar nominees (actors, actresses, supporting actors/actresses, directors who also act)
- **Start and end actors** are both from 2026 nominees — there are 25+ unique people across acting categories
- **Connecting films can be anything** — we're not restricting the path, only the endpoints. This ensures solvability.
- **Difficulty mapping:**
  - Easy (1-2 hops): Pick nominees likely to share movies (e.g., Michael B. Jordan ↔ Delroy Lindo — both in Sinners)
  - Medium (3-4 hops): Cross-film pairs (e.g., Leonardo DiCaprio ↔ Emma Stone)
  - Hard (5-6 hops): Less obvious connections (e.g., Amy Madigan ↔ Renate Reinsve)

**Changes to `gameLogic.ts`:**

```typescript
// In getActorPoolForDifficulty():
private async getActorPoolForDifficulty(difficulty: DifficultyLevel): Promise<Actor[]> {
  const event = eventModeService.getActiveEvent();
  
  if (event?.id === "oscars-2026") {
    // Use 2026 Oscar nominees as the actor pool
    return eventModeService.getOscarActorPool({ nominees2026Only: true });
  }
  
  // Normal flow
  if (difficulty === "easy") {
    return tmdbService.getActorsByTier("easy");
  }
  return tmdbService.getQualityActorPool();
}
```

**Pair exhaustion risk:** ~25 unique nominees = ~300 possible pairs. Over 7 days with 3 difficulties = 21 pairs needed. Plenty of headroom, but we should still exclude previously used actors to avoid repeats.

### 2. Cast Call — Oscar Mode

**Goal:** Guess the movie from its cast — but all movies are Oscar winners.

**How it works:**
- Instead of TMDB discover API, pick randomly from the Oscar movie pool
- Apply the same difficulty scaling via movie recognition and cast depth:
  - **Easy:** Recent Best Picture/Acting winners (high recognition). Pool: Oscar winners 2000+, major categories only
  - **Medium:** Oscar winners 1990+, any winning category (screenplay, cinematography, etc.)
  - **Hard:** Full Oscar winner pool, any era, any category
- Actor selection/reveal logic stays identical (`selectAndOrderActors`)
- Need to fetch cast from TMDB for each Oscar movie (same as current flow — `tmdbService.getMovieCastWithOrder`)

**Changes to `castCallLogic.ts`:**

```typescript
// In generateCastCallChallenge():
async generateCastCallChallenge(difficulty: CastCallDifficulty, excludeMovieIds: number[]): Promise<CastCallChallengeData | null> {
  const event = eventModeService.getActiveEvent();
  
  if (event?.id === "oscars-2026") {
    return this.generateOscarCastCallChallenge(difficulty, excludeMovieIds);
  }
  
  // ... existing logic unchanged
}

private async generateOscarCastCallChallenge(difficulty: CastCallDifficulty, excludeMovieIds: number[]): Promise<CastCallChallengeData | null> {
  const MAX_RETRIES = 15;
  
  // Get Oscar movie pool filtered by difficulty
  const moviePool = await eventModeService.getOscarMoviePool({
    minYear: difficulty === "easy" ? 2000 : difficulty === "medium" ? 1990 : undefined,
  });
  
  // Filter out excluded and shuffle
  const candidates = moviePool.filter(id => !excludeMovieIds.includes(id));
  // ... shuffle and iterate same as current logic but picking from candidates
  // ... rest of cast fetching and actor selection is identical
}
```

**Pool sizes by difficulty:**
- Easy (2000+): ~100-120 films
- Medium (1990+): ~160-180 films
- Hard (all): ~742 films (but some pre-1970 may lack TMDB cast data)

Over 7 days, we need 21 unique movies. Even easy mode has plenty.

### 3. Première — Oscar Mode

**Goal:** Sort Oscar-winning movies by release year.

**How it works:**
- Instead of TMDB discover, pick 9 movies from the Oscar pool
- Each movie must have a unique release year (same constraint as current)
- Difficulty controls the year spread and movie familiarity:
  - **Easy:** Well-known Best Picture winners, wide year spread (≥20 years)
  - **Medium:** Any Oscar category, 1990+, moderate spread (≥10 years)
  - **Hard:** Full pool including deep cuts, tight spread makes it tricky (≥15 years)
- Reveal order logic (`assignRevealOrder`) stays identical

**Changes to `premierLogic.ts`:**

```typescript
// In generateChallenge():
async generateChallenge(difficulty: string, excludeMovieIds: number[]): Promise<PremierChallengeData | null> {
  const event = eventModeService.getActiveEvent();
  
  if (event?.id === "oscars-2026") {
    return this.generateOscarPremierChallenge(difficulty, excludeMovieIds);
  }
  
  // ... existing logic unchanged
}

private async generateOscarPremierChallenge(difficulty: string, excludeMovieIds: number[]): Promise<PremierChallengeData | null> {
  const MAX_RETRIES = 15;
  const { yearSpread } = this.getDifficultyParams(difficulty);
  
  // Get Oscar movies with TMDB data
  const oscarMovies = await eventModeService.getOscarMoviesWithDetails({
    minYear: difficulty === "medium" ? 1990 : undefined,
    // Easy: only Best Picture + major acting categories
    categories: difficulty === "easy" 
      ? ["best_picture", "best_actor", "best_actress", "directing"] 
      : undefined,
  });
  
  // Filter, shuffle, pick 9 with unique years
  // ... same year-spread and collection logic as current
  // Poster paths come from TMDB details fetch
}
```

**Year uniqueness challenge:** Oscar winners cluster in certain years (e.g., many winners from 2019, 2023). The current unique-year constraint may need more retries with the Oscar pool. Fallback: allow 2 movies from the same year if retries exceed threshold.

---

## iOS App Changes

### Event Mode Banner

**When active:** Show a banner at the top of the game mode selection screen.

**Endpoint check:** On app launch (and foreground resume), call `GET /api/event-mode`. Cache the result for the session.

**Banner design:**
```
┌─────────────────────────────────────┐
│ 🏆 OSCARS MODE                     │
│ All games feature Oscar-winning     │
│ movies & actors — 12 days left      │
└─────────────────────────────────────┘
```

- Gold background with subtle gradient (matching the app's gold accent)
- Dismissible but reappears each session
- "X days left" countdown from `daysRemaining`
- Tapping opens a detail sheet explaining the event

**When inactive:** No banner, no API-related UI changes. The endpoint returns `{ active: false }` and the banner component is hidden.

### No App Store Update Required

The banner component should be built now and shipped with the next update. It will show/hide based entirely on the server response. Future events just need a server config change.

---

## Implementation Tasks

### Phase 1: Backend Core (Day 1)

1. **Create `eventMode.ts` service**
   - [ ] Define `EventMode` interface and hardcoded events array
   - [ ] Implement `getActiveEvent()` — check current date against event windows
   - [ ] Implement `loadOscarData()` — read and parse `oscar-winners.json`
   - [ ] Implement `getOscarMoviePool(options)` — return TMDB IDs filtered by year/category
   - [ ] Implement `getOscarActorPool(options)` — return Actor objects for 2026 nominees

2. **Create TMDB resolution script**
   - [ ] `scripts/resolve-oscar-tmdb-ids.ts` — batch IMDb→TMDB resolution
   - [ ] Output to `data/oscar-tmdb-cache.json`
   - [ ] Run once, commit the cache file

3. **Add `/api/event-mode` endpoint**
   - [ ] GET route in `routes.ts`
   - [ ] Returns active event info or `{ active: false }`

### Phase 2: Game Mode Integration (Day 1-2)

4. **Cast Call Oscar mode**
   - [ ] Add `generateOscarCastCallChallenge()` method
   - [ ] Gate on `eventModeService.getActiveEvent()` in `generateCastCallChallenge()`
   - [ ] Test with all 3 difficulties

5. **Première Oscar mode**
   - [ ] Add `generateOscarPremierChallenge()` method
   - [ ] Gate on active event in `generateChallenge()`
   - [ ] Handle year-uniqueness with Oscar pool
   - [ ] Test with all 3 difficulties

6. **Six Degrees Oscar mode**
   - [ ] Override actor pool in `getActorPoolForDifficulty()` when event active
   - [ ] Build 2026 nominee Actor pool from dataset (need TMDB person IDs → Actor objects)
   - [ ] Test pair generation with ~25 nominee pool

### Phase 3: iOS App (Day 2)

7. **Event mode API client**
   - [ ] Add `EventMode` model
   - [ ] Add `fetchEventMode()` to API client
   - [ ] Cache result in session

8. **Event banner component**
   - [ ] Create `EventBanner` SwiftUI view
   - [ ] Gold accent styling, countdown text
   - [ ] Add to game mode selection screen
   - [ ] Show/hide based on API response

### Phase 4: Launch (Day 2-3)

9. **Deploy and verify**
   - [ ] Deploy backend with event mode
   - [ ] Verify all 3 game modes generate Oscar challenges
   - [ ] Submit iOS update (or use existing banner capability)
   - [ ] Announce on X via @6DegreesTrivia

---

## Data Model

No new database tables needed. The existing `daily_challenges`, `cast_call_challenges`, and `premier_challenges` tables store challenges the same way regardless of source. The event mode only changes *how* challenges are generated, not *how* they're stored or played.

**Optional enhancement:** Add an `event_id` column to challenge tables to track which event generated them. Useful for analytics but not blocking.

---

## Validation

```bash
# Verify event mode endpoint
curl -s https://www.sixdegrees.app/api/event-mode | jq

# Verify Oscar challenges are being generated
curl -s https://www.sixdegrees.app/api/daily-challenges | jq '.[].startActorName'
curl -s https://www.sixdegrees.app/api/cast-call/today | jq '.[].movieTitle'
curl -s https://www.sixdegrees.app/api/premier/daily | jq '.[0].movies[].title'

# Check TMDB resolution cache
cat data/oscar-tmdb-cache.json | jq 'length'
```

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Oscar pool too small for 7 days | Repeated movies | Pool is 742 films — more than enough. Easy mode (100+ films) is the tightest but still 5x what we need |
| Historical films missing TMDB cast data | Cast Call fails for old movies | Pre-filter to movies with ≥10 cast members in TMDB. Skip pre-1950 for Cast Call |
| Six Degrees nominee pairs are too easy/hard | Bad difficulty curve | The connecting path uses all TMDB movies (not just Oscar films), so distance still varies naturally |
| TMDB ID resolution fails for some IMDb IDs | Missing movies from pool | Non-blocking — just skip those films. Pre-resolve and validate before launch |
| Event doesn't end cleanly | Stuck in Oscar mode | `getActiveEvent()` is purely date-based — `endDate < today` = null. No state to clean up |

---

## Future Event Mode Ideas

Once the system is built, adding new events is just a config entry:

| Event | When | Movie Pool |
|-------|------|-----------|
| **Oscars Mode** | Post-Academy Awards (March) | Oscar winners |
| **Spooky Season** | October | Horror genre films |
| **Summer Blockbusters** | June-August | Top box office films |
| **Holiday Classics** | December | Holiday/Christmas films |
| **Director Spotlight** | Any time | Single director's filmography |
| **Decade Mode** | Any time | All films from one decade |

---

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Event config in code vs DB | Code (hardcoded array) | Events are infrequent, no admin UI needed for v1 |
| Six Degrees: restrict endpoints only | Yes | Restricting connecting films would make it unsolvable. Only start/end actors are Oscar nominees |
| Cast Call: difficulty by era | Easy=2000+, Medium=1990+, Hard=all | Matches existing difficulty pattern, keeps recognition gradient |
| TMDB resolution strategy | Pre-resolve + cache file | Zero runtime API calls, deterministic |
| Oscar dataset scope | Winners only (not nominees) for movie pool | 742 films is plenty. Adding all nominees would be 3000+ and dilute the "Oscar winner" brand |
| 2026 nominees for Six Degrees | Include all acting + directing nominees | 25+ people gives enough pair variety for 7 days |

## Context for Coding Agent

- The existing challenge generation functions (`generateCastCallChallenge`, `generateChallenge`, `generateDailyActors`) all follow the same pattern: get candidates → filter → retry loop. Oscar mode just swaps the candidate source.
- All TMDB API interactions go through `tmdbService` — don't bypass it.
- The Oscar dataset is at `data/oscar-winners.json` — already committed to the repo.
- `tmdbService.discoverMovies()` accepts arbitrary params — but Oscar mode doesn't use discover. It uses a pre-built movie list instead.
- For Six Degrees, `Actor` type is `{ id: number; name: string; profile_path: string | null }`. The 2026 nominees need to be converted to this shape from the dataset's TMDB person IDs.
- The current `getDifficultyParams()` pattern in each service is the right place to branch — check event mode, return Oscar-specific params.
- Test by setting event dates to include today, then hitting the challenge generation endpoints.
- Run `npm run build` or `npx tsc --noEmit` to verify TypeScript compiles.
