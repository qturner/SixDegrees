import { tmdbService } from "./tmdb.js";

type CastCallDifficulty = "easy" | "medium" | "hard";

interface CastCallActor {
  id: number;
  name: string;
  profilePath: string | null;
  revealOrder: number;
}

export interface CastCallChallengeData {
  movieId: number;
  movieTitle: string;
  movieYear: number;
  moviePosterPath: string | null;
  genre: string;
  actors: CastCallActor[];
}

export class CastCallService {
  async generateCastCallChallenge(difficulty: CastCallDifficulty, excludeMovieIds: number[]): Promise<CastCallChallengeData | null> {
    const MAX_RETRIES = 10;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Pick a random page based on difficulty
        const { page, minVotes } = this.getDifficultyParams(difficulty);

        const response = await tmdbService.discoverMovies({
          sort_by: "popularity.desc",
          with_original_language: "en",
          without_genres: "16,99",
          page: page.toString(),
          "vote_count.gte": minVotes.toString(),
        });

        if (!response.results || response.results.length === 0) {
          continue;
        }

        // Filter out excluded movies and pick random
        const candidates = response.results.filter(m => !excludeMovieIds.includes(m.id));
        if (candidates.length === 0) continue;

        const movie = candidates[Math.floor(Math.random() * candidates.length)];

        // Get cast with billing order
        const cast = await tmdbService.getMovieCastWithOrder(movie.id);

        // Filter to actors with photos
        const qualifiedActors = cast.filter(a => a.profilePath !== null);

        // Require more cast for harder difficulties to ensure good spread
        const minCast = difficulty === "hard" ? 20 : difficulty === "medium" ? 15 : 10;
        if (qualifiedActors.length < minCast) {
          console.log(`Movie ${movie.title} only has ${qualifiedActors.length} actors with photos (need ${minCast} for ${difficulty}), retrying...`);
          continue;
        }

        // Sort by billing order ASC (leads first)
        const sorted = [...qualifiedActors].sort((a, b) => a.order - b.order);

        // Select and order actors based on difficulty
        const actors = this.selectAndOrderActors(sorted, difficulty);
        if (actors.length < 10) {
          console.log(`Movie ${movie.title} only yielded ${actors.length} unique actors for ${difficulty}, retrying...`);
          continue;
        }

        // Get movie details for genre and year
        const details = await tmdbService.getMovieDetails(movie.id);
        if (!details) continue;

        const genre = details.genres.length > 0 ? details.genres[0].name : "Unknown";
        const year = details.releaseDate ? new Date(details.releaseDate).getFullYear() : 0;

        return {
          movieId: movie.id,
          movieTitle: details.title,
          movieYear: year,
          moviePosterPath: details.posterPath,
          genre,
          actors,
        };
      } catch (error) {
        console.error(`Cast Call generation attempt ${attempt + 1} failed:`, error);
      }
    }

    console.error(`Failed to generate Cast Call challenge after ${MAX_RETRIES} retries`);
    return null;
  }

  /**
   * Select actors and assign reveal order based on difficulty.
   * Easy: top 10 billed, revealed in billing order (leads first).
   * Medium: mixed from across cast, mid-tier first, leads last.
   * Hard: deep cast first, leads revealed last.
   */
  private selectAndOrderActors(
    sortedByBilling: Array<{ id: number; name: string; profilePath: string | null; order: number }>,
    difficulty: CastCallDifficulty
  ): CastCallActor[] {
    const total = sortedByBilling.length;

    if (difficulty === "easy") {
      // Top 10 billed, revealed in billing order (lead first)
      return sortedByBilling.slice(0, 10).map((a, i) => ({
        id: a.id,
        name: a.name,
        profilePath: a.profilePath,
        revealOrder: i + 1,
      }));
    }

    // Medium & Hard: pick from specific billing tiers, reveal strategically
    // Array index = reveal order (0-1 revealed first, 8-9 revealed last)
    let billingPositions: number[];

    if (difficulty === "medium") {
      // Mid-tier first, leads last
      billingPositions = [4, 5, 7, 9, 11, 14, 2, 3, 0, 1];
    } else {
      // Hard: deep cast first, leads last
      billingPositions = [9, 11, 14, 17, 19, 7, 5, 3, 1, 0];
    }

    const picked: typeof sortedByBilling = [];
    const used = new Set<number>();

    for (const pos of billingPositions) {
      // Clamp to available cast size
      let idx = Math.min(pos, total - 1);
      // Skip if already picked, find next available
      while (used.has(idx) && idx < total - 1) idx++;
      if (used.has(idx)) {
        // Try going backwards
        idx = Math.min(pos, total - 1);
        while (used.has(idx) && idx > 0) idx--;
      }
      if (!used.has(idx)) {
        used.add(idx);
        picked.push(sortedByBilling[idx]);
      }
    }

    return picked.map((a, i) => ({
      id: a.id,
      name: a.name,
      profilePath: a.profilePath,
      revealOrder: i + 1,
    }));
  }

  private getDifficultyParams(difficulty: CastCallDifficulty): { page: number; minVotes: number } {
    switch (difficulty) {
      case "easy": {
        const page = Math.floor(Math.random() * 3) + 1; // pages 1-3
        return { page, minVotes: 500 };
      }
      case "medium": {
        const page = Math.floor(Math.random() * 7) + 4; // pages 4-10
        return { page, minVotes: 200 };
      }
      case "hard": {
        const page = Math.floor(Math.random() * 20) + 11; // pages 11-30
        return { page, minVotes: 100 };
      }
      default: {
        const page = Math.floor(Math.random() * 3) + 1;
        return { page, minVotes: 500 };
      }
    }
  }

  static calculateStars(actorsRevealed: number, correct: boolean): number {
    if (!correct) return 0;
    if (actorsRevealed <= 2) return 5;
    if (actorsRevealed <= 4) return 4;
    if (actorsRevealed <= 6) return 3;
    if (actorsRevealed <= 8) return 2;
    return 1; // 10 actors revealed
  }
}

export const castCallService = new CastCallService();
