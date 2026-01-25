import { apiRequest } from "./client/src/lib/queryClient";

async function testValidation() {
    console.time("Validation");

    // Simulate a complex chain (Brad Pitt -> ... -> Angelina Jolie)
    const payload = {
        startActorId: 287, // Brad Pitt
        endActorId: 11701, // Angelina Jolie
        connections: [
            { actorId: 287, actorName: "Brad Pitt", movieId: 603, movieTitle: "The Matrix" },
            { actorId: 123, actorName: "Keanu Reeves", movieId: 604, movieTitle: "The Matrix Reloaded" },
            { actorId: 456, actorName: "Carrie-Anne Moss", movieId: 605, movieTitle: "The Matrix Revolutions" },
            { actorId: 789, actorName: "Laurence Fishburne", movieId: 624860, movieTitle: "The Matrix Resurrections" },
            { actorId: 101, actorName: "Hugo Weaving", movieId: 14543, movieTitle: "The Matrix Revisited" },
            { actorId: 11701, actorName: "Angelina Jolie", movieId: 684431, movieTitle: "Making 'The Matrix'" }
        ]
    };

    try {
        const start = Date.now();
        const response = await fetch("http://localhost:5001/api/validate-game", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        const duration = Date.now() - start;

        console.log(`Status: ${response.status}`);
        console.log(`Duration: ${duration}ms`);
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error:", error);
    }
    console.timeEnd("Validation");
    process.exit(0);
}

testValidation();
