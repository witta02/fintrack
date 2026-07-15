-- Supabase SQL Update Script for Gamification XP & Levels
-- Run this in your Supabase project's SQL Editor

-- 1. Add XP column (defaults to 0)
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;

-- 2. Add Level column (defaults to 1)
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- Note: The RLS policies on the 'settings' table do not need to be changed.
-- The existing policies will allow users to read/update their own xp and level.
