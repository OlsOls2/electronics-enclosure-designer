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
import type { EnclosureConfig, StoredModel } from '../types/enclosure'

interface ModelDocument {
  config: EnclosureConfig
  updatedAt: number
}

function ensureDb() {
  if (!db) {
    throw new Error('Firebase is not configured. Add VITE_FIREBASE_* env vars to enable cloud save.')
  }
  return db
}

export async function saveModel(userId: string, config: EnclosureConfig): Promise<string> {
  const firestore = ensureDb()
  const ref = await addDoc(collection(firestore, 'users', userId, 'models'), {
    config,
    updatedAt: Date.now(),
  } satisfies ModelDocument)

  return ref.id
}

export async function loadModels(userId: string): Promise<StoredModel[]> {
  const firestore = ensureDb()
  const modelQuery = query(
    collection(firestore, 'users', userId, 'models'),
    orderBy('updatedAt', 'desc'),
  )
  const snapshot = await getDocs(modelQuery)

  return snapshot.docs.map((entry) => {
    const data = entry.data() as ModelDocument
    return {
      id: entry.id,
      config: data.config,
      updatedAt: data.updatedAt,
    }
  })
}

export async function removeModel(userId: string, modelId: string): Promise<void> {
  const firestore = ensureDb()
  await deleteDoc(doc(firestore, 'users', userId, 'models', modelId))
}
