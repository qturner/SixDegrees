import assert from "node:assert/strict";

import type { Actor, Movie } from "../../../shared/schema.js";
import { gameLogicService } from "../services/gameLogic.js";
import { tmdbService } from "../services/tmdb.js";

const actor = (id: number, name: string): Actor => ({
  id,
  name,
  profile_path: `/actor-${id}.jpg`,
  known_for_department: "Acting",
});

const movie = (
  id: number,
  title: string,
  popularity: number,
  voteCount: number,
): Movie => ({
  id,
  title,
  release_date: "2000-01-01",
  poster_path: `/movie-${id}.jpg`,
  popularity,
  vote_count: voteCount,
});

async function testEasyMovieFloorAndTieredPool(): Promise<void> {
  const actor1 = actor(1, "Actor One");
  const actor2 = actor(2, "Actor Two");
  const actor3 = actor(3, "Actor Three");

  const moviesByActor = new Map<number, Movie[]>([
    [
      actor1.id,
      [
        movie(10, "Obscure Direct Link", 100, 100),
        movie(20, "Mainstream Bridge One", 50, 800),
      ],
    ],
    [
      actor2.id,
      [
        movie(10, "Obscure Direct Link", 100, 100),
        movie(30, "Mainstream Bridge Two", 40, 900),
      ],
    ],
    [
      actor3.id,
      [
        movie(20, "Mainstream Bridge One", 50, 800),
        movie(30, "Mainstream Bridge Two", 40, 900),
      ],
    ],
  ]);

  const creditsByMovie = new Map<number, Actor[]>([
    [10, [actor1, actor2]],
    [20, [actor1, actor3]],
    [30, [actor3, actor2]],
  ]);

  const originalGetActorMovies = tmdbService.getActorMovies.bind(tmdbService);
  const originalGetMovieCredits = tmdbService.getMovieCredits.bind(tmdbService);
  const originalGetActorsByTier = tmdbService.getActorsByTier.bind(tmdbService);
  const originalGetQualityActorPool = tmdbService.getQualityActorPool.bind(tmdbService);
  const originalRandom = Math.random;

  let tierCalls = 0;
  let qualityCalls = 0;
  let randomIndex = 0;
  const randomValues = [0, 0.999];

  try {
    tmdbService.getActorMovies = async (actorId: number) => moviesByActor.get(actorId) ?? [];
    tmdbService.getMovieCredits = async (movieId: number) => creditsByMovie.get(movieId) ?? [];
    tmdbService.getActorsByTier = async (tier: "easy" | "medium" | "hard") => {
      tierCalls += 1;
      assert.equal(tier, "easy");
      return [actor1, actor2];
    };
    tmdbService.getQualityActorPool = async () => {
      qualityCalls += 1;
      return [actor1, actor2];
    };
    Math.random = () => {
      const value = randomValues[randomIndex % randomValues.length] ?? 0;
      randomIndex += 1;
      return value;
    };

    const unconstrainedDistance = await gameLogicService.findPathDistance(actor1.id, actor2.id, 6);
    const constrainedDistance = await gameLogicService.findPathDistance(actor1.id, actor2.id, 6, {
      moviePopularityFloor: 500,
    });
    const easyPair = await gameLogicService.generateDailyActors("easy", []);

    assert.equal(unconstrainedDistance, 1, "Unconstrained BFS should use the obscure 1-hop link");
    assert.equal(constrainedDistance, 2, "Easy BFS should avoid the low-vote direct movie");
    assert.equal(tierCalls, 1, "Easy generation should use the tiered actor pool");
    assert.equal(qualityCalls, 0, "Easy generation should not use the broad quality pool");
    assert.ok(easyPair, "Easy generation should find a constrained pair");
    assert.equal(easyPair?.distance, 2, "Easy generation should use the constrained BFS distance");
  } finally {
    tmdbService.getActorMovies = originalGetActorMovies;
    tmdbService.getMovieCredits = originalGetMovieCredits;
    tmdbService.getActorsByTier = originalGetActorsByTier;
    tmdbService.getQualityActorPool = originalGetQualityActorPool;
    Math.random = originalRandom;
  }
}

async function testSequentialUniqueness(): Promise<void> {
  const originalGenerateDailyActors = gameLogicService.generateDailyActors.bind(gameLogicService);
  const exclusionSnapshots: number[][] = [];

  try {
    gameLogicService.generateDailyActors = async (difficulty, excludeActorIds = []) => {
      exclusionSnapshots.push([...excludeActorIds]);

      if (difficulty === "easy") {
        return { actor1: actor(1, "Easy One"), actor2: actor(2, "Easy Two"), distance: 2 };
      }
      if (difficulty === "medium") {
        return { actor1: actor(3, "Medium One"), actor2: actor(4, "Medium Two"), distance: 3 };
      }

      return { actor1: actor(5, "Hard One"), actor2: actor(6, "Hard Two"), distance: 5 };
    };

    const results = await gameLogicService.generateAllDailyChallenges([]);

    assert.deepEqual(
      exclusionSnapshots,
      [
        [],
        [1, 2],
        [1, 2, 3, 4],
      ],
      "Full-set generation should carry actor exclusions forward by difficulty",
    );
    assert.equal(results.size, 3, "All three difficulties should be generated");
  } finally {
    gameLogicService.generateDailyActors = originalGenerateDailyActors;
  }
}

async function main(): Promise<void> {
  await testEasyMovieFloorAndTieredPool();
  await testSequentialUniqueness();
  console.log("PASS: easy-mode generation regression checks passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
