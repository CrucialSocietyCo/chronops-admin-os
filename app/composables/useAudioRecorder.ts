
export const useAudioRecorder = () => {
    const isRecording = ref(false)
    const isUploading = ref(false)
    const isSent = ref(false)
    const timer = ref(0)
    const error = ref('')
    const debugStatus = ref('Idle') // Granular status for UI

    let mediaRecorder: MediaRecorder | null = null
    let audioChunks: Blob[] = []
    let timerInterval: any = null
    let startTime = 0

    const session = useSupabaseSession() // Auto-import from Nuxt Supabase

    const startRecording = async () => {
        try {
            debugStatus.value = 'Requesting Mic...'
            console.log('[useAudioRecorder] Requesting Microphone...')
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

            mediaRecorder = new MediaRecorder(stream)
            audioChunks = []

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data)
            }

            mediaRecorder.start()
            startTime = Date.now()
            isRecording.value = true
            isSent.value = false
            error.value = ''
            debugStatus.value = 'Recording...'

            timerInterval = setInterval(() => {
                const elapsed = (Date.now() - startTime) / 1000
                timer.value = Math.floor(elapsed)
                if (elapsed >= 5.0) {
                    stopRecording()
                }
            }, 100)

            console.log('[useAudioRecorder] Recording started')
        } catch (err: any) {
            console.error('[useAudioRecorder] Mic Error:', err)
            error.value = 'Mic Access Denied'
            debugStatus.value = 'Error: Mic Denied'
        }
    }

    const stopRecording = () => {
        return new Promise<void>((resolve) => {
            if (!mediaRecorder) return resolve()

            mediaRecorder.onstop = () => {
                clearInterval(timerInterval)
                isRecording.value = false
                timer.value = 0
                debugStatus.value = 'Stopped. Ready to Upload.'
                console.log('[useAudioRecorder] Recording stopped. Chunks:', audioChunks.length)
                resolve()

                // Automatically trigger upload (original behavior)
                uploadAudio()
            }

            mediaRecorder.stop()
            mediaRecorder.stream.getTracks().forEach(track => track.stop())
        })
    }

    const uploadAudio = async () => {
        const duration = (Date.now() - startTime) / 1000
        console.log('[useAudioRecorder] Duration:', duration)

        if (duration < 0.8) {
            error.value = 'Too short (< 0.8s)'
            debugStatus.value = 'Error: Too Short'
            return
        }

        isUploading.value = true
        debugStatus.value = 'Uploading to Storage...'

        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
        const formData = new FormData()
        formData.append('audio', audioBlob)

        try {
            // 1. Check Auth
            const token = session.value?.access_token
            if (!token) {
                throw new Error('No Auth Token (User not logged in)')
            }
            console.log('[useAudioRecorder] Auth Token present')

            // 2. Upload to Supabase Storage
            const supabase = useSupabaseClient()
            const filename = `admin_${Date.now()}_${crypto.randomUUID()}.webm`

            console.log('[useAudioRecorder] Uploading file:', filename)
            const { data: uploadData, error: storageError } = await supabase
                .storage
                .from('audio-drops')
                .upload(filename, audioBlob, {
                    contentType: 'audio/webm',
                    upsert: false
                })

            if (storageError) throw new Error('Storage Error: ' + storageError.message)
            console.log('[useAudioRecorder] Storage Upload Success')

            // 3. Get Public URL
            const { data: publicData } = supabase.storage.from('audio-drops').getPublicUrl(filename)
            const audioUrl = publicData.publicUrl
            console.log('[useAudioRecorder] Public URL:', audioUrl)

            // 4. Direct Database Insertion (Bypassing API)
            debugStatus.value = 'Saving to Database...'
            console.log('[useAudioRecorder] Starting Direct Insert...')

            // A. Get Active Event
            const { data: eventData, error: eventError } = await supabase
                .from('events')
                .select('id')
                .eq('is_active', true)
                .single()

            if (eventError && eventError.code !== 'PGRST116') { // Ignore "Row not found" (no active event)
                console.error('[useAudioRecorder] Event Fetch Error:', eventError)
                throw new Error('Failed to find active event')
            }
            const eventId = eventData?.id || null

            // B. Get User Profile (for Admin Name)
            const user = useSupabaseUser()
            if (!user.value) throw new Error('User not logged in')

            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('name')
                .eq('supabase_user_id', user.value.id)
                .single()

            const adminName = userData?.name || 'Admin'

            // C. Insert Message
            const payload = {
                subtype: "voice_drop",
                id: crypto.randomUUID(),
                audioUrl: audioUrl,
                durationMs: duration * 1000,
                createdAt: new Date().toISOString(),
                adminName: adminName
            }

            const { data: newMessage, error: insertError } = await supabase
                .from('messages')
                .insert({
                    content: '🎤 Voice Drop',
                    type: 'system', // Try 'system' first. If RLS fails, we might need 'user'
                    payload: payload,
                    user_id: null, // System message often has no user_id, or we could use session.value.user.id
                    event_id: eventId,
                    history_is_visible: true
                })
                .select()
                .single()

            if (insertError) {
                console.error('[useAudioRecorder] Insert Error:', insertError)
                throw new Error('DB Save Failed: ' + insertError.message)
            }

            console.log('[useAudioRecorder] Direct Insert Success! ID:', newMessage.id)

            // Success Handling
            debugStatus.value = 'Success!'
            isUploading.value = false
            isSent.value = true

            setTimeout(() => { isSent.value = false; debugStatus.value = 'Idle' }, 3000)

        } catch (err: any) {
            console.error('[useAudioRecorder] Upload Error:', err)
            error.value = err.message || 'Upload Failed'
            debugStatus.value = 'Error: ' + error.value
            isUploading.value = false
        }
    }

    return {
        isRecording,
        isUploading,
        isSent,
        timer,
        error,
        debugStatus,
        startRecording,
        stopRecording
    }
}
