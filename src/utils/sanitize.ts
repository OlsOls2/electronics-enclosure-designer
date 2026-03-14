import { defaultModel } from '../app/defaultModel'
import type { CircularHole, EnclosureConfig, Face } from '../types/enclosure'
import { clampHoleToFace } from './enclosureBounds'

const VALID_TYPES = new Set<EnclosureConfig['type']>(['plain', 'lid', 'flanged'])
const VALID_FACES = new Set<Face>(['front', 'back', 'left', 'right', 'top', 'bottom'])
const MAX_HOLES = 250
const MAX_NAME_LENGTH = 80
const MAX_HOLE_ID_LENGTH = 120

interface SanitizeOptions {
  allowPremium?: boolean
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toFiniteNumber(value: unknown, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function sanitizeName(name: unknown): string {
  if (typeof name !== 'string') {
    return defaultModel.name
  }

  const trimmed = name.trim().slice(0, MAX_NAME_LENGTH)
  return trimmed.length > 0 ? trimmed : defaultModel.name
}

function sanitizeHoleId(id: unknown, index: number): string {
  if (typeof id === 'string') {
    const trimmed = id.trim().slice(0, MAX_HOLE_ID_LENGTH)
    if (trimmed.length > 0) {
      return trimmed
    }
  }

  return `hole-${index + 1}`
}

function sanitizeHole(value: unknown, config: EnclosureConfig, index: number): CircularHole | null {
  if (!isRecord(value)) {
    return null
  }

  const faceValue = value.face
  if (typeof faceValue !== 'string' || !VALID_FACES.has(faceValue as Face)) {
    return null
  }

  return clampHoleToFace(
    {
      id: sanitizeHoleId(value.id, index),
      face: faceValue as Face,
      radius: toFiniteNumber(value.radius, 1),
      x: toFiniteNumber(value.x, 0),
      y: toFiniteNumber(value.y, 0),
    },
    config,
  )
}

export function sanitizeConfig(config: unknown, options: SanitizeOptions = {}): EnclosureConfig {
  const source = isRecord(config) ? config : {}

  const width = clamp(toFiniteNumber(source.width, defaultModel.width), 40, 240)
  const height = clamp(toFiniteNumber(source.height, defaultModel.height), 30, 180)
  const depth = clamp(toFiniteNumber(source.depth, defaultModel.depth), 40, 240)
  const wallMax = Math.max(1, Math.min(width, height, depth) / 3)
  const wallThickness = clamp(toFiniteNumber(source.wallThickness, defaultModel.wallThickness), 1, wallMax)

  const premiumInput = isRecord(source.premium) ? source.premium : {}
  const serviceInput = isRecord(source.services) ? source.services : {}
  const rawType = source.type

  const normalized: EnclosureConfig = {
    ...defaultModel,
    name: sanitizeName(source.name),
    type: typeof rawType === 'string' && VALID_TYPES.has(rawType as EnclosureConfig['type'])
      ? rawType as EnclosureConfig['type']
      : defaultModel.type,
    width,
    height,
    depth,
    wallThickness,
    holes: [],
    premium: options.allowPremium
      ? {
          advancedFastening: premiumInput.advancedFastening === true,
          waterproofSeal: premiumInput.waterproofSeal === true,
        }
      : { ...defaultModel.premium },
    services: {
      printing: serviceInput.printing === true,
      delivery: serviceInput.delivery === true,
    },
  }

  const rawHoles = Array.isArray(source.holes) ? source.holes : []
  normalized.holes = rawHoles
    .slice(0, MAX_HOLES)
    .map((hole, index) => sanitizeHole(hole, normalized, index))
    .filter((hole): hole is CircularHole => hole !== null)

  return normalized
}
