import { serverSupabaseServiceRole } from '#supabase/server'

const MODE_PRE_SHOW = 'Pre-Show'
const MODE_LIVE_EVENT = 'Live Event'
const MODE_AFTERPARTY = 'Afterparty'

type ChatSettings = Record<string, any> | null

const parseScheduleTime = (value: unknown) => {
  if (!value || typeof value !== 'string') return null

  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

export const evaluateScheduledMode = (settings: ChatSettings, now = new Date()) => {
  const currentMode = settings?.event_mode || MODE_LIVE_EVENT

  if (!settings?.is_scheduling_enabled || !settings?.auto_mode_transition_enabled) {
    return {
      mode: currentMode,
      shouldUpdate: false,
      reason: 'scheduling_disabled'
    }
  }

  const nowMs = now.getTime()
  const phases = [
    { field: 'afterparty_time', mode: MODE_AFTERPARTY },
    { field: 'live_event_time', mode: MODE_LIVE_EVENT },
    { field: 'pre_show_time', mode: MODE_PRE_SHOW }
  ]

  for (const phase of phases) {
    const phaseStart = parseScheduleTime(settings[phase.field])
    if (phaseStart !== null && nowMs >= phaseStart) {
      return {
        mode: phase.mode,
        shouldUpdate: phase.mode !== currentMode,
        reason: phase.field
      }
    }
  }

  return {
    mode: currentMode,
    shouldUpdate: false,
    reason: 'before_first_scheduled_phase'
  }
}

export const applyScheduledEventMode = async (event: any) => {
  let client

  try {
    client = serverSupabaseServiceRole(event)
  } catch (error: any) {
    console.warn('[Schedule] Service role unavailable; skipping scheduled mode evaluation.', error?.message || error)
    return null
  }

  const { data: settings, error: fetchError } = await client
    .from('chat_settings')
    .select('*')
    .single()

  if (fetchError) {
    console.error('[Schedule] Failed to fetch chat settings:', fetchError)
    return null
  }

  const evaluation = evaluateScheduledMode(settings)

  if (!evaluation.shouldUpdate) {
    return settings
  }

  const { data: updatedSettings, error: updateError } = await client
    .from('chat_settings')
    .update({ event_mode: evaluation.mode })
    .eq('id', settings.id)
    .select()
    .single()

  if (updateError) {
    console.error('[Schedule] Failed to update scheduled event mode:', updateError)
    return settings
  }

  console.log(`[Schedule] Event mode changed from "${settings.event_mode}" to "${evaluation.mode}" via ${evaluation.reason}.`)

  return updatedSettings
}
