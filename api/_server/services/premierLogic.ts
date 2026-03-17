import { tmdbService } from "./tmdb.js";
import { eventModeService } from "./eventMode.js";

interface PremierMovie {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseYear: number;
  revealOrder: number;
}

export interface PremierChallengeData {
  movies: PremierMovie[];
}

export class PremierService {
  async generateChallenge(difficulty: string, excludeMovieIds: number[], targetDate?: string): Promise<PremierChallengeData | null> {
    const MAX_RETRIES = 15;
    let fallbackLevel = 0;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        let { pageMin, pageMax, minVotes, yearSpread } = this.getDifficultyParams(difficulty);

        // Apply fallback relaxations
        if (attempt >= 10 && fallbackLevel < 3) {
          fallbackLevel = 3;
          minVotes = Math.floor(minVotes * 0.5);
          pageMax = pageMax * 2;
          yearSpread = Math.floor(yearSpread * 0.5);
          console.log(`Premier generation fallback level 3: minVotes=${minVotes}, pageMax=${pageMax}, yearSpread=${yearSpread}`);
        } else if (attempt >= 7 && fallbackLevel < 2) {
          fallbackLevel = 2;
          pageMax = pageMax * 2;
          console.log(`Premier generation fallback level 2: pageMax=${pageMax}`);
        } else if (attempt >= 5 && fallbackLevel < 1) {
          fallbackLevel = 1;
          yearSpread = Math.floor(yearSpread * 0.5);
          console.log(`Premier generation fallback level 1: yearSpread=${yearSpread}`);
        }

        const collected: PremierMovie[] = [];
        const usedYears = new Set<number>();
        const usedIds = new Set<number>(excludeMovieIds);

        // Excluded genres: animation (16), documentary (99), TV movies (10770)
        const excludeGenres = "16,99,10770";

        const allCandidates: any[] = [];

        // Oscar event mode: source from Oscar movie pool with non-overlapping year ranges
        let isOscarMode = false;
        if (targetDate) {
          const event = eventModeService.getEventForDate(targetDate);
          if (event.active) {
            isOscarMode = true;
            const yearOpts = difficulty === "easy"
              ? { yearMin: 2000 }
              : difficulty === "medium"
              ? { yearMin: 1970, yearMax: 1999 }
              : { yearMax: 1969 };

            const pool = eventModeService.getOscarMoviePool(yearOpts);
            // Shuffle
            const shuffled = [...pool].sort(() => Math.random() - 0.5);
            const targetCandidateCount = 40;

            for (const tmdbId of shuffled) {
              if (usedIds.has(tmdbId)) continue;
              const details = await tmdbService.getMovieDetails(tmdbId);
              if (!details?.posterPath || !details?.releaseDate) continue;
              if (details.originalLanguage !== "en") continue;

              // Preserve existing genre filters
              const genreIds = details.genres.map(g => g.id);
              if (genreIds.includes(16) || genreIds.includes(99) || genreIds.includes(10770)) continue;

              allCandidates.push({
                id: details.id,
                title: details.title,
                poster_path: details.posterPath,
                release_date: details.releaseDate,
              });

              if (allCandidates.length >= targetCandidateCount) {
                break;
              }
            }
          }
        }

        if (!isOscarMode) {
          // Normal flow: fetch from TMDB discover API
          const pagesToFetch = 3;
          for (let p = 0; p < pagesToFetch; p++) {
            const page = Math.floor(Math.random() * (pageMax - pageMin + 1)) + pageMin;
            const response = await tmdbService.discoverMovies({
              sort_by: "popularity.desc",
              with_original_language: "en",
              without_genres: excludeGenres,
              page: page.toString(),
              "vote_count.gte": minVotes.toString(),
            });

            if (response.results) {
              allCandidates.push(...response.results);
            }
          }
        }

        // Shuffle candidates
        for (let i = allCandidates.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allCandidates[i], allCandidates[j]] = [allCandidates[j], allCandidates[i]];
        }

