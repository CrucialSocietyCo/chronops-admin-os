
import { fetch } from 'ofetch'

async function checkState() {
    console.log('Checking Server State...')
    try {
        const state = await fetch('http://localhost:3000/api/debug/state').then(r => r.json())
        console.log('Active Events:', state.activeEvents)
        console.log('Last 5 Messages:')
        state.lastMessages.forEach(m => {
            console.log(`[${m.id}] EventID: ${m.event_id} | Type: ${m.type} | Payload: ${JSON.stringify(m.payload)}`)
        })
    } catch (e) {
        console.log("Error:", e)
    }
}
checkState()
