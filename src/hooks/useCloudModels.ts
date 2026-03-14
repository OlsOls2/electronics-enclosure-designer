import { useCallback, useEffect, useMemo, useState } from 'react'
import type { User } from 'firebase/auth'
import { loadModels, removeModel, saveModel } from '../services/modelStore'
import type { EnclosureConfig, StoredModel } from '../types/enclosure'
import { getErrorMessage } from '../utils/error'

interface UseCloudModelsResult {
  models: StoredModel[]
  cloudLoading: boolean
  cloudError: string | null
  setCloudError: (error: string | null) => void
  clearModels: () => void
  refreshModels: () => Promise<void>
  saveCurrentModel: (config: EnclosureConfig) => Promise<void>
  deleteModel: (id: string) => Promise<void>
  loadModelById: (id: string) => EnclosureConfig | null
}

export function useCloudModels(user: User | null): UseCloudModelsResult {
  const [models, setModels] = useState<StoredModel[]>([])
  const [cloudLoading, setCloudLoading] = useState(false)
  const [cloudError, setCloudError] = useState<string | null>(null)

  const modelConfigById = useMemo(() => {
    return new Map(models.map((model) => [model.id, model.config]))
  }, [models])

  const refreshModels = useCallback(async () => {
    if (!user) {
      setModels([])
      return
    }

    setCloudError(null)
    setCloudLoading(true)

    try {
      setModels(await loadModels(user.uid))
    } catch (error) {
      setCloudError(getErrorMessage(error, 'Failed to load cloud models.'))
    } finally {
      setCloudLoading(false)
    }
  }, [user])

  useEffect(() => {
    void refreshModels()
  }, [refreshModels])

  const saveCurrentModel = useCallback(
    async (config: EnclosureConfig) => {
      if (!user) {
        setCloudError('Sign in to save models in the cloud.')
        return
      }

      setCloudError(null)
      setCloudLoading(true)

      try {
        await saveModel(user.uid, config)
        await refreshModels()
      } catch (error) {
        setCloudError(getErrorMessage(error, 'Failed to save model.'))
        setCloudLoading(false)
      }
    },
    [refreshModels, user],
  )

  const deleteModel = useCallback(
    async (id: string) => {
      if (!user) {
        return
      }

      setCloudError(null)
      setCloudLoading(true)

      try {
        await removeModel(user.uid, id)
        await refreshModels()
      } catch (error) {
        setCloudError(getErrorMessage(error, 'Failed to delete model.'))
        setCloudLoading(false)
      }
    },
    [refreshModels, user],
  )

  const loadModelById = useCallback(
    (id: string) => {
      return modelConfigById.get(id) ?? null
    },
    [modelConfigById],
  )

  const clearModels = useCallback(() => {
    setModels([])
  }, [])

  return {
    models,
    cloudLoading,
    cloudError,
    setCloudError,
    clearModels,
    refreshModels,
    saveCurrentModel,
    deleteModel,
    loadModelById,
  }
}
