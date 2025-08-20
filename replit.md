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
Daily Reset: Fixed automated daily challenge reset system - resolved cron job failures, simplified timezone handling, and added proper POST endpoint for force resets (August 2025).
Hints Toggle Feature: Users can now toggle between both hints after using them - both hints remain accessible instead of the first disappearing (August 2025).
Unrestricted Hints Access: Removed all hint usage restrictions - users can view daily hints anytime without 400 errors, ensuring hints remain permanently accessible (August 2025).
Mobile Responsive Design: Full mobile optimization with stacked layouts, touch-friendly buttons, proper viewport settings, and mobile-specific CSS improvements (August 2025).
Data Quality Enhancement: Fixed hint system to filter movies by actor death dates, ensuring deceased actors only show movies from their actual career periods (August 2025).
Actor Selection Update: Enhanced filtering to exclude deceased actors from daily challenges, focusing on living actors for better game relevance (August 2025).
Actor Pool Expansion: Increased actor pool from 60 to 200 actors (10 pages vs 3 pages) to dramatically improve challenge diversity and reduce repetition (August 2025).
Mainstream Focus Enhancement: Added sophisticated voice actor detection (60% animated work threshold) and expanded exclusion list to focus on live-action movie stars with post-1990 mainstream appeal (August 2025).
Enhanced Hint Movie Selection: Upgraded hint algorithm to prioritize popular, recognizable movies while maintaining decade diversity - uses composite scoring based on release year sweet spots (1980-2020), title distinctiveness, and strategic selection from each decade of actor's career (August 2025).
Admin Authentication System: Complete PostgreSQL-based admin system with secure bcrypt authentication, JWT sessions, and manual actor selection with real-time TMDB search functionality - reset dialogs remain open until explicit user action while set challenge dialogs auto-dismiss after confirmation. Admin contact view now filters out read messages, showing only new submissions (August 2025).
Anonymous Analytics System: Added comprehensive player statistics tracking showing attempt counts, success rates, best completion moves, and average moves for daily challenges - analytics appear for users after validation attempts and provide full admin dashboard with charts and insights while maintaining complete user privacy (August 2025).
User-Facing Analytics Enhancement: Added most-used movies and actors tracking in daily challenge analytics, with intelligent filtering to exclude required start/end actors from popularity counts, showing only intermediate connection strategies used by successful players (August 2025).
Failed Attempt Tracking: Fixed analytics to properly track both successful AND failed validation attempts, providing accurate completion rates instead of showing 100% success - now records all user attempts regardless of validation outcome for honest player statistics (August 2025).
Actor Thumbnail Enhancement: Enlarged actor profile photos from 32px/40px to final 64px/72px (100% larger), repositioned to left side with absolute positioning, and centered actor names within full card width for professional layout alignment with mobile page center (August 2025).
Email Notification System: Implemented Gmail SMTP integration for contact form submissions - automatically sends formatted email notifications to admin when users submit feedback, includes user details and enables direct reply functionality for seamless customer support. Gmail authentication successfully configured and verified working (August 2025).
Admin Set Custom Challenge Fix: Fixed actor search functionality in admin panel's Set Custom Challenge feature - corrected API endpoint from '/api/search-actors' to '/api/search/actors' and changed query parameter from 'query' to 'q' to match TMDB service expectations, enabling proper actor selection for custom daily challenges (August 2025).
Search Input Double-Click Fix: Resolved critical UX issue where users had to click twice on movie/actor input fields before typing - removed PopoverTrigger wrappers and implemented direct absolute positioning for dropdowns, enabling immediate single-click text input (August 2025).
Auto-Hide Dropdown Enhancement: Added smart dropdown behavior where search results automatically disappear when input field is completely cleared, improving user experience by preventing stale results from persisting after field cleanup (August 2025).
Validation Timing Fix: Corrected premature error display in GameGrid - validation feedback now only appears when both movie AND actor are selected, eliminating confusing red error messages that appeared on partial input (August 2025).
Hint Loading State Fix: Resolved issue where both hint buttons showed "Getting Hint..." simultaneously - now only the clicked hint button displays loading state while the other remains interactive (August 2025).
Validation Flash Fix: Eliminated jarring red-to-green flash during validation by properly clearing validation results instead of setting failed states, creating smooth validation feedback without confusing intermediate error states (August 2025).
Next Daily Challenge System Implementation: Complete redesign of challenge scheduling to generate challenges 24 hours in advance - replaced tomorrow/upcoming system with "next" status challenges, updated admin endpoints (/api/admin/next-challenge, /api/admin/reset-next-challenge), enhanced midnight cron job to promote "next" challenges to "active" status while generating new next challenges, providing full 24-hour advance visibility for admin control and user experience optimization (August 2025).
Comprehensive Referral Analytics System: Implemented detailed visitor tracking and Google referral analysis system - added visitor analytics database table with referrer tracking, UTM parameter analysis, search query capture, geographic/device data, conversion tracking, and comprehensive admin dashboard showing traffic source breakdown, search patterns, and actionable SEO insights to understand Google's 692 referrals and optimize for better organic traffic (August 2025).

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