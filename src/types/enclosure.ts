export type EnclosureType = 'plain' | 'lid' | 'flanged'

export type Face = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom'

export interface CircularHole {
  id: string
  face: Face
  x: number
  y: number
  radius: number
}

export interface PremiumOptions {
  advancedFastening: boolean
  waterproofSeal: boolean
}

export interface PaidServices {
  printing: boolean
  delivery: boolean
}

export interface EnclosureConfig {
  name: string
  type: EnclosureType
  width: number
  height: number
  depth: number
  wallThickness: number
  holes: CircularHole[]
  premium: PremiumOptions
  services: PaidServices
}

export interface StoredModel {
  id: string
  config: EnclosureConfig
  updatedAt: number
}
