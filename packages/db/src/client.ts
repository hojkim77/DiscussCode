import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
}

// Server-side client with service role key (bypasses RLS — use only in API/workers)
export const db = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

// Anon client for JWT-scoped operations
export const createAnonClient = (jwt?: string) =>
  createClient<Database>(supabaseUrl, process.env.SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
    global: jwt ? { headers: { Authorization: `Bearer ${jwt}` } } : undefined,
  });
