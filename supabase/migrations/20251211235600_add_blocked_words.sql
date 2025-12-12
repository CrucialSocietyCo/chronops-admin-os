-- Add bad_words column to moderation_settings table
ALTER TABLE moderation_settings
ADD COLUMN IF NOT EXISTS bad_words TEXT[] DEFAULT '{}';

-- Force schema cache reload
NOTIFY pgrst, 'reload config';
