import assert from "node:assert/strict";

import { EASY_ACTOR_ALLOWLIST } from "../data/easyActorAllowlist.js";
import { tmdbService } from "../services/tmdb.js";

async function main(): Promise<void> {
  const actors = await tmdbService.getActorsByTier("easy");

  assert.equal(
    actors.length,
    EASY_ACTOR_ALLOWLIST.length,
    "Easy tier should return the full curated allowlist",
  );

  const actorIds = actors.map((actor) => actor.id);
  const allowlistIds = EASY_ACTOR_ALLOWLIST.map((actor) => actor.id);
  assert.deepEqual(
    actorIds,
    allowlistIds,
    "Easy tier should preserve the curated allowlist order and IDs",
  );

  const actorNames = actors.map((actor) => actor.name);
  const allowlistNames = EASY_ACTOR_ALLOWLIST.map((actor) => actor.name);
  assert.deepEqual(
    actorNames,
    allowlistNames,
    "Easy tier should map the curated allowlist names directly",
  );

  const uniqueIds = new Set(allowlistIds);
  assert.equal(uniqueIds.size, allowlistIds.length, "Curated allowlist should not contain duplicate IDs");

  const missingProfiles = actors.filter((actor) => !actor.profile_path);
  assert.equal(missingProfiles.length, 0, "Curated easy actors should all have profile paths");

  const nonActors = actors.filter((actor) => actor.known_for_department !== "Acting");
  assert.equal(nonActors.length, 0, "Curated easy actors should all be marked as acting");

  console.log(`PASS: easy actor allowlist integration verified (${actors.length} actors).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
