import { Actor, Movie } from "../../../shared/schema.js";

interface TMDbConfig {
  apiKey: string;
  baseUrl: string;
  imageBaseUrl: string;
}

interface TMDbResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

interface TMDbActor {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department?: string;
  popularity?: number;
}

interface TMDbMovie {
  id: number;
  title: string;
  release_date?: string;
  poster_path: string | null;
  overview?: string;
  vote_average: number;
  vote_count: number;
  popularity?: number;
  genre_ids?: number[];
}

interface TMDbCredit {
  id: number;
  cast: Array<{
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
    known_for_department: string;
  }>;
  crew: Array<{
    id: number;
    name: string;
    job: string;
    profile_path: string | null;
    known_for_department: string;
  }>;
}

interface TMDbPersonMovies {
  id: number;
  cast: Array<{
    id: number;
    title: string;
    release_date: string;
    poster_path: string | null;
    character: string;
    genre_ids: number[];
    popularity: number;
    vote_average: number;
    vote_count: number;
    original_language: string;
  }>;
}

class TMDbService {
  private config: TMDbConfig;

  // Genre IDs to filter out
  private readonly EXCLUDED_GENRES = {
    ANIMATION: 16,
    DOCUMENTARY: 99,
    TV_MOVIE: 10770, // TV Movies often include stand-up specials and single-person shows
    MUSIC: 10402, // Music documentaries and concert films
  };

  private static readonly EXCLUDED_TITLE_PATTERNS = [
    /\bmaking(?:\s+|-)of\b/i,
    /\bbehind\s+the\s+scenes\b/i,
    /\ba\s+look\s+behind\b/i,
  ];

  // Actors to exclude (primarily voice actors, stand-up comedians, or those not suitable for the game)
  private readonly EXCLUDED_ACTORS = new Set([
    // Specific exclusions based on user feedback
    'Brahmanandam', // Prolific Indian actor, high credit count but mostly non-English
    'Amitabh Bachchan', // Bollywood legend, not primarily English

    // Voice actors
    'Cree Summer',
    'Tara Strong',
    'Frank Welker',
    'Grey Griffin',
    'Jim Cummings',
    'Tom Kenny',
    'Billy West',
    'Maurice LaMarche',
    'Rob Paulsen',
    'Dee Bradley Baker',
    'Charlie Adler',
    'Nancy Cartwright',
    'Hank Azaria',
    'Dan Castellaneta',
    'Julie Kavner',
    'Yeardley Smith',
    'Harry Shearer',
    'Phil LaMarr',
    'Carlos Alazraqui',
    'Kath Soucie',
    'Jeff Bennett',
    'Corey Burton',
    'Kevin Michael Richardson',
    'John DiMaggio',
    'Mark Hamill', // Primarily voice work in recent years
    // Stand-up comedians (primarily solo performers)
    'Dave Chappelle',
    'Chris Rock',
    'Eddie Murphy', // Primarily known for solo stand-up, though has acted
    'Richard Pryor',
    'George Carlin',
    'Robin Williams', // Though he acted, much of his filmography is solo or voice work
    'Joan Rivers',
    'Andrew Dice Clay',
    'Sam Kinison'
  ]);

  constructor() {
    this.config = {
      apiKey: process.env.TMDB_API_KEY || process.env.API_KEY || "",
      baseUrl: "https://api.themoviedb.org/3",
      imageBaseUrl: "https://image.tmdb.org/t/p/w500",
    };

    if (!this.config.apiKey) {
      console.warn("TMDB API Key not found. Please set TMDB_API_KEY or API_KEY environment variable.");
    }
  }

  // Simple in-memory cache for actor details to speed up filtering
  private actorDetailsCache = new Map<number, any>();
  private CACHE_TTL = 3600000; // 1 hour
  private movieCreditsCache = new Map<number, { data: Actor[], timestamp: number }>();
  private actorMoviesCache = new Map<number, { data: Movie[], timestamp: number }>();

  private isExcludedTitle(title?: string): boolean {
    if (!title) return false;
    return TMDbService.EXCLUDED_TITLE_PATTERNS.some(pattern => pattern.test(title));
  }

