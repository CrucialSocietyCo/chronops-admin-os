const token = (value: unknown) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/_+/g, '_')
  .replace(/^_|_$/g, '')

const normalizeFromMap = (
  value: unknown,
  fallback: string,
  map: Record<string, string>
) => {
  const normalized = token(value)
  return map[normalized] || fallback
}

export const normalizeBorderStyle = (value: unknown) => normalizeFromMap(value, 'system95', {
  system95: 'system95',
  system_95: 'system95',
  hard_pixel: 'hard_pixel',
  hardpixel: 'hard_pixel',
  slate_shell: 'slate_shell',
  slateshell: 'slate_shell',
  vapor_mesh: 'vapor_mesh',
  vapormesh: 'vapor_mesh'
})

export const normalizeColorTheme = (value: unknown) => normalizeFromMap(value, 'teal_base', {
  teal_base: 'teal_base',
  tealbase: 'teal_base',
  graphite: 'graphite',
  noir_terminal: 'noir_terminal',
  noirterminal: 'noir_terminal',
  crt_glow: 'crt_glow',
  crtglow: 'crt_glow',
  plum: 'plum'
})

export const normalizeAdminBadge = (value: unknown) => normalizeFromMap(value, 'star_icon', {
  key_icon: 'key_icon',
  keyicon: 'key_icon',
  star_icon: 'star_icon',
  staricon: 'star_icon',
  system_icon: 'system_icon',
  systemicon: 'system_icon'
})

export const normalizeAestheticSettings = <T extends Record<string, any>>(settings: T): T => ({
  ...settings,
  window_border_style: normalizeBorderStyle(settings.window_border_style),
  color_theme: normalizeColorTheme(settings.color_theme),
  admin_badge_style: normalizeAdminBadge(settings.admin_badge_style)
})

export const withPublicAestheticAliases = <T extends Record<string, any>>(settings: T): T & {
  border_style: string
  admin_badge: string
} => {
  const normalized = normalizeAestheticSettings(settings)
  return {
    ...normalized,
    border_style: normalized.window_border_style,
    admin_badge: normalized.admin_badge_style
  }
}
