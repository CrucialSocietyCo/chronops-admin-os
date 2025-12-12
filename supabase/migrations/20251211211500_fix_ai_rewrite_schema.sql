-- SAFE MIGRATION: Ensure moderation_settings has required structure
-- This handles cases where table existed but column didn't (Legacy)
-- Or table exists but row is missing.

-- 1. Ensure Table Exists (Already in previous migration, but safe to repeat IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS moderation_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    room_id TEXT DEFAULT 'global',
    ai_persona_rewrite_enabled BOOLEAN DEFAULT false
);

-- 2. Add column if it doesn't exist (For existing tables)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'moderation_settings' AND column_name = 'ai_persona_rewrite_enabled') THEN
        ALTER TABLE moderation_settings ADD COLUMN ai_persona_rewrite_enabled BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'moderation_settings' AND column_name = 'room_id') THEN
        ALTER TABLE moderation_settings ADD COLUMN room_id TEXT DEFAULT 'global';
    END IF;
END $$;

-- 3. Ensure a row exists for 'global' room
INSERT INTO moderation_settings (room_id, ai_persona_rewrite_enabled)
SELECT 'global', false
WHERE NOT EXISTS (
    SELECT 1 FROM moderation_settings WHERE room_id = 'global'
);

-- 4. Enable RLS if not enabled
ALTER TABLE moderation_settings ENABLE ROW LEVEL SECURITY;

-- 5. Policies (Drop and Recreate to be safe)
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON moderation_settings;
DROP POLICY IF EXISTS "Allow update access for authenticated users" ON moderation_settings;

CREATE POLICY "Allow read access for authenticated users" ON moderation_settings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow update access for authenticated users" ON moderation_settings
    FOR UPDATE TO authenticated USING (true);
