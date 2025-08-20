import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon with better error handling and retry settings
neonConfig.webSocketConstructor = ws;
neonConfig.fetchConnectionCache = true;
neonConfig.useSecureWebSocket = true;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure connection pool with enhanced retry and timeout settings
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 15000, // Increased timeout
  idleTimeoutMillis: 60000, // Increased idle timeout
  max: 10, // Reduced max connections for stability
  allowExitOnIdle: true
});

// Add connection event handlers
pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

pool.on('connect', () => {
  console.log('Database pool connected successfully');
});

export const db = drizzle({ client: pool, schema });

// Enhanced connection retry wrapper with exponential backoff
export async function withRetry<T>(operation: () => Promise<T>, maxRetries: number = 5): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
        error?.name === 'ErrorEvent';
      
      if (isRetryableError) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
        console.log(`Database connection attempt ${attempt}/${maxRetries} failed: ${error.message}`);
        
        if (attempt < maxRetries) {
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          console.error(`All ${maxRetries} connection attempts failed. Last error:`, error.message);
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