-- Add type and payload columns to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'user',
ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}';

-- Create moderation_settings table
CREATE TABLE IF NOT EXISTS moderation_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    room_id TEXT DEFAULT 'global',
    ai_persona_rewrite_enabled BOOLEAN DEFAULT false
);

-- Insert default settings row for 'global' room if it doesn't exist
INSERT INTO moderation_settings (room_id, ai_persona_rewrite_enabled)
SELECT 'global', false
WHERE NOT EXISTS (
    SELECT 1 FROM moderation_settings WHERE room_id = 'global'
);

-- Enable RLS
ALTER TABLE moderation_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read settings (needed for moderation check? actually logic is server-side service role, but frontend might need to read state)
CREATE POLICY "Allow read access for authenticated users" ON moderation_settings
    FOR SELECT TO authenticated USING (true);

-- Policy: Only admins can update (For now, allow authenticated to update for MVP demo perms, or restrict?)
-- Ideally restrict to admin. Assuming we check is_admin in backend before allowing update.
-- For simplicity in MVP, allow any authenticated user to update 'global' settings (Assuming only admins access admin panel)
CREATE POLICY "Allow update access for authenticated users" ON moderation_settings
    FOR UPDATE TO authenticated USING (true);

-- Also allow service role full access (implicit, but good to note)
