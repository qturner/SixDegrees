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
      
      return response.cast
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
        }));
    } catch (error) {
      console.error("Error getting actor movies:", error);
      return [];
    }
  }

  async getActorHintMovies(actorId: number, count: number = 5): Promise<Movie[]> {
    const movies = await this.getActorMovies(actorId);
    
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
    
    // Return a random selection of movies, prioritizing more popular ones
    const shuffled = filteredMovies.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
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
   * Check if an actor has career activity after 1980 and is still living
   */
  private async hasCareerActivityAfter1980(actorId: number): Promise<boolean> {
    try {
      // Get actor details and movie credits in parallel
      const [actorDetails, movieCredits] = await Promise.all([
        this.getActorDetails(actorId),
        this.makeRequest<TMDbPersonMovies>(`/person/${actorId}/movie_credits`)
      ]);
      
      // Exclude deceased actors to ensure current relevance
      if (actorDetails?.deathday) {
        console.log(`Excluding deceased actor: ${actorDetails.name} (died: ${actorDetails.deathday})`);
        return false;
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
   * Filter actors by career activity - only include those active after 1980 and still living
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

    console.log(`Filtered from ${actors.length} to ${validActors.length} actors with post-1980 career activity`);
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
            console.log(`Excluding voice actor: ${actor.name}`);
            return null;
          }

          const movies = await this.getActorMovies(actor.id);
          
          if (movies.length === 0) {
            return null; // Skip actors with no movies
          }

          // Check if actor has significant non-documentary/non-animated work
          const liveActionMovies = await this.getNonDocumentaryNonAnimatedMovies(actor.id);
          
          // Actor must have at least 2 live-action movies to be included
          if (liveActionMovies.length >= 2) {
            return actor;
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
   * Get movies for an actor, excluding documentaries and animated movies
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

  async validateActorInMovie(actorId: number, movieId: number): Promise<boolean> {
    try {
      const credits = await this.getMovieCredits(movieId);
      const isValid = credits.some(actor => actor.id === actorId);
      
      // Remove excessive logging for production use
      
      return isValid;
    } catch (error) {
      console.error("Error validating actor in movie:", error);
      return false;
    }
  }

  async getPopularActors(): Promise<Actor[]> {
    try {
      // Get popular actors from multiple pages to have more options
      const page1 = await this.makeRequest<TMDbResponse<TMDbActor>>("/person/popular", { page: "1" });
      const page2 = await this.makeRequest<TMDbResponse<TMDbActor>>("/person/popular", { page: "2" });
      const page3 = await this.makeRequest<TMDbResponse<TMDbActor>>("/person/popular", { page: "3" });
      
      const allResults = [...page1.results, ...page2.results, ...page3.results];
      
      const actors = allResults
        .filter(person => person.known_for_department === "Acting")
        .map(person => ({
          id: person.id,
          name: person.name,
          profile_path: person.profile_path,
          known_for_department: person.known_for_department,
        }));

      console.log(`Found ${actors.length} popular actors, applying career activity filtering...`);
      
      // First filter by career activity (post-1980)
      const careerFilteredActors = await this.filterActorsByCareerActivity(actors);
      
      console.log("Applying genre filtering to career-filtered actors...");
      
      // Then apply genre filtering to exclude documentary/animation-only actors  
      const finalFilteredActors = await this.filterActorsByGenre(careerFilteredActors);
      console.log(`Final filtered actors: ${finalFilteredActors.length}`);
      
      return finalFilteredActors.length > 0 ? finalFilteredActors : careerFilteredActors; // Fallback to career-filtered if genre filtering is too restrictive
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

      // Pick two random actors
      const shuffled = actors.sort(() => 0.5 - Math.random());
      return {
        actor1: shuffled[0],
        actor2: shuffled[1],
      };
    } catch (error) {
      console.error("Error getting random top actors:", error);
      return null;
    }
  }
}

export const tmdbService = new TMDbService();
