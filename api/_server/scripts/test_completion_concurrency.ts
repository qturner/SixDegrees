type ExpectationMode = "auto" | "new" | "existing";

type UserStatsResponse = {
  totalCompletions?: number | null;
  totalMoves?: number | null;
};

type RequestResult = {
  index: number;
  status: number;
  bodyText: string;
  bodyJson: unknown;
};

type CliOptions = {
  baseUrl: string;
  cookie: string;
  challengeId: string;
  moves: number;
  parallel: number;
  expectation: ExpectationMode;
  connections: string;
};

function parseArgs(argv: string[]): CliOptions {
  const get = (name: string): string | undefined => {
    const exact = `--${name}`;
    const prefix = `${exact}=`;
    for (let i = 0; i < argv.length; i += 1) {
      const arg = argv[i];
      if (arg === exact) return argv[i + 1];
      if (arg.startsWith(prefix)) return arg.slice(prefix.length);
    }
    return undefined;
  };

  const baseUrl = (get("base-url") ?? get("baseUrl") ?? "").trim();
  const cookie = (get("cookie") ?? "").trim();
  const challengeId = (get("challenge-id") ?? get("challengeId") ?? "").trim();
  const moves = Number.parseInt(get("moves") ?? "3", 10);
  const parallel = Number.parseInt(get("parallel") ?? "10", 10);
  const expectationRaw = (get("expect") ?? "auto").trim().toLowerCase();
  const connectionsRaw = get("connections") ?? "[]";

  if (!baseUrl) throw new Error("Missing --base-url");
  if (!cookie) throw new Error("Missing --cookie");
  if (!challengeId) throw new Error("Missing --challenge-id");
  if (!Number.isFinite(moves) || moves < 1 || moves > 6) throw new Error("--moves must be an integer in [1, 6]");
  if (!Number.isFinite(parallel) || parallel < 2 || parallel > 200) throw new Error("--parallel must be an integer in [2, 200]");
  if (!["auto", "new", "existing"].includes(expectationRaw)) throw new Error("--expect must be one of: auto, new, existing");

  // Validate that this is a JSON string to match API contract.
  JSON.parse(connectionsRaw);

  return {
    baseUrl: baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl,
    cookie,
    challengeId,
    moves,
    parallel,
    expectation: expectationRaw as ExpectationMode,
    connections: connectionsRaw,
  };
}

