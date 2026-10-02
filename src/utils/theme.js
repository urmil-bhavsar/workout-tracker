export const themePalettes = [
  { id: 'default', label: 'Default', swatches: ['#d7ff57', '#111311'] },
  { id: 'journal', label: 'Training Journal', swatches: ['#b64d35', '#f2ecdf'] },
  { id: 'trackside', label: 'Trackside', swatches: ['#d94d36', '#287b67'] },
  { id: 'strength-lab', label: 'Strength Lab', swatches: ['#355baf', '#a96632'] },
]

export function getInitialAppearance() {
  return localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
}

export function getInitialPalette() {
  const savedPalette = localStorage.getItem('palette')
  return themePalettes.some((palette) => palette.id === savedPalette) ? savedPalette : 'default'
}

export function applyTheme(appearance, palette, persist = true) {
  const root = document.documentElement
  root.dataset.theme = appearance
  root.dataset.palette = palette
  if (persist) {
    localStorage.setItem('theme', appearance)
    localStorage.setItem('palette', palette)
  }
  const background = getComputedStyle(root).getPropertyValue('--bg').trim()
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background)
}
