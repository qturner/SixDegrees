import { tmdbService } from "./api/_server/services/tmdb.js";

async function test() {
    console.log("Testing Movie Search...");
    try {
        const results = await tmdbService.searchMovies("The Matrix");
        console.log("Search 'The Matrix' results:", results.length);
        if (results.length > 0) {
            console.log("First result:", results[0].title, "(", results[0].release_date, ")");
        } else {
            console.log("No results found.");
        }
    } catch (error) {
        console.error("Search failed:", error);
    }

    console.log("\nTesting Actor Search for correct paths...");
    try {
        const brad = await tmdbService.searchActors("Brad Pitt");
        console.log("Brad Pitt results:", brad.length);
        if (brad.length > 0) console.log("Brad Pitt path:", brad[0].profile_path);

        const angelina = await tmdbService.searchActors("Angelina Jolie");
        console.log("Angelina Jolie results:", angelina.length);
        if (angelina.length > 0) console.log("Angelina Jolie path:", angelina[0].profile_path);
    } catch (error) {
        console.error("Actor search failed:", error);
    }

    console.log("\nTesting Actor Credits...");
    try {
        const credits = await tmdbService.getMovieCredits(603); // The Matrix
        console.log("The Matrix credits found:", credits.length);
    } catch (error) {
        console.error("Credits failed:", error);
    }
}

test();
