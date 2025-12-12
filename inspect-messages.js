
import { fetch } from 'ofetch'

async function inspectMessages() {
    console.log('Fetching ALL messages (no filter)...')
    try {
        // We know the API filters by event. Use the debug script to see what the API returns.
        // If the API returns nothing, we know the filter is the problem.
        const messages = await fetch('http://localhost:3000/api/messages?since=0').then(r => r.json())

        console.log(`API returned ${messages.length} messages.`)

        if (messages.length > 0) {
            messages.forEach(m => {
                console.log(`[${m.id}] Type: ${m.type} | Sender: ${m.sender} | Subtype: ${m.payload?.subtype || 'N/A'}`)
            })
        } else {
            console.log("No messages returned from API.")
        }

        // Test Upload to see what happens
        console.log("\nAttempting to upload a test audio drop...")
        const uploadRes = await fetch('http://localhost:3000/api/admin/upload-audio', {
            method: 'POST',
            body: {
                audioUrl: 'https://placehold.co/audio.mp3',
                durationMs: 1234
            },
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(r => r.json())

        console.log("Upload Response:", uploadRes)

    } catch (e) {
        console.error('Error:', e)
    }
}

inspectMessages()
