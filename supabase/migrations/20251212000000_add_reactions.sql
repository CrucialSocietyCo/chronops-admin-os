-- Create table for message reactions
CREATE TABLE IF NOT EXISTS chat_message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    reaction_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(message_id, session_id, reaction_type)
);

-- Index for faster counting
CREATE INDEX IF NOT EXISTS idx_reactions_message_id ON chat_message_reactions(message_id);

-- Enable RLS (though mostly accessed via service role in our API)
ALTER TABLE chat_message_reactions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read reactions (needed for initial load if we fetch them client side,
-- though we might pass them aggregated. Let's allow read just in case).
CREATE POLICY "Allow public read of reactions" ON chat_message_reactions
    FOR SELECT TO anon, authenticated USING (true);
