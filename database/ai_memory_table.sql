-- ============================================
-- AI USER MEMORY TABLE FOR SUPABASE
-- Run this in Supabase SQL Editor
-- ============================================

-- Create the ai_user_memory table
CREATE TABLE IF NOT EXISTS ai_user_memory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    memory_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_ai_user_memory_user_id ON ai_user_memory(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE ai_user_memory ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own AI memory
CREATE POLICY "Users can view own AI memory" ON ai_user_memory
    FOR SELECT USING (true);  -- Allow all reads for now (auth handled in app)

-- Policy: Users can insert their own AI memory
CREATE POLICY "Users can insert own AI memory" ON ai_user_memory
    FOR INSERT WITH CHECK (true);  -- Allow all inserts

-- Policy: Users can update their own AI memory
CREATE POLICY "Users can update own AI memory" ON ai_user_memory
    FOR UPDATE USING (true);  -- Allow all updates

-- Add comment
COMMENT ON TABLE ai_user_memory IS 'Stores AI learning data per user for cross-device sync';

-- ============================================
-- SAMPLE DATA STRUCTURE (for reference)
-- ============================================
-- memory_data JSON structure:
-- {
--   "corrections": { "petrol": "Fuel", "makan": "Food" },
--   "entityTypes": { "abc sdn bhd": "supplier" },
--   "preferences": { "language": "en" },
--   "customTerms": { "boss": "manager" },
--   "typoFixes": { "invioce": "invoice" },
--   "lastUpdated": "2026-01-05T10:30:00Z",
--   "userId": "user_123"
-- }
