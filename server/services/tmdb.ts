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
  }>;
}

class TMDbService {
  private config: TMDbConfig;

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

      // Return top 20 results to keep it manageable
      return actors.slice(0, 20);
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
      
      return allResults
        .filter(person => person.known_for_department === "Acting")
        .map(person => ({
          id: person.id,
          name: person.name,
          profile_path: person.profile_path,
          known_for_department: person.known_for_department,
        }));
    } catch (error) {
      console.error("Error getting popular actors:", error);
      return [];
    }
  }
}

export const tmdbService = new TMDbService();
