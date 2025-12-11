import { Actor, Movie } from "@shared/schema";

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

  // Actors to exclude (primarily voice actors, stand-up comedians, or those not suitable for the game)
  private readonly EXCLUDED_ACTORS = new Set([
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

  private async makeRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.config.baseUrl}${endpoint}`);
    url.searchParams.append("api_key", this.config.apiKey);
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`TMDb API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
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

      // Filter out actors who only appear in documentaries or animated movies
      const filteredActors = await this.filterActorsByGenre(actors);

      // Return top 20 results to keep it manageable
      return filteredActors.slice(0, 20);
    } catch (error) {
      console.error("Error searching actors:", error);
      return [];
    }
  }

  async searchMovies(query: string): Promise<Movie[]> {
    if (!query.trim()) return [];

    try {
      const response = await this.makeRequest<TMDbResponse<TMDbMovie>>("/search/movie", {
        query: query.trim(),
        include_adult: "false",
        "primary_release_date.gte": "1970-01-01", // Only movies from 1970 onwards
      });

      return response.results
        .filter(movie => {
          // Additional filter to ensure movies are from 1970+
          if (!movie.release_date) return false;
          const releaseYear = new Date(movie.release_date).getFullYear();
          return releaseYear >= 1970;
        })
        // Sort by vote average and vote count to show more well-known movies first
        .sort((a, b) => (b.vote_average * Math.log(b.vote_count + 1)) - (a.vote_average * Math.log(a.vote_count + 1)))
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
    try {
      const response = await this.makeRequest<TMDbCredit>(`/movie/${movieId}/credits`);
      
      return response.cast.map(actor => ({
        id: actor.id,
        name: actor.name,
        profile_path: actor.profile_path,
        known_for_department: actor.known_for_department,
      }));
    } catch (error) {
      console.error("Error getting movie credits:", error);
      return [];
    }
  }

  async getActorMovies(actorId: number): Promise<Movie[]> {
    try {
      const response = await this.makeRequest<TMDbPersonMovies>(`/person/${actorId}/movie_credits`);
      
      // Get movies with basic data first
      const movies = response.cast
        .filter(movie => {
          // Only include movies from 1970 onwards
          if (!movie.release_date) return false;
          const releaseYear = new Date(movie.release_date).getFullYear();
          return releaseYear >= 1970;
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
   * Get detailed actor information including birth/death dates
   */
  async getActorDetails(actorId: number): Promise<{ name: string; birthday?: string; deathday?: string } | null> {
    try {
      const response = await this.makeRequest<{
        id: number;
        name: string;
        birthday?: string;
        deathday?: string;
      }>(`/person/${actorId}`);
      
      return {
        name: response.name,
        birthday: response.birthday,
        deathday: response.deathday
      };
    } catch (error) {
      console.error(`Error getting actor details for ${actorId}:`, error);
      return null;
    }
  }

  /**
   * Check if an actor has career activity after 1980 (includes deceased actors with modern careers)
   */
  private async hasCareerActivityAfter1980(actorId: number): Promise<boolean> {
    try {
      // Get actor details and movie credits in parallel
      const [actorDetails, movieCredits] = await Promise.all([
        this.getActorDetails(actorId),
        this.makeRequest<TMDbPersonMovies>(`/person/${actorId}/movie_credits`)
      ]);
      
      // For deceased actors, include them if they had a modern career (1990+)
      // This includes beloved actors like Robin Williams who had recent careers
      if (actorDetails?.deathday) {
        const recentMoviesForDeceased = movieCredits.cast.filter(movie => {
          if (!movie.release_date) return false;
          const releaseYear = new Date(movie.release_date).getFullYear();
          return releaseYear >= 1990; // Must have movies from 1990 onwards
        });
        
        if (recentMoviesForDeceased.length >= 3) {
          console.log(`Including deceased actor with modern career: ${actorDetails.name} (${recentMoviesForDeceased.length} movies from 1990+)`);
          return true;
        } else {
          console.log(`Excluding deceased actor without modern career: ${actorDetails.name}`);
          return false;
        }
      }
      
      // Check if actor has any movies released after 1980
      const recentMovies = movieCredits.cast.filter(movie => {
        if (!movie.release_date) return false;
        const releaseYear = new Date(movie.release_date).getFullYear();
        return releaseYear > 1980;
      });
      
      // Actor must have at least 2 movies after 1980 to be considered "active"
      return recentMovies.length >= 2;
    } catch (error) {
      console.error(`Error checking career activity for actor ${actorId}:`, error);
      return false;
    }
  }

  /**
   * Filter actors by career activity - includes living actors and deceased actors with modern careers (1990+)
   */
  private async filterActorsByCareerActivity(actors: Actor[]): Promise<Actor[]> {
    console.log("Applying career activity filtering (post-1980) and living status to popular actors...");
    const validActors: Actor[] = [];

    // Process actors in smaller batches to avoid rate limits
    for (let i = 0; i < actors.length; i += 5) {
      const batch = actors.slice(i, i + 5);
      const batchPromises = batch.map(async (actor) => {
        try {
          const hasRecentActivity = await this.hasCareerActivityAfter1980(actor.id);
          return hasRecentActivity ? actor : null;
        } catch (error) {
          console.error(`Error checking career activity for ${actor.name}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      validActors.push(...batchResults.filter((actor): actor is Actor => actor !== null));
      
      // Add small delay between batches to respect API limits
      if (i + 5 < actors.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`Filtered from ${actors.length} to ${validActors.length} actors with post-1980 career activity and living status`);
    return validActors;
  }

  /**
   * Filter out actors who primarily appear in documentaries or animated movies
   */
  private async filterActorsByGenre(actors: Actor[]): Promise<Actor[]> {
    const validActors: Actor[] = [];

    // Process actors in smaller batches to avoid rate limits
    for (let i = 0; i < actors.length; i += 5) {
      const batch = actors.slice(i, i + 5);
      const batchPromises = batch.map(async (actor) => {
        try {
          // Skip excluded actors (primarily voice actors)
          if (this.EXCLUDED_ACTORS.has(actor.name)) {
            console.log(`Excluding known voice actor: ${actor.name}`);
            return null;
          }

          // Check if actor is primarily a voice actor through their filmography
          const isVoiceActor = await this.isPrimarilyVoiceActor(actor.id);
          if (isVoiceActor) {
            console.log(`Excluding detected voice actor: ${actor.name}`);
            return null;
          }

          const movies = await this.getActorMovies(actor.id);
          
          if (movies.length === 0) {
            return null; // Skip actors with no movies
          }

          // Check if actor has significant mainstream live-action work
          const liveActionMovies = await this.getNonDocumentaryNonAnimatedMovies(actor.id);
          
          // NEW REQUIREMENT: Actor must have at least 5 English-language movies
          // Get raw TMDB data with original_language field for filtering
          const rawMovieCredits = await this.makeRequest<TMDbPersonMovies>(`/person/${actor.id}/movie_credits`);
          const englishMovies = rawMovieCredits.cast.filter(movie => 
            movie.original_language === 'en' &&
            movie.release_date && 
            new Date(movie.release_date).getFullYear() >= 1970 &&
            // Exclude documentaries, animated movies, TV movies, and music films
            (!movie.genre_ids || !movie.genre_ids.some(id => 
              id === this.EXCLUDED_GENRES.ANIMATION ||
              id === this.EXCLUDED_GENRES.DOCUMENTARY ||
              id === this.EXCLUDED_GENRES.TV_MOVIE ||
              id === this.EXCLUDED_GENRES.MUSIC
            ))
          );
          
          console.log(`${actor.name}: ${liveActionMovies.length} live-action movies, ${englishMovies.length} in English`);
          
          // Actor must have at least 5 English movies for better game relevance
          if (englishMovies.length >= 5) {
            // Additional check: ensure they have movies with decent popularity/budget
            const popularMovies = englishMovies.filter(movie => {
              // Focus on movies from 1990+ for more mainstream appeal
              if (!movie.release_date) return false;
              const releaseYear = new Date(movie.release_date).getFullYear();
              return releaseYear >= 1990;
            });
            
            // Must have at least 3 English movies from 1990+ to ensure mainstream relevance
            if (popularMovies.length >= 3) {
              return actor;
            }
          }
          
          return null;
        } catch (error) {
          console.error(`Error checking actor ${actor.name}:`, error);
          return null; // Skip on error to avoid blocking the search
        }
      });

      const batchResults = await Promise.all(batchPromises);
      validActors.push(...batchResults.filter((actor): actor is Actor => actor !== null));
      
      // Add small delay between batches to respect API limits
      if (i + 5 < actors.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return validActors;
  }

  /**
   * Get movies for an actor, excluding documentaries, animated movies, and focusing on mainstream releases
   */
  private async getNonDocumentaryNonAnimatedMovies(actorId: number): Promise<Movie[]> {
    try {
      const response = await this.makeRequest<TMDbPersonMovies>(`/person/${actorId}/movie_credits`);
      
      return response.cast
        .filter(movie => {
          // Only include movies from 1970 onwards
          if (!movie.release_date) return false;
          const releaseYear = new Date(movie.release_date).getFullYear();
          if (releaseYear < 1970) return false;

          // Exclude documentaries, animated movies, TV movies, and music films if genre_ids are available
          if (movie.genre_ids && movie.genre_ids.length > 0) {
            return !movie.genre_ids.includes(this.EXCLUDED_GENRES.ANIMATION) &&
                   !movie.genre_ids.includes(this.EXCLUDED_GENRES.DOCUMENTARY) &&
                   !movie.genre_ids.includes(this.EXCLUDED_GENRES.TV_MOVIE) &&
                   !movie.genre_ids.includes(this.EXCLUDED_GENRES.MUSIC);
          }

          // If no genre_ids, include the movie (we'll filter by other means)
          return true;
        })
        .map(movie => ({
          id: movie.id,
          title: movie.title,
          release_date: movie.release_date,
          poster_path: movie.poster_path,
        }));
    } catch (error) {
      console.error("Error getting non-documentary/non-animated movies:", error);
      return [];
    }
  }

  /**
   * Enhanced check to identify if an actor is primarily a voice actor
   */
  private async isPrimarilyVoiceActor(actorId: number): Promise<boolean> {
    try {
      const response = await this.makeRequest<TMDbPersonMovies>(`/person/${actorId}/movie_credits`);
      
      if (response.cast.length === 0) return false;
      
      // Count animated vs live-action movies
      let animatedCount = 0;
      let liveActionCount = 0;
      
      for (const movie of response.cast) {
        if (movie.genre_ids && movie.genre_ids.includes(this.EXCLUDED_GENRES.ANIMATION)) {
          animatedCount++;
        } else {
          liveActionCount++;
        }
      }
      
      // If more than 60% of their work is animated, consider them primarily a voice actor
      const animatedPercentage = animatedCount / (animatedCount + liveActionCount);
      return animatedPercentage > 0.6;
    } catch (error) {
      console.error(`Error checking voice actor status for ${actorId}:`, error);
      return false;
    }
  }

  async validateActorInMovie(actorId: number, movieId: number): Promise<boolean> {
    try {
      const credits = await this.getMovieCredits(movieId);
      const isValid = credits.some(actor => actor.id === actorId);
      
      if (!isValid) {
        console.log(`Validation failed: Actor ${actorId} not found in movie ${movieId} cast (${credits.length} cast members)`);
      }
      
      return isValid;
    } catch (error) {
      console.error("Error validating actor in movie:", error);
      return false;
    }
  }

  async getPopularActors(): Promise<Actor[]> {
    try {
      // Get popular actors from many more pages to have much larger pool
      // TMDB popular endpoint typically returns 20 actors per page
      const pages = [];
      const totalPages = 10; // Get 200 actors instead of 60
      
      console.log(`Fetching ${totalPages} pages of popular actors (${totalPages * 20} total)...`);
      
      for (let i = 1; i <= totalPages; i++) {
        const page = await this.makeRequest<TMDbResponse<TMDbActor>>("/person/popular", { page: i.toString() });
        pages.push(page);
        
        // Add small delay between API calls to be respectful
        if (i < totalPages) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      const allResults = pages.flatMap(page => page.results);
      
      const actors = allResults
        .filter(person => person.known_for_department === "Acting")
        .map(person => ({
          id: person.id,
          name: person.name,
          profile_path: person.profile_path,
          known_for_department: person.known_for_department,
        }));

      console.log(`Found ${actors.length} actors from ${totalPages} pages, applying career activity filtering...`);
      
      // First filter by career activity (post-1980) and living status
      const careerFilteredActors = await this.filterActorsByCareerActivity(actors);
      
      console.log("Applying genre filtering and English movie requirement (5+ credits) to career-filtered actors...");
      
      // Then apply genre filtering to exclude documentary/animation-only actors  
      const finalFilteredActors = await this.filterActorsByGenre(careerFilteredActors);
      console.log(`Final filtered actors: ${finalFilteredActors.length}`);
      console.log(`Actor pool diversity: ${finalFilteredActors.map(a => a.name).slice(0, 10).join(', ')}...`);
      
      return finalFilteredActors.length > 10 ? finalFilteredActors : careerFilteredActors; // Fallback to career-filtered if genre filtering is too restrictive
    } catch (error) {
      console.error("Error getting popular actors:", error);
      return [];
    }
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