async function requestJson<T>(baseUrl: string, path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, init);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${path}: ${text}`);
  }
  return JSON.parse(text) as T;
}

async function getStats(baseUrl: string, cookie: string): Promise<UserStatsResponse> {
  return requestJson<UserStatsResponse>(baseUrl, "/api/user/stats", {
    method: "GET",
    headers: { Cookie: cookie },
  });
}

async function verifyAuth(baseUrl: string, cookie: string): Promise<void> {
  await requestJson<Record<string, unknown>>(baseUrl, "/api/user/me", {
    method: "GET",
    headers: { Cookie: cookie },
  });
}

async function sendOneCompletion(
  baseUrl: string,
  cookie: string,
  challengeId: string,
  moves: number,
  connections: string,
  index: number,
): Promise<RequestResult> {
  const res = await fetch(`${baseUrl}/api/user-challenge-completion`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      challengeId,
      moves,
      connections,
    }),
  });

  const bodyText = await res.text();
  let bodyJson: unknown = null;
  try {
    bodyJson = JSON.parse(bodyText);
  } catch {
    bodyJson = null;
  }

  return {
    index,
    status: res.status,
    bodyText,
    bodyJson,
  };
}

function usage(): string {
  return [
    "Usage:",
    "  npx tsx api/_server/scripts/test_completion_concurrency.ts \\",
    "    --base-url https://www.sixdegrees.app \\",
    "    --cookie 'session=...; session.sig=...' \\",
    "    --challenge-id <uuid> \\",
    "    --moves 4 \\",
    "    --parallel 20 \\",
    "    --expect auto",
    "",
    "Notes:",
    "  --connections defaults to '[]' and must be a JSON string.",
    "  --expect: auto | new | existing",
    "    auto: derives expected stats delta from observed 201 count.",
    "    new: expects exactly one 201 (fresh completion path).",
    "    existing: expects zero 201 (already completed path).",
  ].join("\n");
}

function getStatusCounts(results: RequestResult[]): Record<string, number> {
  return results.reduce<Record<string, number>>((acc, item) => {
    const key = String(item.status);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function fail(message: string): never {
  console.error(`\nFAIL: ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  let options: CliOptions;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error("");
    console.error(usage());
    process.exit(1);
    return;
  }

  console.log(`Base URL: ${options.baseUrl}`);
  console.log(`Challenge: ${options.challengeId}`);
  console.log(`Moves: ${options.moves}`);
  console.log(`Parallel Requests: ${options.parallel}`);
  console.log(`Expectation: ${options.expectation}`);

  await verifyAuth(options.baseUrl, options.cookie);
  const before = await getStats(options.baseUrl, options.cookie);
  const beforeCompletions = before.totalCompletions ?? 0;
  const beforeMoves = before.totalMoves ?? 0;

  console.log(`Stats before: totalCompletions=${beforeCompletions}, totalMoves=${beforeMoves}`);
  console.log("Sending concurrent completion requests...");

  const startedAt = Date.now();
  const results = await Promise.all(
    Array.from({ length: options.parallel }, (_, index) =>
      sendOneCompletion(options.baseUrl, options.cookie, options.challengeId, options.moves, options.connections, index + 1),
    ),
  );
  const durationMs = Date.now() - startedAt;

  const statusCounts = getStatusCounts(results);
  const createdCount = results.filter((r) => r.status === 201).length;

  console.log(`Request batch finished in ${durationMs}ms`);
  console.log(`Status counts: ${JSON.stringify(statusCounts)}`);

  if (createdCount > 1) {
    fail(`Expected at most one 201, got ${createdCount}`);
  }

  if (options.expectation === "new" && createdCount !== 1) {
    fail(`Expected exactly one 201 for --expect new, got ${createdCount}`);
  }
  if (options.expectation === "existing" && createdCount !== 0) {
    fail(`Expected zero 201 for --expect existing, got ${createdCount}`);
  }

  const after = await getStats(options.baseUrl, options.cookie);
  const afterCompletions = after.totalCompletions ?? 0;
  const afterMoves = after.totalMoves ?? 0;
  const completionDelta = afterCompletions - beforeCompletions;
  const movesDelta = afterMoves - beforeMoves;

  const expectedInsertions = options.expectation === "new"
    ? 1
    : options.expectation === "existing"
      ? 0
      : createdCount;
  const expectedCompletionDelta = expectedInsertions;
  const expectedMovesDelta = expectedInsertions * options.moves;

  console.log(`Stats after: totalCompletions=${afterCompletions}, totalMoves=${afterMoves}`);
  console.log(`Observed deltas: completions=${completionDelta}, moves=${movesDelta}`);
  console.log(`Expected deltas: completions=${expectedCompletionDelta}, moves=${expectedMovesDelta}`);

  if (completionDelta !== expectedCompletionDelta) {
    fail(`Unexpected totalCompletions delta: got ${completionDelta}, expected ${expectedCompletionDelta}`);
  }
  if (movesDelta !== expectedMovesDelta) {
    fail(`Unexpected totalMoves delta: got ${movesDelta}, expected ${expectedMovesDelta}`);
  }

  const badStatuses = results.filter((r) => ![200, 201, 409].includes(r.status));
  if (badStatuses.length > 0) {
    const sample = badStatuses.slice(0, 3).map((r) => `#${r.index} ${r.status}: ${r.bodyText}`).join("\n");
    fail(`Unexpected HTTP statuses detected:\n${sample}`);
  }

  console.log("\nPASS: No lost increments detected for totalCompletions/totalMoves under concurrent requests.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
