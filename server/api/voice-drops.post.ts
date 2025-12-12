import { serverSupabaseServiceRole, serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import { v4 as uuidv4 } from 'uuid'

export default defineEventHandler(async (event) => {
    // 1. Auth Check
    let user: any = await serverSupabaseUser(event)

    // Fallback: Check Header
    if (!user) {
        const authHeader = getRequestHeader(event, 'Authorization')
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1]
            const client = await serverSupabaseClient(event)
            const { data } = await client.auth.getUser(token)
            if (data?.user) user = data.user
        }
    }

    if (!user) {
        throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    const client = serverSupabaseServiceRole(event)

    // Quick Admin verify
    const { data: userData } = await client.from('users').select('id, is_admin, name').eq('supabase_user_id', user.id).single()
    if (!userData?.is_admin) {
        throw createError({ statusCode: 403, message: 'Forbidden' })
    }

    // 2. Handle Payload (JSON vs Multipart)
    const contentType = getRequestHeader(event, 'content-type') || ''
    let audioUrl = ''
    let durationMs = 0

    if (contentType.includes('application/json')) {
        // [Option B] Client uploaded file, just broadcasting
        const body = await readBody(event)
        audioUrl = body.audioUrl
        durationMs = body.durationMs || 0 // Note: Variable name consistency

        if (!audioUrl) throw createError({ statusCode: 400, message: 'Missing audioUrl' })

    } else {
        // [Option A] Server Upload
        const body = await readMultipartFormData(event)
        if (!body || body.length === 0) {
            throw createError({ statusCode: 400, message: 'No file uploaded' })
        }

        const audioFile = body.find(f => f.name === 'audio')
        const durationField = body.find(f => f.name === 'duration') // frontend sends 'duration' here

        if (!audioFile) {
            throw createError({ statusCode: 400, message: 'Missing audio field' })
        }

        const durationVal = durationField ? parseInt(durationField.data.toString()) : 0
        durationMs = durationVal

        // 3. Upload to Supabase Storage ('audio-drops' bucket)
        const filename = `${Date.now()}_${uuidv4()}.webm`

        const { error: uploadError } = await client
            .storage
            .from('audio-drops')
            .upload(filename, audioFile.data, {
                contentType: audioFile.type || 'audio/webm',
                upsert: false
            })

        if (uploadError) {
            console.error('Upload Error:', uploadError)
            throw createError({ statusCode: 500, message: 'Storage upload failed' })
        }

        // 4. Get Public URL
        const { data: publicData } = client
            .storage
            .from('audio-drops')
            .getPublicUrl(filename)

        audioUrl = publicData.publicUrl
    }

    // 5. Insert Message (which broadcasts via Realtime)

    // 5. Insert Message (which broadcasts via Realtime)
    // Structure matches 'Supreme' spec payload requirements where possible

    // Resolve Active Event
    const { data: activeEvent } = await client.from('events').select('id').eq('is_active', true).single()
    const eventId = activeEvent?.id || null

    const payload = {
        subtype: "voice_drop", // Keeping consistent with previous 'audio_drop' but matching new spec intent
        id: uuidv4(), // Client might want a specific ID, but DB generates one. We'll use DB's.
        audioUrl: audioUrl,
        durationMs: durationMs,
        createdAt: new Date().toISOString(),
        adminName: userData.name || 'Admin'
    }

    const { data: newMessage, error: insertError } = await client.from('messages').insert({
        content: '🎤 Voice Drop',
        sender: userData.name || 'Admin',
        type: 'system',
        payload: payload,
        user_id: userData.id,
        event_id: eventId,
        history_is_visible: true
    }).select().single()

    if (insertError) {
        console.error('Insert Error:', insertError)
        throw createError({ statusCode: 500, message: insertError.message })
    }

    return {
        success: true,
        message: newMessage,
        details: payload
    }
})
