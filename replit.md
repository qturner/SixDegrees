# Overview

This React-based "6 Degrees of Separation" game challenges users to connect two actors through a chain of movies and co-stars within six moves. The application features daily challenges using a modern full-stack architecture with an Express.js backend, React frontend, PostgreSQL database via Drizzle ORM, and integrates with The Movie Database (TMDB) API for comprehensive actor and movie data. The project aims to provide engaging, relevant gameplay by focusing on well-known actors and modern filmography, with ambitions for robust analytics and a seamless user experience.

# User Preferences

Preferred communication style: Simple, everyday language.
Content filtering: Only include actors and movies from 1970 onwards for more modern, relevant gameplay.
Actor selection criteria: Only use well-known actors whose careers were active after 1980 (minimum 2 movies post-1980).
Voice actor exclusion: Excludes voice actors (Cree Summer, Tara Strong, Frank Welker, etc.) to focus on live-action films.
Stand-up comedian filtering: Excludes TV movies, music films, and solo performers to ensure proper co-starring connections.
UI Enhancement: Compact validation feedback using checkmarks/X icons instead of large alert boxes.
Hints Toggle Feature: Users can now toggle between both hints after using them - both hints remain accessible instead of the first disappearing.
Unrestricted Hints Access: Removed all hint usage restrictions - users can view daily hints anytime without 400 errors, ensuring hints remain permanently accessible.
Mobile Responsive Design: Full mobile optimization with stacked layouts, touch-friendly buttons, proper viewport settings, and mobile-specific CSS improvements.
Actor Pool Expansion: Increased actor pool from 60 to 200 actors (10 pages vs 3 pages) to dramatically improve challenge diversity and reduce repetition.
Mainstream Focus Enhancement: Added sophisticated voice actor detection (60% animated work threshold) and expanded exclusion list to focus on live-action movie stars with post-1990 mainstream appeal.
Enhanced Hint Movie Selection: Upgraded hint algorithm to prioritize popular, recognizable movies while maintaining decade diversity - uses composite scoring based on release year sweet spots (1980-2020), title distinctiveness, and strategic selection from each decade of actor's career.
Actor Thumbnail Enhancement: Enlarged actor profile photos from 32px/40px to final 64px/72px (100% larger), repositioned to left side with absolute positioning, and centered actor names within full card width for professional layout alignment with mobile page center.
Search Input Double-Click Fix: Resolved critical UX issue where users had to click twice on movie/actor input fields before typing - removed PopoverTrigger wrappers and implemented direct absolute positioning for dropdowns, enabling immediate single-click text input.
Auto-Hide Dropdown Enhancement: Added smart dropdown behavior where search results automatically disappear when input field is completely cleared, improving user experience by preventing stale results from persisting after field cleanup.
Validation Timing Fix: Corrected premature error display in GameGrid - validation feedback now only appears when both movie AND actor are selected, eliminating confusing red error messages that appeared on partial input.
Hint Loading State Fix: Resolved issue where both hint buttons showed "Getting Hint..." simultaneously - now only the clicked hint button displays loading state while the other remains interactive.
Validation Flash Fix: Eliminated jarring red-to-green flash during validation by properly clearing validation results instead of setting failed states, creating smooth validation feedback without confusing intermediate error states.
UI Text Enhancement: Updated game instructions to numbered format (1. Connect actors through movies in six moves or less, 2. Use daily hints if stuck, 3. Press Validate to verify results) and added descriptive text "Finished? Verify your connections here!" above validation button for clearer user guidance.
Footer Branding Addition: Added "A Prologue LLC Project" attribution line underneath main tagline in footer with subtle styling for professional project identification.
Back-to-Back Actor Prevention: Implemented comprehensive actor exclusion logic across all challenge generation endpoints to prevent the same actor from appearing in consecutive daily challenges - system now checks current active challenges and excludes those actors from next challenge generation, ensuring fresh actor pairings and improved game variety.

# System Architecture

## Frontend
-   **Framework**: React 18 with TypeScript and Vite.
-   **UI/UX**: Shadcn/ui components, Radix UI primitives, and Tailwind CSS for styling.
-   **State Management**: TanStack Query for server state and caching.
-   **Routing**: Wouter for client-side routing.
-   **Form Handling**: React Hook Form with Zod validation.

## Backend
-   **Framework**: Express.js with TypeScript in ESM mode.
-   **API Design**: RESTful API for daily challenges, actor/movie search, and game validation.
-   **Database ORM**: Drizzle ORM for type-safe PostgreSQL operations.
-   **Authentication**: Session-based authentication using connect-pg-simple.

## Database
-   **Schema**: Drizzle schema definitions with Zod integration.
-   **Tables**: Daily Challenges (actor pairs, date-based uniqueness), Game Attempts (user gameplay, move counts), Visitor Analytics (referrer tracking, UTM, geo/device data).

## Game Logic & Features
-   **Challenge Generation**: Automated daily challenges using TMDB data with multi-layer filtering (post-1980 career, excludes voice actors/comedians, minimum 5 English films, includes deceased actors with modern careers 1990+, prevents back-to-back actors). Challenges are generated 24 hours in advance.
-   **Connection Validation**: Real-time validation of actor-movie relationships via TMDB API.
-   **Daily Reset System**: Single automated midnight Eastern (EST/EDT) challenge reset via node-cron in server/index.ts with `timezone: "America/New_York"`. Uses dual-challenge system: promotes "next" to "active" and generates new "next" for tomorrow. Includes retry logic, fallback promotion in GET endpoint, and startup cleanup of orphaned challenges. Duplicate cron job removed from routes.ts to prevent UTC timing conflicts.
-   **Analytics**: Anonymous tracking of player statistics (attempts, success rates, best moves, average moves, most-used movies/actors) with an admin dashboard.
-   **Admin System**: PostgreSQL-based admin system with secure bcrypt authentication, JWT sessions, manual actor selection, real-time TMDB search, custom challenge setting (for "Next Daily Challenge"), and contact form management.
-   **Thumbnail Verification**: Automatic validation and repair of actor thumbnails against TMDB.
-   **Cache Invalidation**: Automatic cache clearing for analytics and search queries upon daily challenge change.

# External Dependencies

-   **The Movie Database (TMDB) API**: Primary data source for all actor and movie information, including details, cast relationships, and images.
-   **Neon Database**: PostgreSQL hosting service for production data storage.
-   **Gmail SMTP**: Used for sending email notifications to the admin for contact form submissions.
-   **Google Analytics (G-ZLY9MV2CSE)**: Comprehensive tracking of page views, game interactions, admin activities, and user engagement.