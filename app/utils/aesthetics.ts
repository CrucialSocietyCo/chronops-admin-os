export type AestheticOption = {
  value: string
  label: string
}

export const borderStyleOptions: AestheticOption[] = [
  { value: 'system95', label: 'System95' },
  { value: 'hard_pixel', label: 'Hard Pixel' },
  { value: 'slate_shell', label: 'SlateShell' },
  { value: 'vapor_mesh', label: 'VaporMesh' }
]

export const colorThemeOptions: AestheticOption[] = [
  { value: 'teal_base', label: 'Teal Base' },
  { value: 'graphite', label: 'Graphite' },
  { value: 'noir_terminal', label: 'Noir Terminal' },
  { value: 'crt_glow', label: 'CRT Glow' },
  { value: 'plum', label: 'Plum' },
  { value: 'dragon_fire_cult', label: 'Dragon Fire Cult' },
  { value: 'dragon-glass-court', label: 'Dragon Glass Court' }
]

export const adminBadgeOptions: AestheticOption[] = [
  { value: 'key_icon', label: 'Key Icon' },
  { value: 'star_icon', label: 'Star Icon' },
  { value: 'system_icon', label: 'System Icon' }
]

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
  plum: 'plum',
  dragon_fire_cult: 'dragon_fire_cult',
  dragonfirecult: 'dragon_fire_cult',
  dragon_glass_court: 'dragon-glass-court',
  dragonglasscourt: 'dragon-glass-court'
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

export const borderStyleClassName = (value: unknown) =>
  `border-style-${normalizeBorderStyle(value).replace(/_/g, '-')}`

export const colorThemeClassName = (value: unknown) =>
  `color-theme-${normalizeColorTheme(value).replace(/_/g, '-')}`

export const rootThemeClassName = (value: unknown) =>
  ({
    dragon_fire_cult: 'theme-dragon-fire-cult',
    'dragon-glass-court': 'theme-dragon-glass-court'
  })[normalizeColorTheme(value)] || ''

export const rootThemeClassNames = () => [
  'theme-dragon-fire-cult',
  'theme-dragon-glass-court'
]
