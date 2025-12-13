-- Drop existing view to redefine it
DROP VIEW IF EXISTS public.persona_cards;

-- Recreate view with is_online and last_seen_at
CREATE OR REPLACE VIEW public.persona_cards AS
SELECT 
    p.persona_id,
    p.display_name,
    p.vibe_tag,
    p.joined_at,
    p.message_count,
    -- Activity Tier Logic
    CASE
        WHEN p.message_count < 20 THEN 'New'
        WHEN p.message_count < 200 THEN 'Active'
        WHEN p.message_count < 500 THEN 'Regular'
        WHEN p.message_count < 1000 THEN 'OG'
        ELSE 'Super Speaker'
    END as activity_tier,
    -- Presence Logic: Active in last 5 minutes
    ((now() - a.last_seen_at) < interval '5 minutes') as is_online,
    a.last_seen_at
FROM 
    public.personas p
JOIN
    public.actors a ON p.actor_id = a.actor_id
WHERE 
    p.is_active = true;

GRANT SELECT ON public.persona_cards TO anon, authenticated, service_role;