        for (const movie of allCandidates) {
          if (collected.length >= 9) break;
          if (usedIds.has(movie.id)) continue;
          if (!movie.poster_path) continue;

          const releaseDate = movie.release_date;
          if (!releaseDate) continue;

          const year = new Date(releaseDate).getFullYear();
          if (isNaN(year) || year < 1920) continue;
          if (usedYears.has(year)) continue;

          usedIds.add(movie.id);
          usedYears.add(year);
          collected.push({
            tmdbId: movie.id,
            title: movie.title,
            posterPath: movie.poster_path,
            releaseYear: year,
            revealOrder: 0, // assigned later
          });
        }

        if (collected.length < 9) {
          console.log(`Premier attempt ${attempt + 1}: only collected ${collected.length}/9 movies, retrying...`);
          continue;
        }

        // Validate year spread
        const years = collected.map(m => m.releaseYear).sort((a, b) => a - b);
        const spread = years[years.length - 1] - years[0];
        if (spread < yearSpread) {
          console.log(`Premier attempt ${attempt + 1}: year spread ${spread} < ${yearSpread}, retrying...`);
          continue;
        }

        // Sort chronologically — this is the answer key
        collected.sort((a, b) => a.releaseYear - b.releaseYear);

        // Assign reveal order using tension curve
        this.assignRevealOrder(collected);

        return { movies: collected };
      } catch (error) {
        console.error(`Premier generation attempt ${attempt + 1} failed:`, error);
      }
    }

    console.error(`Failed to generate Premier challenge after ${MAX_RETRIES} retries`);
    return null;
  }

  private getDifficultyParams(difficulty: string): { pageMin: number; pageMax: number; minVotes: number; yearSpread: number } {
    switch (difficulty) {
      case "easy":
        return { pageMin: 1, pageMax: 5, minVotes: 1000, yearSpread: 20 };
      case "medium":
        return { pageMin: 3, pageMax: 15, minVotes: 300, yearSpread: 10 };
      case "hard":
        return { pageMin: 8, pageMax: 30, minVotes: 100, yearSpread: 15 };
      default:
        return { pageMin: 1, pageMax: 5, minVotes: 1000, yearSpread: 20 };
    }
  }

  /**
   * Assigns reveal order based on tension curve:
   * - Reveal 1-2: opposite ends of timeline (anchors)
   * - Reveal 3-4: near middle (easy inserts)
   * - Reveal 5-6: create tight clusters (ramp)
   * - Reveal 7-9: between tight clusters (peak)
   *
   * Movies are already sorted chronologically (indices 0-8).
   */
  private assignRevealOrder(movies: PremierMovie[]): void {
    // Indices in chronological order: 0,1,2,3,4,5,6,7,8
    // Reveal 1-2: anchors (first and last)
    // Reveal 3-4: middle area
    // Reveal 5-6: create tight clusters
    // Reveal 7-9: fill remaining gaps

    const revealMapping: number[] = [
      0, // reveal 1: earliest movie
      8, // reveal 2: latest movie
      4, // reveal 3: middle
      3, // reveal 4: near middle
      1, // reveal 5: tight cluster with anchor
      7, // reveal 6: tight cluster with anchor
      2, // reveal 7: between clusters
      5, // reveal 8: between clusters
      6, // reveal 9: last remaining
    ];

    for (let revealIdx = 0; revealIdx < revealMapping.length; revealIdx++) {
      movies[revealMapping[revealIdx]].revealOrder = revealIdx + 1;
    }
  }

  static calculateReels(moviesSorted: number): number {
    if (moviesSorted >= 9) return 5;
    if (moviesSorted >= 7) return 4;
    if (moviesSorted >= 5) return 3;
    if (moviesSorted >= 3) return 2;
    if (moviesSorted >= 2) return 1;
    return 0;
  }
}

export const premierService = new PremierService();
