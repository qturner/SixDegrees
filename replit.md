# Overview

This is a React-based "6 Degrees of Separation" game application that challenges users to connect two actors through a chain of movies and co-stars. The app generates daily challenges where users must find connections between randomly selected actors within 6 moves. The application uses a modern full-stack architecture with Express.js backend, React frontend, PostgreSQL database via Drizzle ORM, and integrates with The Movie Database (TMDB) API for actor and movie data.

# User Preferences

Preferred communication style: Simple, everyday language.
Content filtering: Only include actors and movies from 1970 onwards for more modern, relevant gameplay.
Actor selection criteria: Only use well-known actors whose careers were active after 1980 (minimum 2 movies post-1980).
Voice actor exclusion: Excludes voice actors (Cree Summer, Tara Strong, Frank Welker, etc.) to focus on live-action films (August 2025).
Stand-up comedian filtering: Excludes TV movies, music films, and solo performers to ensure proper co-starring connections (August 2025).
Bug fixes: Critical race condition in daily challenge generation resolved (August 2025) - hints no longer reset daily actors.
UI Enhancement: Compact validation feedback using checkmarks/X icons instead of large alert boxes (August 2025).
Daily Reset: Automated daily challenge reset at midnight EST with proper timezone handling (August 2025).
Hints Toggle Feature: Users can now toggle between both hints after using them - both hints remain accessible instead of the first disappearing (August 2025).
Mobile Responsive Design: Full mobile optimization with stacked layouts, touch-friendly buttons, proper viewport settings, and mobile-specific CSS improvements (August 2025).

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components with Radix UI primitives and Tailwind CSS for styling
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod schema validation

## Backend Architecture
- **Framework**: Express.js with TypeScript running in ESM mode
- **API Design**: RESTful API with endpoints for daily challenges, actor/movie search, and game validation
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Storage Strategy**: Includes both PostgreSQL implementation and in-memory storage fallback for development

## Database Design
- **Daily Challenges Table**: Stores daily actor pairs with date-based uniqueness
- **Game Attempts Table**: Records user gameplay sessions with move counts and connection chains
- **Schema**: Uses Drizzle schema definitions with Zod integration for validation

## External Service Integrations
- **The Movie Database (TMDB) API**: Primary data source for actor information, movie details, and cast relationships
- **Neon Database**: PostgreSQL hosting service for production data storage
- **Authentication**: Session-based authentication using connect-pg-simple for PostgreSQL session storage

## Development Tools
- **Build Process**: Vite for frontend bundling, esbuild for backend compilation
- **Type Safety**: Full TypeScript coverage across frontend, backend, and shared schemas
- **Development Environment**: Hot reload with Vite dev server and TSX for backend development
- **Styling**: Tailwind CSS with custom design system including game-specific color variables

## Game Logic Architecture
- **Challenge Generation**: Automated daily challenge creation using TMDB actor data with multi-layer filtering
- **Actor Filtering**: Career activity filtering (post-1980) + genre filtering (excludes documentary/animation-only actors)
- **Connection Validation**: Real-time validation of actor-movie relationships through TMDB API
- **Game State**: Client-side game state management with server-side validation
- **Daily Reset System**: Automated challenge reset at midnight EST using node-cron with timezone handling for DST transitions

## Performance Considerations
- **Caching Strategy**: TanStack Query provides client-side caching for search results and game data
- **API Rate Limiting**: Structured to handle TMDB API rate limits efficiently
- **Database Optimization**: Indexed queries on date fields for daily challenges
- **Race Condition Prevention**: Request synchronization prevents concurrent daily challenge creation