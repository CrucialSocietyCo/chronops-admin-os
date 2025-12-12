
import { serverSupabaseServiceRole, serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import { v4 as uuidv4 } from 'uuid'

export default defineEventHandler(async (event) => {
    // Dynamic import to match working messages.get.ts
    const fs = await import('node:fs')
    const LOG_FILE = process.cwd() + '/server-debug.log'
    const log = (msg: string) => fs.appendFileSync(LOG_FILE, `[UploadAudio] ${new Date().toISOString()} ${msg}\n`)

    log('Request Received')
    try {
        // 1. Auth Check
        let user: any = await serverSupabaseUser(event)
        log(`Auth Check Complete. User ID: ${user?.id || 'None'}`)

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
            log('Error: Unauthorized (No User)')
            return { error: 'Unauthorized', code: 401 }
        }

        const client = serverSupabaseServiceRole(event)

        // Quick Admin verify (cached or simple query)
        let { data: userData } = await client.from('users').select('id, is_admin, name').eq('supabase_user_id', user.id).single()

        // SELF-HEALING: If user record missing, create it as Admin (since they are authenticated context)
        if (!userData) {
            log(`User record missing. Auto-creating Admin for: ${user.id}`)
            const { data: newUser, error: dbError } = await client.from('users').insert({
                supabase_user_id: user.id,
                email: user.email,
                name: 'Admin', // Default
                is_admin: true
            }).select().single()

            if (dbError) {
                console.error('[UploadAudio] Failed to auto-create admin:', dbError)
                throw createError({ statusCode: 500, message: 'Failed to initialize admin record' })
            }
            userData = newUser
        }

        if (!userData?.is_admin) {
            console.warn('[UploadAudio] 403 Forbidden - User is not admin:', userData?.id)
            throw createError({ statusCode: 403, message: 'Forbidden' })
        }

        log(`Admin Verified: ${userData.name}`)

        // 2. Handle Payload (JSON vs Multipart)
        const contentType = getRequestHeader(event, 'content-type') || ''
        let audioUrl = ''
        let durationMs = 0

        if (contentType.includes('application/json')) {
            // [Option B] Client Uploaded
            const body = await readBody(event)
            audioUrl = body.audioUrl
            if (!audioUrl) throw createError({ statusCode: 400, message: 'Missing audioUrl' })
            durationMs = body.durationMs || 0 // Capture duration

            // We don't have a filename here easily unless passed, but we can fake it or extract it
            var filename = audioUrl.split('/').pop() || 'uploaded_voice_drop.webm'

        } else {
            // [Option A] Server Upload
            const body = await readMultipartFormData(event)
            if (!body || body.length === 0) {
                throw createError({ statusCode: 400, message: 'No file uploaded' })
            }

            const audioFile = body.find(f => f.name === 'audio')
            if (!audioFile) {
                throw createError({ statusCode: 400, message: 'Missing audio field' })
            }

            // 3. Upload to Supabase Storage
            var filename = `${Date.now()}_${uuidv4()}.webm`

            const { data, error } = await client
                .storage
                .from('audio-drops')
                .upload(filename, audioFile.data, {
                    contentType: audioFile.type || 'audio/webm',
                    upsert: false
                })

            if (error) {
                console.error('Upload Error:', error)
                throw createError({ statusCode: 500, message: 'Storage upload failed' })
            }

            // 4. Get Public URL
            const { data: publicData } = client
                .storage
                .from('audio-drops')
                .getPublicUrl(filename)

            audioUrl = publicData.publicUrl
        }

        // 5. Broadcast (Insert System Message)
        log('Starting Broadcast/Insert...')
        const { data: activeEvent } = await client.from('events').select('id').eq('is_active', true).single()
        const eventId = activeEvent?.id || null

        // Payload for Voice Drop
        const payload = {
            subtype: "voice_drop",
            id: uuidv4(),
            audioUrl: audioUrl,
            durationMs: durationMs,
            createdAt: new Date().toISOString(),
            adminName: userData.name || 'Admin'
        }

        log(`Inserting Message: ${JSON.stringify(payload)}`)

        const { data: newMessage, error: insertError } = await client.from('messages').insert({
            content: '🎤 Voice Drop',
            type: 'system',
            payload: payload,
            user_id: userData.id,
            event_id: eventId,
            history_is_visible: true
        }).select().single()

        if (insertError) {
            log(`Insert Error: ${insertError.message}`)
            console.error('[UploadAudio] Insert Error:', insertError)
            throw createError({ statusCode: 500, message: insertError.message })
        }

        log(`Success! Message ID: ${newMessage.id}`)

        return {
            success: true,
            url: audioUrl,
            filename: filename,
            messageId: newMessage.id
        }
    } catch (err: any) {
        console.error('[UploadAudio] Handler Error:', err)
        return { error: err.message, stack: err.stack }
    }
})
