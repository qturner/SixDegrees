import { tmdbService } from "./tmdb.js";
import { eventModeService } from "./eventMode.js";

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
  async generateCastCallChallenge(difficulty: CastCallDifficulty, excludeMovieIds: number[], targetDate?: string): Promise<CastCallChallengeData | null> {
    const MAX_RETRIES = 10;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        let movie: { id: number; title: string } | undefined;
        let isOscarMode = false;

        // Oscar event mode: pick from Oscar movie pool instead of TMDB discover
        if (targetDate) {
          const event = eventModeService.getEventForDate(targetDate);
          if (event.active) {
            isOscarMode = true;
            const pool = eventModeService.getOscarMoviePool({
              yearMin: difficulty === "easy" ? 2000 : difficulty === "medium" ? 1990 : undefined,
            });
            const oscarCandidates = pool.filter(id => !excludeMovieIds.includes(id));
            if (oscarCandidates.length === 0) continue;
            const tmdbId = oscarCandidates[Math.floor(Math.random() * oscarCandidates.length)];
            const details = await tmdbService.getMovieDetails(tmdbId);
            if (!details) continue;

            // Preserve existing language/genre filters
            if (details.originalLanguage !== "en") continue;
            const genreIds = details.genres.map(g => g.id);
            if (genreIds.includes(16) || genreIds.includes(99)) continue;

            movie = { id: tmdbId, title: details.title };
          }
        }

        if (!movie && !isOscarMode) {
          // Normal flow: pick from TMDB discover API
          const { page, minVotes, releaseDateGte } = this.getDifficultyParams(difficulty);

          const discoverParams: Record<string, string> = {
            sort_by: "popularity.desc",
            with_original_language: "en",
            without_genres: "16,99",
            page: page.toString(),
            "vote_count.gte": minVotes.toString(),
          };

          if (releaseDateGte) {
            discoverParams["primary_release_date.gte"] = releaseDateGte;
          }

          const response = await tmdbService.discoverMovies(discoverParams);

          if (!response.results || response.results.length === 0) {
            continue;
          }

          const candidates = response.results.filter(m => !excludeMovieIds.includes(m.id));
          if (candidates.length === 0) continue;

          movie = candidates[Math.floor(Math.random() * candidates.length)];
        }

        if (!movie) {
          continue;
        }

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

  private getDifficultyParams(difficulty: CastCallDifficulty): { page: number; minVotes: number; releaseDateGte?: string } {
    switch (difficulty) {
      case "easy": {
        const page = Math.floor(Math.random() * 3) + 1; // pages 1-3
        return { page, minVotes: 500 };
      }
      case "medium": {
        const page = Math.floor(Math.random() * 7) + 4; // pages 4-10
        return { page, minVotes: 200, releaseDateGte: "1990-01-01" };
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

  /**
   * Generate 2 decoy movies for the final guess poster pick.
   * Tries shared-cast movies first, then falls back to discover API.
   */
  async getDecoyMovies(
    correctMovieId: number,
    correctGenreIds: number[],
    correctYear: number,
    correctCollectionId: number | null,
    castActorIds: number[]
  ): Promise<Array<{ movieId: number; title: string; year: number; posterPath: string }>> {
    const decoys: Array<{ movieId: number; title: string; year: number; posterPath: string; score: number }> = [];
    const usedIds = new Set<number>([correctMovieId]);

    // Tier 1: Best decoys — movies sharing cast members
    const actorSample = castActorIds.slice(0, 5);
    const movieCounts = new Map<number, { count: number; movie: any }>();

    for (const actorId of actorSample) {
      try {
        const movies = await tmdbService.getActorMoviesDetailed(actorId);
        for (const movie of movies) {
          if (usedIds.has(movie.id)) continue;
          if (!movie.posterPath) continue;
          if (movie.originalLanguage !== "en") continue;
          if (movie.voteCount < 200) continue;
          if (correctCollectionId) {
            // Check collection via extended details later if needed
          }
          const movieYear = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : 0;
          if (Math.abs(movieYear - correctYear) > 10) continue;
          const sharedGenres = movie.genreIds.filter(g => correctGenreIds.includes(g));
          if (sharedGenres.length === 0) continue;

          const existing = movieCounts.get(movie.id);
          if (existing) {
            existing.count++;
          } else {
            movieCounts.set(movie.id, { count: 1, movie: { ...movie, year: movieYear } });
          }
        }
      } catch (e) {
        // Continue with other actors
      }
    }

    // Filter out same-collection movies
    const candidates = Array.from(movieCounts.entries())
      .filter(([, v]) => v.count >= 2)
      .sort((a, b) => b[1].count - a[1].count);

    for (const [movieId, { movie }] of candidates) {
      if (decoys.length >= 2) break;
      if (usedIds.has(movieId)) continue;

      // Check collection if needed
      if (correctCollectionId) {
        const details = await tmdbService.getMovieDetailsExtended(movieId);
        if (details?.collectionId === correctCollectionId) continue;
      }

      decoys.push({
        movieId,
        title: movie.title,
        year: movie.year,
        posterPath: movie.posterPath,
        score: movie.voteCount,
      });
      usedIds.add(movieId);
    }

    // Helper to check collection membership for discover-based candidates
    const isInSameCollection = async (movieId: number): Promise<boolean> => {
      if (!correctCollectionId) return false;
      try {
        const details = await tmdbService.getMovieDetailsExtended(movieId);
        return details?.collectionId === correctCollectionId;
      } catch {
        return false;
      }
    };

    // Tier 2: Good fallback — discover with primary genre, ±5 years
    if (decoys.length < 2 && correctGenreIds.length > 0) {
      try {
        const response = await tmdbService.discoverMovies({
          with_genres: correctGenreIds[0].toString(),
          "primary_release_date.gte": `${correctYear - 5}-01-01`,
          "primary_release_date.lte": `${correctYear + 5}-12-31`,
          with_original_language: "en",
          "vote_count.gte": "200",
          sort_by: "popularity.desc",
        });
        for (const movie of response.results) {
          if (decoys.length >= 2) break;
          if (usedIds.has(movie.id)) continue;
          if (!movie.poster_path) continue;
          if (await isInSameCollection(movie.id)) continue;
          const movieYear = movie.release_date ? new Date(movie.release_date).getFullYear() : 0;
          decoys.push({
            movieId: movie.id,
            title: movie.title,
            year: movieYear,
            posterPath: movie.poster_path,
            score: movie.vote_count,
          });
          usedIds.add(movie.id);
        }
      } catch (e) {
        console.error("Decoy fallback tier 2 failed:", e);
      }
    }

    // Tier 3: Broad fallback — widen to ±10 years, any overlapping genre, 100+ votes
    if (decoys.length < 2) {
      try {
        const genreParam = correctGenreIds.length > 0 ? correctGenreIds.join(",") : "";
        const params: Record<string, string> = {
          "primary_release_date.gte": `${correctYear - 10}-01-01`,
          "primary_release_date.lte": `${correctYear + 10}-12-31`,
          with_original_language: "en",
          "vote_count.gte": "100",
          sort_by: "popularity.desc",
        };
        if (genreParam) params.with_genres = genreParam;
        const response = await tmdbService.discoverMovies(params);
        for (const movie of response.results) {
          if (decoys.length >= 2) break;
          if (usedIds.has(movie.id)) continue;
          if (!movie.poster_path) continue;
          if (await isInSameCollection(movie.id)) continue;
          const movieYear = movie.release_date ? new Date(movie.release_date).getFullYear() : 0;
          decoys.push({
            movieId: movie.id,
            title: movie.title,
            year: movieYear,
            posterPath: movie.poster_path,
            score: movie.vote_count,
          });
          usedIds.add(movie.id);
        }
      } catch (e) {
        console.error("Decoy fallback tier 3 failed:", e);
      }
    }

    // Last resort: popular movies from same decade
    if (decoys.length < 2) {
      try {
        const decade = Math.floor(correctYear / 10) * 10;
        const response = await tmdbService.discoverMovies({
          "primary_release_date.gte": `${decade}-01-01`,
          "primary_release_date.lte": `${decade + 9}-12-31`,
          with_original_language: "en",
          "vote_count.gte": "50",
          sort_by: "popularity.desc",
        });
        for (const movie of response.results) {
          if (decoys.length >= 2) break;
          if (usedIds.has(movie.id)) continue;
          if (!movie.poster_path) continue;
          if (await isInSameCollection(movie.id)) continue;
          const movieYear = movie.release_date ? new Date(movie.release_date).getFullYear() : 0;
          decoys.push({
            movieId: movie.id,
            title: movie.title,
            year: movieYear,
            posterPath: movie.poster_path,
            score: movie.vote_count,
          });
          usedIds.add(movie.id);
        }
      } catch (e) {
        console.error("Decoy last resort failed:", e);
      }
    }

    return decoys.slice(0, 2).map(({ movieId, title, year, posterPath }) => ({
      movieId, title, year, posterPath,
    }));
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
