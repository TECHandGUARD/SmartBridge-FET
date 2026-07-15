// src/lib/supabase.js
// ============================================================
// Re‑export everything from the main client file.
// This ensures both `@/lib/supabase` and `@/lib/supabaseClient`
// imports work identically.
// ============================================================

export * from './supabaseClient';
