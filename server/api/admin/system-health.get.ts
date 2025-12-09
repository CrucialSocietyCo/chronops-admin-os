import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event)
    const startTime = Date.now()

    // Check Database Connection
    const { data, error } = await client.from('system_logs').select('count', { count: 'exact', head: true })

    const dbLatency = Date.now() - startTime
    const dbStatus = error ? 'Error' : 'Connected'

    // Mock Server Stats (since we are serverless/edge, we simulate these for the retro UI)
    const cpuUsage = Math.floor(Math.random() * 30) + 10 // 10-40%
    const memoryUsage = Math.floor(Math.random() * 40) + 20 // 20-60%
    const uptime = process.uptime()

    return {
        database: {
            status: dbStatus,
            latency: dbLatency + 'ms',
            error: error?.message
        },
        server: {
            cpu: cpuUsage,
            memory: memoryUsage,
            uptime: formatUptime(uptime),
            nodeVersion: process.version,
            platform: process.platform
        }
    }
})

function formatUptime(seconds: number) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);

    const dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
    const hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
    const mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
    const sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
    return dDisplay + hDisplay + mDisplay + sDisplay;
}
