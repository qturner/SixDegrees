import * as dotenv from "dotenv";
dotenv.config();
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "../../shared/schema.js";

const isProd = process.env.NODE_ENV === 'production';

// Only use WebSockets in non-production/local environments
if (!isProd) {
  const ws = (await import("ws")).default;
  neonConfig.webSocketConstructor = ws;
}

neonConfig.fetchConnectionCache = true;
neonConfig.useSecureWebSocket = !isProd;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Lazy-initialized pool and db
let internalPool: Pool | null = null;
let internalDb: any = null;

export const getPool = () => {
  if (!internalPool) {
    console.log('Initializing database pool...');
    internalPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 300000,
      max: 5,
      allowExitOnIdle: true,
      application_name: 'movie-connection-game',
      statement_timeout: 5000,
      query_timeout: 5000,
    });

    internalPool.on('error', (err) => {
      console.error('Database pool error:', err);
    });

    internalPool.on('connect', () => {
      console.log('Database pool connected successfully');
    });
  }
  return internalPool;
};

export const getDb = () => {
  if (!internalDb) {
    internalDb = drizzle({ client: getPool(), schema });
  }
  return internalDb;
};

// Maintain backwards compatibility for external imports if possible,
// but it's safer to use proxies or update callers.
export const pool = new Proxy({} as Pool, {
  get: (target, prop) => {
    const p = getPool();
    const val = (p as any)[prop];
    return typeof val === 'function' ? val.bind(p) : val;
  }
});

export const db = new Proxy({} as any, {
  get: (target, prop) => {
    const d = getDb();
    const val = (d as any)[prop];
    return typeof val === 'function' ? val.bind(d) : val;
  }
});

// Enhanced connection retry wrapper with exponential backoff
export async function withRetry<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
  let lastError: any;
  const isProd = process.env.NODE_ENV === 'production';
  // Reduce retries in production to avoid lambda timeouts
  const actualMaxRetries = isProd ? 2 : maxRetries;

  for (let attempt = 1; attempt <= actualMaxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if it's a connection error that should trigger retry
      const isRetryableError =
        error?.code === 'EAI_AGAIN' ||
        error?.code === 'ENOTFOUND' ||
        error?.code === 'ECONNREFUSED' ||
        error?.code === 'ETIMEDOUT' ||
        error?.message?.includes('getaddrinfo') ||
        error?.message?.includes('connection') ||
        error?.message?.includes('timeout') ||
        error?.message?.includes('WebSocket') ||
        error?.message?.includes('Cannot set property message') ||
        error?.name === 'ErrorEvent' ||
        error?.name === 'TypeError';

      if (isRetryableError) {
        // Shorter delays for production
        const baseDelay = isProd ? 500 : 2000;
        const delay = Math.min(baseDelay * Math.pow(1.5, attempt - 1), 10000);
        console.log(`Database connection attempt ${attempt}/${actualMaxRetries} failed: ${error.message || error.toString()}`);

        if (attempt < actualMaxRetries) {
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      // If it's not a retryable error or we've exhausted retries, throw immediately
      throw error;
    }
  }

  throw lastError;
}

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await withRetry(async () => {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
        return true;
      } finally {
        client.release();
      }
    });
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}