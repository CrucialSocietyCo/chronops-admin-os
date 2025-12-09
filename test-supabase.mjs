import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

console.log('URL:', supabaseUrl)
console.log('Key:', supabaseKey ? 'Found' : 'Missing')

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
    console.log('Fetching chat_settings...')
    const { data, error } = await supabase
        .from('chat_settings')
        .select('*')
        .single()

    console.log('Data:', data)
    console.log('Error:', error)
}

test()
