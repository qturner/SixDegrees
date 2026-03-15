# Cast Call Medium Difficulty — 1990+ Year Filter PRD
Generated: 2026-03-15

## Overview

Add a release year filter to Cast Call medium difficulty so that only movies from 1990 to present are selected. This makes medium more consistent — players are more likely to recognize the cast of post-1990 films, creating a better difficulty curve between easy (top popular films) and hard (deep cuts from any era).

## Problem Statement

- **Who:** Six Degrees players on Cast Call medium difficulty
- **Pain:** Medium difficulty sometimes pulls obscure pre-1990 movies that feel randomly hard rather than "medium." The cast may be unrecognizable regardless of billing position, making it feel like hard difficulty with extra steps.
- **Why now:** Easy difficulty is dialed in perfectly. Hard is intentionally obscure and stays as-is. Medium needs guardrails to hit the sweet spot.

## Scope

**In scope:**
- Filter Cast Call medium movie selection to 1990+ release dates
- No changes to easy or hard difficulty
- No changes to actor selection logic, reveal order, or scoring

**Out of scope:**
- UI changes
- Hard difficulty adjustments
- Six Degrees or Première changes

## Technical Architecture

### Affected File

**`api/_server/services/castCallLogic.ts`** — single file change

### Current Flow

1. `generateCastCallChallenge(difficulty, excludeMovieIds)` is called
2. `getDifficultyParams(difficulty)` returns `{ page, minVotes }` for the TMDB discover query
3. `tmdbService.discoverMovies()` is called with `sort_by`, `with_original_language`, `without_genres`, `page`, and `vote_count.gte`
4. A random movie is picked from results

### Current `getDifficultyParams` Values

| Difficulty | Pages | Min Votes | Year Filter |
|------------|-------|-----------|-------------|
| easy | 1-3 | 500 | none |
| medium | 4-10 | 200 | **none** |
| hard | 11-30 | 100 | none |

### Proposed Change

Add an optional `minYear` field to the return type of `getDifficultyParams`. When present, pass `"primary_release_date.gte"` to the TMDB discover API.

| Difficulty | Pages | Min Votes | Year Filter |
|------------|-------|-----------|-------------|
| easy | 1-3 | 500 | none |
| medium | 4-10 | 200 | **≥ 1990-01-01** |
| hard | 11-30 | 100 | none |

## Implementation Tasks

### 1. Update `getDifficultyParams` return type and medium case

**File:** `api/_server/services/castCallLogic.ts`

Update the method signature to include an optional `releaseYear` filter:

```typescript
private getDifficultyParams(difficulty: CastCallDifficulty): { 
  page: number; 
  minVotes: number;
  releaseDateGte?: string;
} {
  switch (difficulty) {
    case "easy": {
      const page = Math.floor(Math.random() * 3) + 1;
      return { page, minVotes: 500 };
    }
    case "medium": {
      const page = Math.floor(Math.random() * 7) + 4;
      return { page, minVotes: 200, releaseDateGte: "1990-01-01" };
    }
    case "hard": {
      const page = Math.floor(Math.random() * 20) + 11;
      return { page, minVotes: 100 };
    }
    default: {
      const page = Math.floor(Math.random() * 3) + 1;
      return { page, minVotes: 500 };
    }
  }
}
```

### 2. Pass the filter to the discover API call

In `generateCastCallChallenge`, update the discover call to use the new param:

```typescript
const { page, minVotes, releaseDateGte } = this.getDifficultyParams(difficulty);

const discoverParams: Record<string, string> = {
  sort_by: "popularity.desc",
  with_original_language: "en",
  without_genres: "16,99",  // exclude Animation, Documentary
  page: page.toString(),
  "vote_count.gte": minVotes.toString(),
};

if (releaseDateGte) {
  discoverParams["primary_release_date.gte"] = releaseDateGte;
}

const response = await tmdbService.discoverMovies(discoverParams);
```

### 3. Verify no downstream effects

- The `year` field in `CastCallChallengeData` is derived from `details.releaseDate` later in the function — no change needed
- Actor selection logic (`selectAndOrderActors`) is billing-order based — unaffected
- Decoy generation uses the correct movie's year for range filtering — unaffected
- Scoring (`calculateStars`) is based on actors revealed — unaffected

## Validation

After deploying, verify by checking a few days of generated medium challenges:

```bash
# Check today's challenges
curl -s https://www.sixdegrees.app/api/cast-call/today | jq '.[] | select(.difficulty == "medium") | {movieTitle, movieYear}'
```

All medium movies should have `movieYear >= 1990`.

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Year cutoff | 1990 | Q's suggestion — covers 35+ years of recognizable films |
| Hard unchanged | Keep as-is | Hard is intentionally obscure — any era is fair game |
| Easy unchanged | Keep as-is | Already "dialed in perfectly" per Q |
| Filter method | TMDB `primary_release_date.gte` | Native API param, zero performance cost, no post-filtering needed |

## Open Questions

- None — this is a clean, scoped change

## Context for Coding Agent

- The TMDB discover API accepts `primary_release_date.gte` as a string in `YYYY-MM-DD` format
- `tmdbService.discoverMovies()` takes a `Record<string, string>` so any valid TMDB discover param can be passed through
- The current code destructures `getDifficultyParams` as `const { page, minVotes }` — this needs to be updated to also destructure `releaseDateGte`
- Only one file needs to change: `api/_server/services/castCallLogic.ts`
- Run `npm run build` or `npx tsc --noEmit` to verify TypeScript compiles