  private isDocumentaryOrTVMovie(genreIds?: number[]): boolean {
    if (!genreIds || genreIds.length === 0) return false;
    return genreIds.includes(this.EXCLUDED_GENRES.DOCUMENTARY) || genreIds.includes(this.EXCLUDED_GENRES.TV_MOVIE);
  }

  private isExcludedMakingOfMovie(movie: { title?: string; genre_ids?: number[] }): boolean {
    return this.isExcludedTitle(movie.title) && this.isDocumentaryOrTVMovie(movie.genre_ids);
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.config.baseUrl}${endpoint}`);
    url.searchParams.append("api_key", this.config.apiKey);

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`TMDb API error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async searchActors(query: string): Promise<Actor[]> {
    if (!query.trim()) return [];

    try {
      const response = await this.makeRequest<TMDbResponse<TMDbActor>>("/search/person", {
        query: query.trim(),
        include_adult: "false",
      });

      const actors = response.results
        .filter(person => person.known_for_department === "Acting")
        .map(person => ({
          id: person.id,
          name: person.name,
          profile_path: person.profile_path,
          known_for_department: person.known_for_department,
        }));

      // Filter out actors who don't meet the criteria (at least 5 valid English live-action movies)
      const filteredActors = await this.filterActorsByGenre(actors);

      // Return filtered results
      return filteredActors.slice(0, 20);
    } catch (error) {
      console.error("Error searching actors:", error);
      return [];
    }
  }

  async searchMovies(query: string): Promise<Movie[]> {
    if (!query.trim()) return [];

    try {
      // Perform primary search
      const response = await this.makeRequest<TMDbResponse<TMDbMovie>>("/search/movie", {
        query: query.trim(),
        include_adult: "false",
      });

      let allResults = [...response.results];

      // For titles that might contain special characters (e.g., "Romeo + Juliet"),
      // also try searching with "+" between words if space-separated
      const words = query.trim().split(/\s+/);
      if (words.length >= 2 && !query.includes('+')) {
        try {
          const plusQuery = words.join(' + ');
          const plusResponse = await this.makeRequest<TMDbResponse<TMDbMovie>>("/search/movie", {
            query: plusQuery,
            include_adult: "false",
            "primary_release_date.gte": "1970-01-01",
          });

          // Add results that aren't already in the list
          const existingIds = new Set(allResults.map(m => m.id));
          for (const movie of plusResponse.results) {
            if (!existingIds.has(movie.id)) {
              allResults.push(movie);
            }
          }
        } catch (e) {
          // Ignore secondary search errors
        }
      }

      return allResults
        .filter(movie => {
          // Additional filter to ensure movies are from 1970+
          if (!movie.release_date) return false;
          const releaseYear = new Date(movie.release_date).getFullYear();
          if (releaseYear < 1970) return false;

          return !this.isExcludedMakingOfMovie(movie);
        })
        // Sort primarily by vote count (popularity) to ensure well-known films appear first
        // Movies with 1000+ votes are likely mainstream releases users are looking for
        .sort((a, b) => {
          const aScore = (a.vote_count >= 1000 ? 100000 : 0) + a.vote_count + (a.vote_average * 100);
          const bScore = (b.vote_count >= 1000 ? 100000 : 0) + b.vote_count + (b.vote_average * 100);
          return bScore - aScore;
        })
        .map(movie => ({
          id: movie.id,
          title: movie.title,
          release_date: movie.release_date,
          poster_path: movie.poster_path,
          overview: movie.overview,
        }));
    } catch (error) {
      console.error("Error searching movies:", error);
      return [];
    }
  }

  async getMovieCredits(movieId: number): Promise<Actor[]> {
    const cached = this.movieCreditsCache.get(movieId);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
      return cached.data;
    }

    try {
      const response = await this.makeRequest<TMDbCredit>(`/movie/${movieId}/credits`);

      const data = response.cast.map(actor => ({
        id: actor.id,
        name: actor.name,
        profile_path: actor.profile_path,
        known_for_department: actor.known_for_department,
      }));

      this.movieCreditsCache.set(movieId, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error("Error getting movie credits:", error);
      return [];
    }
  }

  async getActorMovies(actorId: number): Promise<Movie[]> {
    const cached = this.actorMoviesCache.get(actorId);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
      return cached.data;
    }

