import { EASY_ACTOR_ALLOWLIST } from "../data/easyActorAllowlist.js";
import { tmdbService } from "../services/tmdb.js";

function parseLimit(argv: string[]): number {
  const exact = "--limit";
  const prefix = `${exact}=`;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === exact) {
      return Number.parseInt(argv[i + 1] ?? "", 10);
    }
    if (arg.startsWith(prefix)) {
      return Number.parseInt(arg.slice(prefix.length), 10);
    }
  }

  return EASY_ACTOR_ALLOWLIST.length;
}

async function main(): Promise<void> {
  const limit = Math.min(
    EASY_ACTOR_ALLOWLIST.length,
    Math.max(1, parseLimit(process.argv.slice(2)) || EASY_ACTOR_ALLOWLIST.length),
  );

  console.log(`# Easy Actor Allowlist Review`);
  console.log("");
  console.log(`Seed actors reviewed: ${limit} of ${EASY_ACTOR_ALLOWLIST.length}`);
  console.log("");

  for (const actor of EASY_ACTOR_ALLOWLIST.slice(0, limit)) {
    const movies = await tmdbService.getActorMovies(actor.id);
    const topMovies = [...movies]
      .sort((a, b) => {
        const voteDelta = (b.vote_count ?? 0) - (a.vote_count ?? 0);
        if (voteDelta !== 0) return voteDelta;
        return (b.popularity ?? 0) - (a.popularity ?? 0);
      })
      .slice(0, 5)
      .map((movie) => `${movie.title} (${movie.release_date?.slice(0, 4) ?? "?"}, votes=${movie.vote_count ?? 0})`);

    console.log(`## ${actor.name} (${actor.id})`);
    if (topMovies.length === 0) {
      console.log("- No qualifying movie credits returned");
    } else {
      for (const movie of topMovies) {
        console.log(`- ${movie}`);
      }
    }
    console.log("");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
