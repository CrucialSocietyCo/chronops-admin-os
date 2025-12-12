import { serverSupabaseClient, serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { handleIncomingMessage, buildFingerprint } from '../utils/southmain-mod'


export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event)
    let user = await serverSupabaseUser(event)

    // If cookie auth failed, try Bearer token from header
    if (!user) {
        const authHeader = getRequestHeader(event, 'Authorization')
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1]
            const { data, error } = await client.auth.getUser(token) // Verify token manually
            if (data?.user) {
                user = data.user
            }
        }
    }

    // ----------------------------------------------------------------------
    // AI LOGIC (Inlined for Safety)
    // ----------------------------------------------------------------------
    const generatePersonaRewrite = async (originalText: string): Promise<string> => {
        const config = useRuntimeConfig()
        const apiKey = config.GOOGLE_GENERATIVE_AI_API_KEY || config.public?.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY

        const FALLBACKS = [
            "I must respectfully disagree with your statement.",
            "I am afraid that simply isn't protocol at this establishment.",
            "Have you tried turning your attitude off and on again?",
            "My legal counsel advises me to ignore that remark.",
            "I hear you, and I am validiating your feelings of frustration.",
            "Let's stick to the agenda, shall we?"
        ]
        const getFallback = () => FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)]

        const PERSONAS = [
            { name: "Corporate HR", instr: "Rewrite this into polite but cold, soulless Corporate Email Speak." },
            { name: "Fancy Butler", instr: "Rewrite this as a hyper-polite, upper-class British butler quietly judging the user." },
            { name: "Grumpy Sysadmin", instr: "Rewrite this as a tired IT System Administrator asking if they have read the manual." },
            { name: "Corporate Lawyer", instr: "Rewrite this as a defensive lawyer citing non-existent policy terms to deflect blame." },
            { name: "Therapist", instr: "Rewrite this as a gentle therapist validating feelings but setting firm boundaries." },
            { name: "Passive Aggressive", instr: "Rewrite this into an extremely passive-aggressive and condescending remark." }
        ]

        const selectedPersona = PERSONAS[Math.floor(Math.random() * PERSONAS.length)]

        console.log('[AI] Key present?', !!apiKey, 'Start:', apiKey ? apiKey.substring(0, 4) : 'N/A')
        console.log('[AI] Selected Persona:', selectedPersona.name)

        if (!apiKey) {
            console.warn('[AI] Missing GOOGLE_GENERATIVE_AI_API_KEY. Using fallback.')
            return getFallback()
        }

        const prompt = `
System / Instruction:
"Your goal is to rewrite rude/aggressive chat messages into a specific Persona Tone.
CURRENT PERSONA: ${selectedPersona.instr}

- Output ONLY the rewritten text.
- DO NOT repeat slurs, hate speech, or banned words.
- You must NOT include the original profanity or slur.
- Be creative, spicy, and stay fully in character.
- Maximum 180 characters."

User input example:
original_message: "Man shut the hell up"

Example Output for this persona:
"I believe we are deviating from the optimal conversation parameters."

Input message to rewrite:
"${originalText}"
        `

        try {
            console.log('[AI] Sending request to Gemini...')
            const data: any = await $fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                body: { contents: [{ parts: [{ text: prompt }] }] }
            })

            console.log('[AI] Response received.')
            const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text

            if (!candidate) throw new Error('No candidate returned from AI model')

            return candidate.trim().replace(/^"|"$/g, '') // Remove quotes if added by AI

        } catch (error: any) {
            console.error('[AI] Generation Failed:', error.data || error)
            return getFallback()
        }
    }

    try {
        console.log('[Messages POST] Starting request processing...')

        const body = await readBody(event)

        if (!body.content || !body.sender) {
            throw new Error('Missing content or sender in body')
        }

        const senderName = body.sender
        // const client = await serverSupabaseClient(event) // THIS LINE IS NOW REDUNDANT

        // ------------------------------------------------------------------
        // 1. User Resolution (Moved EARLY to support AI attribution)
        // ------------------------------------------------------------------
        user = await serverSupabaseUser(event)

        // Auth Fallback
        if (!user) {
            const authHeader = getRequestHeader(event, 'Authorization')
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1]
                const { data } = await client.auth.getUser(token)
                if (data?.user) user = data.user
            }
        }

        let userId = null

        if (user) {
            const { data: publicUser } = await client.from('users').select('id').eq('supabase_user_id', user.id).single()
            if (publicUser) {
                userId = publicUser.id
            } else {
                // Link or Create Logic (Simplified for brevity, assuming standard flow)
                const serviceClient = serverSupabaseServiceRole(event)
                if (serviceClient) {
                    const { data: existing } = await serviceClient.from('users').select('id').eq('email', user.email).single()
                    if (existing) {
                        await serviceClient.from('users').update({ supabase_user_id: user.id }).eq('id', existing.id)
                        userId = existing.id
                    }
                }
                if (!userId) {
                    const { data: newPub } = await client.from('users').insert({
                        supabase_user_id: user.id,
                        name: 'Admin',
                        email: user.email,
                        is_admin: true
                    }).select().single()
                    userId = newPub?.id
                }
            }
        } else {
            // Guest Logic
            const timestamp = Date.now().toString().slice(-4)
            const sanitizedName = senderName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'guest'
            const cleanEmail = `guest_${sanitizedName}_${timestamp}@chronops.local`

            const { data: guestUser } = await client.from('users').select('id').eq('email', cleanEmail).single()
            if (guestUser) {
                userId = guestUser.id
            } else {
                // Try Service Role for Insert, Fallback to Client
                let serviceClient = null
                try { serviceClient = serverSupabaseServiceRole(event) } catch (e) { }

                const inserter = serviceClient || client
                const { data: newGuest } = await inserter.from('users').insert({
                    name: senderName,
                    email: cleanEmail,
                    supabase_user_id: null
                }).select().single()
                userId = newGuest?.id
            }
        }

        if (!userId) throw new Error('Failed to resolve User ID')


        // ------------------------------------------------------------------
        // 2. Moderation Check & AI Rewrite Interception
        // ------------------------------------------------------------------
        const ip = getRequestHeader(event, 'x-forwarded-for') || event.node.req.socket.remoteAddress || 'unknown'
        const userAgent = getRequestHeader(event, 'user-agent') || 'unknown'
        const { fingerprintKey } = buildFingerprint(ip, userAgent)
        const sessionId = getRequestHeader(event, 'x-session-id') || body.sessionId || 'unknown_session'

        // FETCH MODERATION SETTINGS (Unified)
        let aiEnabled = false
        let dynamicBadWords: string[] = []

        try {
            const serviceClient = serverSupabaseServiceRole(event)
            if (serviceClient) {
                const { data: modSettings, error: dbError } = await serviceClient
                    .from('moderation_settings')
                    .select('ai_persona_rewrite_enabled, bad_words')
                    .eq('room_id', 'global')
                    .single()

                if (dbError) console.error('[Messages POST] Mod Settings Fetch Error:', dbError)

                if (modSettings) {
                    aiEnabled = modSettings.ai_persona_rewrite_enabled
                    dynamicBadWords = modSettings.bad_words || []
                    console.log('[Messages POST] Settings Loaded | AI:', aiEnabled, '| Blocked Words:', dynamicBadWords.length)
                }
            }
        } catch (ignore) {
            console.error('[Messages POST] Mod Settings Exception:', ignore)
        }

        const modDecision = await handleIncomingMessage({
            sessionId,
            fingerprintKey,
            content: body.content,
            dynamicBlockedWords: dynamicBadWords
        })

        let finalContent = body.content
        let finalType = 'user'
        let finalPayload = {}

        if (modDecision.type === 'mute') {
            throw createError({
                statusCode: 429,
                message: modDecision.reason,
                data: { code: 'RATE_LIMITED', expires_at: modDecision.expiresAt }
            })
        } else if (modDecision.type === 'drop') {

            // AI CHECK IS ALREADY DONE ABOVE
            console.log(`[Messages POST] Drop Handling. Reason: "${modDecision.reason}" | AI Enabled: ${aiEnabled}`)

            if (aiEnabled && modDecision.reason === 'Content filter triggered') {
                console.log('[Messages POST] Blocked word detected. Rewriting via AI...')

                try {
                    const aiResult = await generatePersonaRewrite(body.content)
                    console.log('[Messages POST] AI Rewrite Result:', aiResult)

                    finalContent = aiResult // attribution is in sender name now
                    finalType = 'system'
                    finalPayload = {
                        subtype: 'persona_rewrite',
                        original_user_id: userId, // Metadata: Who said it
                        original_text_blocked: true
                    }
                    // Proceed to insertion (Do NOT throw)
                } catch (aiErr) {
                    // Fallback should already be handled in generatePersonaRewrite, but just in case
                    console.error('[Messages POST] AI Generation Failed (Outer):', aiErr)
                    finalContent = "I must respectfully disagree."
                    finalType = 'system'
                    finalPayload = { subtype: 'fallback_rewrite', original_user_id: userId }
                }
            } else {
                throw createError({
                    statusCode: 403,
                    message: "Message dropped.",
                    data: { code: 'CONTENT_BLOCKED', message: modDecision.reason }
                })
            }
        }


        // ------------------------------------------------------------------
        // 3. Final Context & Insertion
        // ------------------------------------------------------------------
        const { data: activeEvent } = await client.from('events').select('id').eq('is_active', true).single()
        const { data: settings } = await client.from('chat_settings').select('event_mode').single()
        const currentMode = settings?.event_mode || 'Live Event'

        const insertPayload = {
            room_id: null, // Legacy
            user_id: userId,
            content: finalContent,
            type: finalType, // New Column
            payload: finalPayload, // New Column
            event_id: activeEvent?.id || null,
            chat_mode: currentMode,
            history_is_visible: true
        }

        const { data, error } = await client.from('messages').insert(insertPayload).select().single()
        if (error) throw error

        console.log('[Messages POST] Success:', data.id)

        // Async Updates
        try {
            const serviceClient = serverSupabaseServiceRole(event)
            if (serviceClient) await serviceClient.from('users').update({ last_seen_at: new Date().toISOString() }).eq('id', userId)

            await client.from('app_events').insert({
                event_type: finalType === 'system' ? 'system_message_generated' : 'message_sent',
                user_id: userId,
                payload: {
                    message_id: data.id,
                    is_rewrite: finalType === 'system',
                    client_id: getRequestHeader(event, 'x-client-id')
                }
            })
        } catch (e) {
            console.error('[Messages POST] Async update/log failed:', e)
        }

        return {
            ...data,
            sender: finalType === 'system' ? `Ai Rewrite for ${senderName}` : senderName,
            isAdmin: !!user,
            type: finalType,
            content: finalContent
        }

    } catch (err: any) {
        console.error('[Messages POST] Error:', err.message)
        if (err.statusCode) throw createError(err)
        throw createError({ statusCode: 500, message: err.message })
    }
})


