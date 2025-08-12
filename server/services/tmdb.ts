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
  };

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
    // Return a random selection of movies, prioritizing more popular ones
    const shuffled = movies.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
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

          // Exclude documentaries and animated movies if genre_ids are available
          if (movie.genre_ids && movie.genre_ids.length > 0) {
            return !movie.genre_ids.includes(this.EXCLUDED_GENRES.ANIMATION) &&
                   !movie.genre_ids.includes(this.EXCLUDED_GENRES.DOCUMENTARY);
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
      return credits.some(actor => actor.id === actorId);
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

      // Apply genre filtering to exclude documentary/animation-only actors
      console.log("Applying genre filtering to popular actors...");
      const filteredActors = await this.filterActorsByGenre(actors);
      console.log(`Filtered from ${actors.length} to ${filteredActors.length} popular actors`);
      
      return filteredActors.length > 0 ? filteredActors : actors; // Fallback if filtering is too restrictive
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
