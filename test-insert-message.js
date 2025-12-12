
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

// Load environment variables from parent .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
    process.exit(1)
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function listLastMessages() {
    console.log('Listing last 5 messages...')
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

    if (error) {
        console.error('Select Error:', error)
    } else {
        console.log('Recent Messages:')
        data.forEach(m => {
            console.log(`[${m.id}] Type: ${m.type} | Content: ${m.content.substring(0, 50)}... | Payload:`, JSON.stringify(m.payload))
        })
    }
}

async function insertTestMessage() {
    console.log('Inserting a test message...')

    // Get active event
    const { data: event } = await supabase.from('events').select('id').eq('is_active', true).single()
    const validEventId = event?.id || null
    console.log('Active Event ID:', validEventId)

    const { data, error } = await supabase.from('messages').insert({
        content: '🤖 AUTOMATED TEST MESSAGE ' + new Date().toLocaleTimeString(),
        // sender: 'System Test',
        type: 'text',
        user_id: null,
        event_id: validEventId,
        history_is_visible: true,
        payload: { subtype: 'test_message' }
    }).select().single()

    if (error) {
        console.error('Insert Error:', error)
    } else {
        console.log('Test message inserted:', data)
    }
}

async function inspectColumns() {
    console.log('Inspecting messages table columns...')
    const { data, error } = await supabase.from('messages').select('*').limit(1)
    if (error) {
        console.error('Select Error:', error)
    } else if (data.length > 0) {
        console.log('Columns Found:', Object.keys(data[0]))
    } else {
        console.log('Table is empty, cannot infer columns from data.')
    }
}

listLastMessages()
insertTestMessage()
