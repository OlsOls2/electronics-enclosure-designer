import type { EnclosureConfig } from '../types/enclosure'

export const defaultModel: EnclosureConfig = {
  name: 'My Enclosure',
  type: 'plain',
  width: 120,
  height: 70,
  depth: 90,
  wallThickness: 3,
  holes: [],
  premium: {
    advancedFastening: false,
    waterproofSeal: false,
  },
  services: {
    printing: false,
    delivery: false,
  },
}
