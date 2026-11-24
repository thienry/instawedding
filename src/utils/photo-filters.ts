export type PhotoFilterId = 'none' | 'golden' | 'vintage' | 'bw' | 'vivid' | 'dramatic'

export type PhotoFrameId = 'none' | 'polaroid' | 'golden-border' | 'cinema' | 'minimal-floral'

export interface PhotoFilterOption {
  readonly id: PhotoFilterId
  readonly label: string
  readonly cssFilter: string
  readonly previewColor: string
}

export interface PhotoFrameOption {
  readonly id: PhotoFrameId
  readonly label: string
  readonly iconName?: string
}

export const PHOTO_FILTERS: readonly PhotoFilterOption[] = [
  {
    id: 'none',
    label: 'Normal',
    cssFilter: 'none',
    previewColor: '#e2e8f0',
  },
  {
    id: 'golden',
    label: 'Golden Hour',
    cssFilter: 'sepia(0.28) saturate(1.35) brightness(1.05) contrast(1.05)',
    previewColor: '#fef08a',
  },
  {
    id: 'vintage',
    label: 'Vintage 35mm',
    cssFilter: 'sepia(0.45) contrast(1.15) brightness(0.95) saturate(0.85)',
    previewColor: '#fed7aa',
  },
  {
    id: 'bw',
    label: 'P&B Elegante',
    cssFilter: 'grayscale(1) contrast(1.25) brightness(1.05)',
    previewColor: '#64748b',
  },
  {
    id: 'vivid',
    label: 'Vívido',
    cssFilter: 'saturate(1.45) contrast(1.1) brightness(1.02)',
    previewColor: '#fda4af',
  },
  {
    id: 'dramatic',
    label: 'Cinema Noir',
    cssFilter: 'contrast(1.35) brightness(0.92) saturate(0.7)',
    previewColor: '#334155',
  },
] as const

export const PHOTO_FRAMES: readonly PhotoFrameOption[] = [
  { id: 'none', label: 'Sem Moldura' },
  { id: 'polaroid', label: 'Polaroid Noivos' },
  { id: 'golden-border', label: 'Borda Dourada' },
  { id: 'cinema', label: 'Widescreen' },
  { id: 'minimal-floral', label: 'Elegância Noivos' },
] as const

export function getFilterById(id: PhotoFilterId): PhotoFilterOption {
  return PHOTO_FILTERS.find((f) => f.id === id) || PHOTO_FILTERS[0]
}
