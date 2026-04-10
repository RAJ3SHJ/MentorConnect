import { createClient } from '@supabase/supabase-js';

// Fallback to hardcoded values for production APK builds (these are public/anon keys, safe to expose)
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://fxmqluspbkjjajdnnxel.supabase.co';

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4bXFsdXNwYmtqamFqZG5ueGVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NzkxMTQsImV4cCI6MjA5MDM1NTExNH0.mCeIB_KxKQqhHg35fVMem5xlq8y6X07xiX9GK31NrfM';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not found. Real-time sync will be disabled.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
