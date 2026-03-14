import type { EnclosureConfig, StoredModel } from '../types/enclosure'
import { sanitizeConfig } from '../utils/sanitize'

interface FirestoreModelDocument {
  config: unknown
  updatedAt: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sanitizeUpdatedAt(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return Date.now()
  }

  return Math.round(parsed)
}

export function createModelDocument(config: EnclosureConfig): FirestoreModelDocument {
  return {
    config: sanitizeConfig(config, { allowPremium: true }),
    updatedAt: Date.now(),
  }
}

export function parseStoredModelDocument(id: string, value: unknown): StoredModel | null {
  const modelId = id.trim()
  if (!modelId || !isRecord(value)) {
    return null
  }

  const data = value as Partial<FirestoreModelDocument>

  return {
    id: modelId,
    config: sanitizeConfig(data.config, { allowPremium: true }),
    updatedAt: sanitizeUpdatedAt(data.updatedAt),
  }
}