    try {
      const response = await this.makeRequest<TMDbPersonMovies>(`/person/${actorId}/movie_credits`);

      // Get movies with basic data first
      const movies = response.cast
        .filter(movie => {
          // Only include movies from 1970 onwards
          if (!movie.release_date) return false;
          const releaseYear = new Date(movie.release_date).getFullYear();
          if (releaseYear < 1970) return false;

          return !this.isExcludedMakingOfMovie(movie);
        })
        .map(movie => ({
          id: movie.id,
          title: movie.title,
          release_date: movie.release_date,
          poster_path: movie.poster_path,
          // These may not be available in movie_credits endpoint
          popularity: movie.popularity || 0,
          vote_average: movie.vote_average || 0,
          vote_count: movie.vote_count || 0,
        }));

      // For hint selection, we need to enhance popular movies with full details
      // This method will be used by hint system to get accurate popularity data
      this.actorMoviesCache.set(actorId, { data: movies, timestamp: Date.now() });
      return movies;
    } catch (error) {
      console.error("Error getting actor movies:", error);
      return [];
    }
  }

  async getActorMoviesWithPopularity(actorId: number): Promise<Movie[]> {
    try {
      const basicMovies = await this.getActorMovies(actorId);

      // For the most popular movies, fetch detailed data to get accurate popularity scores
      const enhancedMovies = await Promise.all(
        basicMovies.slice(0, 20).map(async (movie) => { // Only enhance top 20 to avoid rate limits
          try {
            const details = await this.makeRequest<TMDbMovie>(`/movie/${movie.id}`);
            return {
              ...movie,
              popularity: details.popularity || 0,
              vote_average: details.vote_average || 0,
              vote_count: details.vote_count || 0,
            };
          } catch {
            return movie; // Return basic movie if details fail
          }
        })
      );

      // Add remaining movies without enhanced data
      return [...enhancedMovies, ...basicMovies.slice(20)];
    } catch (error) {
      console.error("Error getting actor movies with popularity:", error);
      return [];
    }
  }

  async getActorHintMovies(actorId: number, count: number = 5): Promise<Movie[]> {
    // Use enhanced movie data with accurate popularity scores
    const movies = await this.getActorMoviesWithPopularity(actorId);

    // Get actor details to check for death date
    const actorDetails = await this.getActorDetails(actorId);
    let filteredMovies = movies;

    // If actor is deceased, filter out movies released after their death
    if (actorDetails?.deathday) {
      const deathYear = new Date(actorDetails.deathday).getFullYear();
      filteredMovies = movies.filter(movie => {
        if (!movie.release_date) return false;
        const releaseYear = new Date(movie.release_date).getFullYear();
        return releaseYear <= deathYear;
      });

      console.log(`Actor ${actorDetails.name} died in ${deathYear}, filtered movies from ${movies.length} to ${filteredMovies.length}`);
    }

    // Strategic hint selection - now with accurate TMDB popularity data
    const strategicMovies = this.selectStrategicHintMovies(filteredMovies, count);
    return strategicMovies;
  }

  /**
   * Select strategic hint movies that provide good gameplay value
   * Prioritizes popular movies while maintaining decade diversity
   */
  private selectStrategicHintMovies(movies: Movie[], count: number): Movie[] {
    if (movies.length <= count) return movies;

    // Get detailed movie info with popularity scores
    const moviesWithDetails = movies.map(movie => ({
      ...movie,
      // Calculate a composite score: popularity + recency + title distinctiveness
      score: this.calculateMovieHintScore(movie)
    }));

    // Separate movies by decade for diversity
    const moviesByDecade = new Map<number, any[]>();
    moviesWithDetails.forEach(movie => {
      if (movie.release_date) {
        const decade = Math.floor(new Date(movie.release_date).getFullYear() / 10) * 10;
        if (!moviesByDecade.has(decade)) {
          moviesByDecade.set(decade, []);
        }
        moviesByDecade.get(decade)!.push(movie);
      }
    });

    // Sort movies within each decade by their hint score (popularity + other factors)
    moviesByDecade.forEach(decadeMovies => {
      decadeMovies.sort((a, b) => b.score - a.score);
    });

    const selectedMovies: Movie[] = [];
    const decades = Array.from(moviesByDecade.keys()).sort((a, b) => b - a); // Start with most recent

    // First pass: Get the most popular movie from each decade
    for (const decade of decades) {
      if (selectedMovies.length >= count) break;

      const decadeMovies = moviesByDecade.get(decade)!;
      selectedMovies.push(decadeMovies[0]); // Highest scored movie from this decade
    }

    // Second pass: If we still need more movies, get second-best from decades with multiple good movies
    if (selectedMovies.length < count) {
      for (const decade of decades) {
        if (selectedMovies.length >= count) break;

        const decadeMovies = moviesByDecade.get(decade)!;
        if (decadeMovies.length > 1) {
          const alreadySelected = selectedMovies.some(selected =>
            decadeMovies[0].id === selected.id
          );
          if (alreadySelected && decadeMovies[1]) {
            selectedMovies.push(decadeMovies[1]);
          }
        }
      }
    }

    // Final pass: Fill remaining slots with highest-scoring movies overall
    if (selectedMovies.length < count) {
      const remainingMovies = moviesWithDetails
        .filter(movie => !selectedMovies.some(selected => selected.id === movie.id))
        .sort((a, b) => b.score - a.score);

      selectedMovies.push(...remainingMovies.slice(0, count - selectedMovies.length));
    }

    // Final shuffle to not reveal the selection strategy, but keep it light to preserve quality
    return selectedMovies.sort(() => Math.random() - 0.45).slice(0, count);
  }

  /**
   * Calculate a hint score for a movie based on TMDB popularity and other factors
   */
  private calculateMovieHintScore(movie: Movie): number {
    let score = 0;

    // Primary factor: TMDB popularity score (most important)
    if (movie.popularity) {
      score += movie.popularity * 2; // Weight popularity heavily
    }

    // Secondary factor: Vote count and rating (indicates mainstream recognition)
    if (movie.vote_count && movie.vote_average) {
      const popularityFromVotes = Math.log(movie.vote_count + 1) * movie.vote_average;
      score += popularityFromVotes;
    }

    // Release date factor (more recent movies often more recognizable)
    if (movie.release_date) {
      const releaseYear = new Date(movie.release_date).getFullYear();

      // Sweet spot: movies from 1980-2020 get highest scores
      if (releaseYear >= 1980 && releaseYear <= 2020) {
        score += 10;
      } else if (releaseYear > 2020) {
        score += 8; // Very recent movies
      } else if (releaseYear >= 1970) {
        score += 6; // Classic movies
      } else {
        score += 3; // Very old movies
      }
    }

    // Title length factor (distinctive titles often more memorable)
    const titleLength = movie.title.length;
    if (titleLength >= 8 && titleLength <= 25) {
      score += 3; // Sweet spot for memorable titles
    } else if (titleLength > 25) {
      score += 2; // Long titles can be distinctive
    } else {
      score += 1; // Short titles
    }

    // Add minimal randomness to prevent complete predictability
    score += Math.random() * 1;

    return score;
  }

  /**
   * Get detailed actor information including birth/death dates with caching
   */
  async getActorDetails(actorId: number): Promise<{ name: string; birthday?: string; deathday?: string } | null> {
    const cached = this.actorDetailsCache.get(actorId);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
      return cached.data;
    }

    try {
      const response = await this.makeRequest<{
        id: number;
        name: string;
        birthday?: string;
        deathday?: string;
      }>(`/person/${actorId}`);

      const data = {
        name: response.name,
        birthday: response.birthday,
        deathday: response.deathday
      };

      this.actorDetailsCache.set(actorId, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error(`Error getting actor details for ${actorId}:`, error);
      return null;
    }
  }

  /**
   * Consolidated filter: career activity, genre, and mainstream appeal
   * Now includes English credit ratio check to filter out prolific non-English actors
   */
  private async filterActorsByGenre(actors: Actor[]): Promise<Actor[]> {
    const validActors: Actor[] = [];

    for (let i = 0; i < actors.length; i += 5) {
      const batch = actors.slice(i, i + 5);
      const results = await Promise.all(batch.map(async (actor) => {
        try {
          if (this.EXCLUDED_ACTORS.has(actor.name)) return null;
          if (!actor.profile_path) return null;

          // Fetch details (for deathday) and movie credits in parallel
          const [details, creditsRes] = await Promise.all([
            this.getActorDetails(actor.id),
            this.makeRequest<TMDbPersonMovies>(`/person/${actor.id}/movie_credits`)
          ]);

          const credits = creditsRes.cast || [];
          if (credits.length === 0) return null;

          let animatedCount = 0;
          let liveActionCount = 0;
          let englishLiveActionCount = 0;
          let post1990EnglishLiveActionCount = 0;

          const deathYear = details?.deathday ? new Date(details.deathday).getFullYear() : Infinity;

          for (const movie of credits) {
            const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : 0;
            if (releaseYear > deathYear) continue;

            const isAnimated = movie.genre_ids?.includes(this.EXCLUDED_GENRES.ANIMATION);
            if (isAnimated) {
              animatedCount++;
            } else {
              liveActionCount++;
              const isDoc = movie.genre_ids?.includes(this.EXCLUDED_GENRES.DOCUMENTARY);
              const isTV = movie.genre_ids?.includes(this.EXCLUDED_GENRES.TV_MOVIE);

              if (!isDoc && !isTV && movie.original_language === 'en') {
                if (releaseYear >= 1970) {
                  englishLiveActionCount++;
                  if (releaseYear >= 1990) post1990EnglishLiveActionCount++;
                }
              }
            }
          }

          // Ratio calculation
          const totalCredits = animatedCount + liveActionCount; // Or strictly credits.length, but this filters genres too
          if (totalCredits === 0) return null;

          const englishRatio = englishLiveActionCount / totalCredits;

          // 1. Basic Animation Filter
          if (animatedCount / totalCredits > 0.6) return null;

          // 2. Tiered English Filter
          // High English Ratio (> 50%): Standard Hollywood actor
          if (englishRatio > 0.5) {
            if (englishLiveActionCount < 5) return null;
            if (post1990EnglishLiveActionCount < 3) return null;
          }
          // Medium English Ratio (10-50%): Crossover stars (e.g., Jackie Chan, Marion Cotillard)
          // Require much higher absolute count to filter "noise" from non-English actors
          else if (englishRatio >= 0.1) {
            if (englishLiveActionCount < 15) return null;
            // Still require recency
            if (post1990EnglishLiveActionCount < 5) return null;
          }
          // Low English Ratio (< 10%): Primarily non-English actor (e.g., Brahmanandam)
          else {
            return null;
          }

          return actor;
        } catch (e) {
          return null;
        }
      }));

      validActors.push(...results.filter((a): a is Actor => a !== null));
      if (i + 5 < actors.length) await new Promise(r => setTimeout(r, 50));
    }
    return validActors;
  }

  /**
   * Get movies for an actor, excluding documentaries, animated movies, and focusing on mainstream releases
   */

  /**
   * Enhanced check to identify if an actor is primarily a voice actor
   */

  async getWatchProviders(movieId: number, region: string = 'US'): Promise<{
    link: string | null;
    flatrate: Array<{ provider_id: number; provider_name: string; logo_path: string }>;
    rent: Array<{ provider_id: number; provider_name: string; logo_path: string }>;
    buy: Array<{ provider_id: number; provider_name: string; logo_path: string }>;
  } | null> {
    try {
      const response = await this.makeRequest<{
        id: number;
        results: Record<string, {
          link?: string;
          flatrate?: Array<{ provider_id: number; provider_name: string; logo_path: string }>;
          rent?: Array<{ provider_id: number; provider_name: string; logo_path: string }>;
          buy?: Array<{ provider_id: number; provider_name: string; logo_path: string }>;
        }>;
      }>(`/movie/${movieId}/watch/providers`);

      const regionData = response.results?.[region];
      if (!regionData) {
        return { link: null, flatrate: [], rent: [], buy: [] };
      }

      return {
        link: regionData.link || null,
        flatrate: regionData.flatrate || [],
        rent: regionData.rent || [],
        buy: regionData.buy || [],
      };
    } catch (error) {
      console.error(`Error getting watch providers for movie ${movieId}:`, error);
      return null;
    }
  }

  async validateActorInMovie(actorId: number, movieId: number): Promise<boolean> {
    try {
      // Use actor's movie credits as it's typically a smaller dataset than a movie's full cast
      // and checking if a movie ID exists in a list of ~50-100 items is much lighter/faster.
      // This also avoids the issue of fetching massive cast lists for blockbuster movies.

      // We perform a raw fetch here to avoid the filtering in getActorMovies 
      // ensuring we don't falsely reject valid credits due to business logic filters (like release date)
      const response = await this.makeRequest<TMDbPersonMovies>(`/person/${actorId}/movie_credits`);

      const matchedMovie = response.cast.find(movie => movie.id === movieId);
      if (!matchedMovie) return false;

      // Enforce making-of documentary exclusions during validation to prevent crafted payload bypasses.
      if (this.isExcludedMakingOfMovie(matchedMovie)) return false;

      return true;
    } catch (error) {
      console.error(`Error validating actor ${actorId} in movie ${movieId}:`, error);
      return false;
    }
  }

  async getActorsByTier(tier: 'easy' | 'medium' | 'hard'): Promise<Actor[]> {
    try {
      let minPage: number;
      let maxPage: number;

      switch (tier) {
        case 'easy':
          // A-List: Top-ranked mainstream actors
          minPage = 1;
          maxPage = 4;
          break;
        case 'medium':
          // Mid-Tier: less mainstream, still recognizable
          minPage = 9;
          maxPage = 30;
          break;
        case 'hard':
          // Niche: long-tail actors
          minPage = 45;
          maxPage = 140;
          break;
      }

      const pages: TMDbResponse<TMDbActor>[] = [];
      const distinctPages = new Set<number>();

      const pageRangeSize = maxPage - minPage + 1;
      const pagesToFetch = Math.min(5, pageRangeSize);

      // Fetch random pages from the specified range
      while (distinctPages.size < pagesToFetch) {
        const page = Math.floor(Math.random() * (maxPage - minPage + 1)) + minPage;
        distinctPages.add(page);
      }

      console.log(`Fetching ${tier} tier actors from pages: ${Array.from(distinctPages).join(', ')}`);

      for (const pageNum of distinctPages) {
        try {
          const page = await this.makeRequest<TMDbResponse<TMDbActor>>("/person/popular", { page: pageNum.toString() });
          pages.push(page);
          await new Promise(resolve => setTimeout(resolve, 50)); // Rate limit buffer
        } catch (e) {
          console.error(`Failed to fetch page ${pageNum}`, e);
        }
      }

      const allResults = pages.flatMap(page => page.results);

      // Build a lookup of TMDB popularity scores by actor ID
      const popularityByActorId = new Map<number, number>();
      for (const person of allResults) {
        if (person.popularity != null) {
          popularityByActorId.set(person.id, person.popularity);
        }
      }

      const actors = allResults
        .filter(person => person.known_for_department === "Acting")
        .map(person => ({
          id: person.id,
          name: person.name,
          profile_path: person.profile_path,
          known_for_department: person.known_for_department,
        }));

      // Apply strict filtering (must have profile path, English movies, etc.)
      const filteredActors = await this.filterActorsByGenre(actors);

      // Apply minimum popularity score threshold per tier
      const popularityThresholds: Record<string, number> = {
        easy: 40,
        medium: 10,
        hard: 0,
      };

      const threshold = popularityThresholds[tier] ?? 0;
      const qualifiedActors = threshold > 0
        ? filteredActors.filter(a => (popularityByActorId.get(a.id) ?? 0) >= threshold)
        : filteredActors;

      const popularityFiltered = filteredActors.length - qualifiedActors.length;
      if (popularityFiltered > 0) {
        console.log(`${tier}: filtered out ${popularityFiltered} actors below popularity ${threshold}`);
      }

      console.log(`Found ${qualifiedActors.length} valid ${tier} actors`);
      return qualifiedActors;
    } catch (error) {
      console.error(`Error getting ${tier} actors:`, error);
      return [];
    }
  }

  /**
   * Get a quality actor pool: pages 1-5 of TMDB popular, cap at 50 before deep filtering.
   * Sized to complete within Vercel hobby 60s limit (5 page fetches + ~100 filter calls + BFS).
   * No popularity threshold — difficulty is determined by BFS distance, not TMDB score.
   */
  async getQualityActorPool(): Promise<Actor[]> {
    try {
      const pages: TMDbResponse<TMDbActor>[] = [];

      for (let pageNum = 1; pageNum <= 5; pageNum++) {
        try {
          const page = await this.makeRequest<TMDbResponse<TMDbActor>>("/person/popular", { page: pageNum.toString() });
          pages.push(page);
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (e) {
          console.error(`Failed to fetch popular actors page ${pageNum}`, e);
        }
      }

      const allResults = pages.flatMap(page => page.results);

      // Filter to actors only, cap at 50 before expensive genre filtering
      // (each actor costs ~2 TMDB calls to filter, so 50 × 2 = ~100 calls, ~10s)
      const actors = allResults
        .filter(person => person.known_for_department === "Acting")
        .slice(0, 50)
        .map(person => ({
          id: person.id,
          name: person.name,
          profile_path: person.profile_path,
          known_for_department: person.known_for_department,
        }));

      const filteredActors = await this.filterActorsByGenre(actors);
      console.log(`Quality actor pool: ${allResults.length} raw -> ${actors.length} capped (max 50) -> ${filteredActors.length} after filtering`);
      return filteredActors;
    } catch (error) {
      console.error("Error getting quality actor pool:", error);
      return [];
    }
  }

  // Legacy support for random popular actors (used by backup logic)
  async getPopularActors(): Promise<Actor[]> {
    return this.getQualityActorPool();
  }

  async getRandomTopActors(): Promise<{ actor1: Actor; actor2: Actor } | null> {
    try {
      const actors = await this.getPopularActors();

      if (actors.length < 2) {
        return null;
      }

      // Pick two random actors from different parts of the pool for more diversity
      const shuffled = actors.sort(() => 0.5 - Math.random());
      console.log(`Selecting from pool of ${actors.length} qualified actors`);

      return {
        actor1: shuffled[0],
        actor2: shuffled[1],
      };
    } catch (error) {
      console.error("Error getting random top actors:", error);
      return null;
    }
  }

  /**
   * Get profile path for a specific actor by ID
   * Useful for verifying/updating thumbnails
   */
  async getActorProfilePath(actorId: number): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/person/${actorId}?api_key=${this.config.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const actor = await response.json();
      return actor.profile_path;
    } catch (error) {
      console.error("Error fetching actor profile path:", error);
      return null;
    }
  }

  /**
   * Verify and repair challenge thumbnails
   * Ensures actor names match their profile paths
   */
  async verifyChallengeThumbnails(challenge: {
    id: string;
    startActorId: number;
    startActorName: string;
    startActorProfilePath: string | null;
    endActorId: number;
    endActorName: string;
    endActorProfilePath: string | null;
  }): Promise<{
    needsUpdate: boolean;
    correctStartPath?: string | null;
    correctEndPath?: string | null;
    issues: string[];
  }> {
    const issues: string[] = [];
    let needsUpdate = false;
    let correctStartPath: string | null = null;
    let correctEndPath: string | null = null;

    try {
      // Verify start actor thumbnail
      const fetchedStartPath = await this.getActorProfilePath(challenge.startActorId);
      if (fetchedStartPath !== challenge.startActorProfilePath) {
        issues.push(`Start actor ${challenge.startActorName} has incorrect thumbnail`);
        correctStartPath = fetchedStartPath;
        needsUpdate = true;
      }

      // Verify end actor thumbnail  
      const fetchedEndPath = await this.getActorProfilePath(challenge.endActorId);
      if (fetchedEndPath !== challenge.endActorProfilePath) {
        issues.push(`End actor ${challenge.endActorName} has incorrect thumbnail`);
        correctEndPath = fetchedEndPath;
        needsUpdate = true;
      }

      return {
        needsUpdate,
        correctStartPath: needsUpdate ? correctStartPath : undefined,
        correctEndPath: needsUpdate ? correctEndPath : undefined,
        issues
      };
    } catch (error) {
      console.error("Error verifying challenge thumbnails:", error);
      return {
        needsUpdate: false,
        issues: ["Failed to verify thumbnails due to API error"]
      };
    }
  }
}

export const tmdbService = new TMDbService();
