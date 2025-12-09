import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function testUpdate() {
    console.log('Fetching existing settings...')
    const { data: existing, error: fetchError } = await supabase
        .from('chat_settings')
        .select('id')
        .single()

    if (fetchError) {
        console.error('Fetch Error:', fetchError)
        return
    }

    console.log('Existing ID:', existing.id)

    console.log('Attempting update...')
    const { data, error } = await supabase
        .from('chat_settings')
        .update({
            window_title: 'Updated Title ' + Date.now()
        })
        .eq('id', existing.id)
        .select()
        .single()

    console.log('Update Data:', data)
    console.log('Update Error:', error)
}

testUpdate()
