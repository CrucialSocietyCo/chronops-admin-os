-- Profile Cards v1 - Persona System

-- 1. Actors (Private Identity)
CREATE TABLE IF NOT EXISTS public.actors (
    actor_id text PRIMARY KEY, -- Uses fingerprintKey
    total_message_count bigint NOT NULL DEFAULT 0,
    persona_count int NOT NULL DEFAULT 0,
    last_seen_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- 2. Personas (Public Identity)
CREATE TABLE IF NOT EXISTS public.personas (
    persona_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id text NOT NULL REFERENCES public.actors(actor_id) ON DELETE CASCADE,
    display_name text NOT NULL,
    vibe_tag text,
    joined_at timestamptz NOT NULL DEFAULT now(),
    message_count bigint NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    retired_at timestamptz,
    CONSTRAINT display_name_length CHECK (char_length(display_name) <= 32),
    CONSTRAINT vibe_tag_length CHECK (char_length(vibe_tag) <= 24)
);

CREATE INDEX IF NOT EXISTS personas_actor_id_idx ON public.personas(actor_id);
CREATE INDEX IF NOT EXISTS personas_is_active_idx ON public.personas(is_active);

-- 3. Update Messages Table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'persona_id') THEN
        ALTER TABLE public.messages ADD COLUMN persona_id uuid REFERENCES public.personas(persona_id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS messages_persona_id_idx ON public.messages(persona_id);

-- 4. Persona Cards View (Public API)
CREATE OR REPLACE VIEW public.persona_cards AS
SELECT
    persona_id,
    display_name,
    vibe_tag,
    joined_at,
    message_count,
    CASE
        WHEN message_count < 20 THEN 'New'
        WHEN message_count < 200 THEN 'Active'
        WHEN message_count < 500 THEN 'Regular'
        WHEN message_count < 1000 THEN 'OG'
        ELSE 'Super Speaker'
    END as activity_tier
FROM public.personas
WHERE is_active = true;

-- Grant permissions
GRANT SELECT ON public.persona_cards TO anon, authenticated, service_role;
GRANT ALL ON public.actors TO service_role;
GRANT ALL ON public.personas TO service_role;

-- 5. Atomic Stats Increment RPC
CREATE OR REPLACE FUNCTION increment_persona_stats(p_id uuid, a_id text)
RETURNS void AS $$
BEGIN
  UPDATE public.personas SET message_count = message_count + 1 WHERE persona_id = p_id;
  UPDATE public.actors SET total_message_count = total_message_count + 1 WHERE actor_id = a_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_persona_stats(uuid, text) TO service_role;

