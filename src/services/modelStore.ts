import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore'
import { db } from './firebase'
import { createModelDocument, parseStoredModelDocument } from './modelDocument'
import type { EnclosureConfig, StoredModel } from '../types/enclosure'

function ensureDb() {
  if (!db) {
    throw new Error('Firebase is not configured. Add VITE_FIREBASE_* env vars to enable cloud save.')
  }
  return db
}

function ensurePathSegment(value: string, field: string): string {
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.includes('/')) {
    throw new Error(`${field} is invalid.`)
  }

  return trimmed
}

export async function saveModel(userId: string, config: EnclosureConfig): Promise<string> {
  const firestore = ensureDb()
  const safeUserId = ensurePathSegment(userId, 'User ID')
  const ref = await addDoc(collection(firestore, 'users', safeUserId, 'models'), createModelDocument(config))

  return ref.id
}

export async function loadModels(userId: string): Promise<StoredModel[]> {
  const firestore = ensureDb()
  const safeUserId = ensurePathSegment(userId, 'User ID')
  const modelQuery = query(
    collection(firestore, 'users', safeUserId, 'models'),
    orderBy('updatedAt', 'desc'),
  )
  const snapshot = await getDocs(modelQuery)

  return snapshot.docs
    .map((entry) => parseStoredModelDocument(entry.id, entry.data()))
    .filter((model): model is StoredModel => model !== null)
}

export async function removeModel(userId: string, modelId: string): Promise<void> {
  const firestore = ensureDb()
  const safeUserId = ensurePathSegment(userId, 'User ID')
  const safeModelId = ensurePathSegment(modelId, 'Model ID')
  await deleteDoc(doc(firestore, 'users', safeUserId, 'models', safeModelId))
}
