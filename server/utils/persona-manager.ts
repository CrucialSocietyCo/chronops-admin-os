import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'

export async function ensurePersonaForActor(event: H3Event, actorId: string, displayName: string) {
    const client = serverSupabaseServiceRole(event)
    if (!client) throw new Error('Service Role unavailable for Persona Management')

    // 1. Ensure Actor Exists
    const { error: actorError } = await client
        .from('actors')
        .upsert({
            actor_id: actorId,
            last_seen_at: new Date().toISOString()
        }, { onConflict: 'actor_id' })

    if (actorError) {
        console.error('[PersonaManager] Actor Upsert Error:', actorError)
    }

    // 2. Find Active Persona
    const { data: activePersona } = await client
        .from('personas')
        .select('persona_id, display_name')
        .eq('actor_id', actorId)
        .eq('is_active', true)
        .maybeSingle()

    let personaId = activePersona?.persona_id

    // 3. Logic: Rename = New Persona
    if (activePersona) {
        if (activePersona.display_name !== displayName) {

            // Retire Old
            await client.from('personas').update({
                is_active: false,
                retired_at: new Date().toISOString()
            }).eq('persona_id', activePersona.persona_id)

            // Create New
            const { data: newPersona, error: newError } = await client.from('personas').insert({
                actor_id: actorId,
                display_name: displayName,
                is_active: true,
                message_count: 0
            }).select('persona_id').single()

            if (newError) throw newError
            personaId = newPersona.persona_id

            // Increment Actor Persona Count
            const { data: actor } = await client.from('actors').select('persona_count').eq('actor_id', actorId).single()
            if (actor) {
                await client.from('actors').update({ persona_count: actor.persona_count + 1 }).eq('actor_id', actorId)
            }
        }
    } else {
        // Create First Persona
        const { data: newPersona, error: newError } = await client.from('personas').insert({
            actor_id: actorId,
            display_name: displayName,
            is_active: true,
            message_count: 0
        }).select('persona_id').single()

        if (newError) throw newError
        personaId = newPersona.persona_id

        const { data: actor } = await client.from('actors').select('persona_count').eq('actor_id', actorId).single()
        if (actor) {
            await client.from('actors').update({ persona_count: actor.persona_count + 1 }).eq('actor_id', actorId)
        }
    }

    return personaId
}

export async function incrementStats(event: H3Event, personaId: string, actorId: string) {
    const client = serverSupabaseServiceRole(event)
    if (!client) return
    await client.rpc('increment_persona_stats', { p_id: personaId, a_id: actorId })
}
