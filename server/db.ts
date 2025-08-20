import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure connection pool with retry settings
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20
});

export const db = drizzle({ client: pool, schema });

// Connection retry wrapper
export async function withRetry<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a connection error
      if (error?.code === 'EAI_AGAIN' || error?.message?.includes('getaddrinfo') || 
          error?.message?.includes('connection') || error?.code === 'ENOTFOUND') {
        console.log(`Connection attempt ${attempt} failed, retrying in ${attempt * 1000}ms...`);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          continue;
        }
      }
      
      // If it's not a connection error or we've exhausted retries, throw immediately
      throw error;
    }
  }
  
  throw lastError;
}