import { describe, expect, test } from 'vitest'
import { defaultModel } from '../app/defaultModel'
import { createModelDocument, parseStoredModelDocument } from './modelDocument'

describe('model document serialization', () => {
  test('sanitizes data before writing to firestore', () => {
    const document = createModelDocument({
      ...defaultModel,
      width: 999,
      premium: {
        advancedFastening: true,
        waterproofSeal: true,
      },
    })

    const parsed = parseStoredModelDocument('model-1', document)

    expect(parsed).not.toBeNull()
    expect(parsed?.config.width).toBe(240)
    expect(parsed?.config.premium.advancedFastening).toBe(true)
  })

  test('parses malformed firestore payloads into safe defaults', () => {
    const parsed = parseStoredModelDocument(' model-2 ', {
      config: {
        width: 'bad-number',
        holes: [{ face: 'front', radius: '5', x: 0, y: 0 }],
      },
      updatedAt: 'bad-timestamp',
    })

    expect(parsed).not.toBeNull()
    expect(parsed?.id).toBe('model-2')
    expect(parsed?.config.width).toBe(defaultModel.width)
    expect(parsed?.config.holes).toHaveLength(1)
    expect(parsed?.updatedAt).toBeGreaterThan(0)
  })

  test('rejects invalid document ids and shapes', () => {
    expect(parseStoredModelDocument('', {})).toBeNull()
    expect(parseStoredModelDocument('valid-id', null)).toBeNull()
  })
})
