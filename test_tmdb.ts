import { gameLogicService, type DifficultyLevel } from "./api/_server/services/gameLogic.ts";
import { tmdbService } from "./api/_server/services/tmdb.ts";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

// ─── Test 1: getQualityActorPool ────────────────────────────────────────────

async function testQualityActorPool() {
  console.log("\n--- Test: getQualityActorPool ---");
  const pool = await tmdbService.getQualityActorPool();

  assert(pool.length >= 2, `Pool has at least 2 actors (got ${pool.length})`);
  assert(pool.length <= 60, `Pool is capped at 60 before filtering (got ${pool.length})`);

  // Every actor should have a profile_path (filterActorsByGenre requires it)
  const allHavePhotos = pool.every(a => a.profile_path);
  assert(allHavePhotos, "All actors have profile_path");

  // Every actor should have an id and name
  const allHaveIds = pool.every(a => a.id && a.name);
  assert(allHaveIds, "All actors have id and name");

  // No duplicates
  const ids = pool.map(a => a.id);
  const uniqueIds = new Set(ids);
  assert(ids.length === uniqueIds.size, `No duplicate actors (${ids.length} total, ${uniqueIds.size} unique)`);

  return pool;
}

// ─── Test 2: generateDailyActors (single difficulty) ────────────────────────

async function testGenerateDailyActors() {
  console.log("\n--- Test: generateDailyActors (each difficulty) ---");

  for (const difficulty of ["easy", "medium", "hard"] as DifficultyLevel[]) {
    const result = await gameLogicService.generateDailyActors(difficulty, []);
    assert(result !== null, `${difficulty}: returned a pair`);
    if (result) {
      assert(result.actor1.id !== result.actor2.id, `${difficulty}: actors are different (${result.actor1.name} vs ${result.actor2.name})`);
      assert(!!result.actor1.name && !!result.actor2.name, `${difficulty}: both actors have names`);
      console.log(`    ${difficulty}: ${result.actor1.name} <-> ${result.actor2.name}`);
    }
  }
}

// ─── Test 3: generateDailyActors respects excludeActorIds ───────────────────

async function testExcludeActors() {
  console.log("\n--- Test: generateDailyActors respects excludeActorIds ---");

  // First generate a pair to get real actor IDs to exclude
  const first = await gameLogicService.generateDailyActors("easy", []);
  assert(first !== null, "Got initial pair to build exclude list");
  if (!first) return;

  const excludeIds = [first.actor1.id, first.actor2.id];
  console.log(`  Excluding: ${first.actor1.name} (${first.actor1.id}), ${first.actor2.name} (${first.actor2.id})`);

  const second = await gameLogicService.generateDailyActors("easy", excludeIds);
  assert(second !== null, "Got second pair with exclusions");
  if (second) {
    assert(!excludeIds.includes(second.actor1.id), `actor1 (${second.actor1.name}) not in exclude list`);
    assert(!excludeIds.includes(second.actor2.id), `actor2 (${second.actor2.name}) not in exclude list`);
  }
}

// ─── Test 4: generateAllDailyChallenges ─────────────────────────────────────

async function testGenerateAllDailyChallenges() {
  console.log("\n--- Test: generateAllDailyChallenges ---");

  const results = await gameLogicService.generateAllDailyChallenges([]);

  assert(results.size > 0, `At least 1 difficulty filled (got ${results.size})`);
  assert(results.size === 3, `All 3 difficulties filled (got ${results.size})`);

  for (const difficulty of ["easy", "medium", "hard"] as DifficultyLevel[]) {
    const pair = results.get(difficulty);
    if (pair) {
      assert(pair.actor1.id !== pair.actor2.id, `${difficulty}: actors are different`);
      console.log(`    ${difficulty}: ${pair.actor1.name} <-> ${pair.actor2.name}`);
    } else {
      console.log(`    ${difficulty}: MISSING`);
    }
  }

  return results;
}

// ─── Test 5: Cross-bucket actor uniqueness ──────────────────────────────────

async function testCrossBucketUniqueness() {
  console.log("\n--- Test: Cross-bucket actor uniqueness ---");

  // Run generateAllDailyChallenges multiple times to stress-test uniqueness
  for (let run = 0; run < 3; run++) {
    const results = await gameLogicService.generateAllDailyChallenges([]);
    const allActorIds: number[] = [];
    const allActorNames: string[] = [];

    for (const [difficulty, pair] of results) {
      allActorIds.push(pair.actor1.id, pair.actor2.id);
      allActorNames.push(pair.actor1.name, pair.actor2.name);
    }

    const uniqueActorIds = new Set(allActorIds);
    const hasDuplicates = allActorIds.length !== uniqueActorIds.size;

    if (hasDuplicates) {
      // Find which actors are duplicated
      const seen = new Map<number, string>();
      const dupes: string[] = [];
      for (let i = 0; i < allActorIds.length; i++) {
        const id = allActorIds[i];
        if (seen.has(id)) {
          dupes.push(`${allActorNames[i]} (${id})`);
        }
        seen.set(id, allActorNames[i]);
      }
      assert(false, `Run ${run + 1}: No duplicate actors across difficulties — dupes: ${dupes.join(", ")}`);
    } else {
      assert(true, `Run ${run + 1}: All ${allActorIds.length} actors unique across ${results.size} difficulties`);
    }
  }
}

// ─── Test 6: generateAllDailyChallenges with excludeActorIds ────────────────

async function testUnifiedExclusions() {
  console.log("\n--- Test: generateAllDailyChallenges respects excludeActorIds ---");

  // Generate first set, then exclude all those actors for a second set
  const first = await gameLogicService.generateAllDailyChallenges([]);
  const excludeIds: number[] = [];
  for (const [, pair] of first) {
    excludeIds.push(pair.actor1.id, pair.actor2.id);
  }

  console.log(`  Excluding ${excludeIds.length} actors from first generation`);
  const second = await gameLogicService.generateAllDailyChallenges(excludeIds);

  for (const [difficulty, pair] of second) {
    assert(!excludeIds.includes(pair.actor1.id), `${difficulty}: actor1 (${pair.actor1.name}) not excluded`);
    assert(!excludeIds.includes(pair.actor2.id), `${difficulty}: actor2 (${pair.actor2.name}) not excluded`);
  }
}

// ─── Test 7: getPopularActors uses quality pool ─────────────────────────────

async function testPopularActorsUsesQualityPool() {
  console.log("\n--- Test: getPopularActors delegates to getQualityActorPool ---");

  const popular = await tmdbService.getPopularActors();
  assert(popular.length >= 2, `getPopularActors returns actors (got ${popular.length})`);

  // Should have the same shape as getQualityActorPool
  const allHavePhotos = popular.every(a => a.profile_path);
  assert(allHavePhotos, "All actors from getPopularActors have profile_path");
}

// ─── Runner ─────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Distance-Based Difficulty Generation Tests ===");
  console.log("(These are integration tests that hit the live TMDB API)\n");

  const startTime = Date.now();

  try {
    await testQualityActorPool();
    await testGenerateDailyActors();
    await testExcludeActors();
    await testGenerateAllDailyChallenges();
    await testCrossBucketUniqueness();
    await testUnifiedExclusions();
    await testPopularActorsUsesQualityPool();
  } catch (error) {
    console.error("\nUnexpected error:", error);
    failed++;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== Results: ${passed} passed, ${failed} failed (${elapsed}s) ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
