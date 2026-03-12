import type { EnclosureConfig } from '../types/enclosure'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function sanitizeConfig(config: EnclosureConfig): EnclosureConfig {
  const width = clamp(Number.isFinite(config.width) ? config.width : 120, 40, 240)
  const height = clamp(Number.isFinite(config.height) ? config.height : 70, 30, 180)
  const depth = clamp(Number.isFinite(config.depth) ? config.depth : 90, 40, 240)
  const wallMax = Math.max(1, Math.min(width, height, depth) / 3)
  const wallThickness = clamp(
    Number.isFinite(config.wallThickness) ? config.wallThickness : 3,
    1,
    wallMax,
  )

  return {
    ...config,
    width,
    height,
    depth,
    wallThickness,
  }
}
