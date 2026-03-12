import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import { defaultModel } from './app/defaultModel'
import { DesignerCanvas } from './components/DesignerCanvas'
import { ControlPanel } from './components/ControlPanel'
import { CloudPanel } from './components/CloudPanel'
import { useAuth } from './hooks/useAuth'
import { loadModels, removeModel, saveModel } from './services/modelStore'
import type { EnclosureConfig, StoredModel } from './types/enclosure'
import { exportModelAsStl } from './utils/exportStl'
import { sanitizeConfig } from './utils/sanitize'

function App() {
  const [config, setConfig] = useState<EnclosureConfig>(defaultModel)
  const [models, setModels] = useState<StoredModel[]>([])
  const [cloudLoading, setCloudLoading] = useState(false)
  const [cloudError, setCloudError] = useState<string | null>(null)

  const { enabled, loading: authLoading, user, signInWithGoogle, signOut } = useAuth()

  const applyConfig = useCallback((next: EnclosureConfig) => {
    setConfig(sanitizeConfig(next))
  }, [])

  const refreshModels = useCallback(async () => {
    if (!user) {
      setModels([])
      return
    }

    setCloudError(null)
    setCloudLoading(true)
    try {
      const nextModels = await loadModels(user.uid)
      setModels(nextModels)
    } catch (error) {
      setCloudError(error instanceof Error ? error.message : 'Failed to load cloud models.')
    } finally {
      setCloudLoading(false)
    }
  }, [user])

  useEffect(() => {
    void refreshModels()
  }, [refreshModels])

  const handleCloudSave = useCallback(async () => {
    if (!user) {
      setCloudError('Sign in to save models in the cloud.')
      return
    }

    setCloudError(null)
    setCloudLoading(true)
    try {
      await saveModel(user.uid, config)
      const nextModels = await loadModels(user.uid)
      setModels(nextModels)
    } catch (error) {
      setCloudError(error instanceof Error ? error.message : 'Failed to save model.')
    } finally {
      setCloudLoading(false)
    }
  }, [config, user])

  const handleDelete = useCallback(
    async (id: string) => {
      if (!user) {
        return
      }

      setCloudError(null)
      setCloudLoading(true)
      try {
        await removeModel(user.uid, id)
        const nextModels = await loadModels(user.uid)
        setModels(nextModels)
      } catch (error) {
        setCloudError(error instanceof Error ? error.message : 'Failed to delete model.')
      } finally {
        setCloudLoading(false)
      }
    },
    [user],
  )

  const handleLoadModel = useCallback(
    (id: string) => {
      const found = models.find((entry) => entry.id === id)
      if (!found) {
        return
      }
      applyConfig(found.config)
    },
    [applyConfig, models],
  )

  const modelStats = useMemo(
    () => `${config.width}×${config.height}×${config.depth} mm • ${config.holes.length} holes`,
    [config.depth, config.height, config.holes.length, config.width],
  )

  return (
    <div className="app-layout">
      <ControlPanel config={config} onChange={applyConfig} onExportStl={() => exportModelAsStl(config)} />

      <main className="viewport-column">
        <header>
          <h2>Live 3D Preview</h2>
          <p>{modelStats}</p>
        </header>

        <DesignerCanvas config={config} />

        <CloudPanel
          enabled={enabled}
          user={user}
          authLoading={authLoading}
          models={models}
          cloudLoading={cloudLoading}
          cloudError={cloudError}
          onSignIn={signInWithGoogle}
          onSignOut={signOut}
          onSave={handleCloudSave}
          onLoad={handleLoadModel}
          onDelete={handleDelete}
          onRefresh={refreshModels}
        />
      </main>
    </div>
  )
}

export default App
