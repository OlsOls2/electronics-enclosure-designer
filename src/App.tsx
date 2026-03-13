import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import { defaultModel } from './app/defaultModel'
import { DesignerCanvas } from './components/DesignerCanvas'
import { ControlPanel } from './components/ControlPanel'
import { CloudPanel } from './components/CloudPanel'
import { BuyModal } from './components/BuyModal'
import { OrderSuccess } from './pages/OrderSuccess'
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
  
  const [buyModalOpen, setBuyModalOpen] = useState(false)
  const [currentRoute, setCurrentRoute] = useState(() => window.location.hash.slice(1) || 'home')

  const { enabled, loading: authLoading, user, signInWithGoogle, signOut } = useAuth()

  const applyConfig = useCallback((next: EnclosureConfig) => {
    setConfig(sanitizeConfig(next))
  }, [])

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(window.location.hash.slice(1) || 'home')
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const refreshModels = useCallback(async () => {
    if (!user) { setModels([]); return }
    setCloudError(null)
    setCloudLoading(true)
    try {
      setModels(await loadModels(user.uid))
    } catch (error) {
      setCloudError(error instanceof Error ? error.message : 'Failed to load cloud models.')
    } finally {
      setCloudLoading(false)
    }
  }, [user])

  useEffect(() => { void refreshModels() }, [refreshModels])

  const handleCloudSave = useCallback(async () => {
    if (!user) { setCloudError('Sign in to save models in the cloud.'); return }
    setCloudError(null)
    setCloudLoading(true)
    try {
      await saveModel(user.uid, config)
      setModels(await loadModels(user.uid))
    } catch (error) {
      setCloudError(error instanceof Error ? error.message : 'Failed to save model.')
    } finally {
      setCloudLoading(false)
    }
  }, [config, user])

  const handleDelete = useCallback(async (id: string) => {
    if (!user) return
    setCloudError(null)
    setCloudLoading(true)
    try {
      await removeModel(user.uid, id)
      setModels(await loadModels(user.uid))
    } catch (error) {
      setCloudError(error instanceof Error ? error.message : 'Failed to delete model.')
    } finally {
      setCloudLoading(false)
    }
  }, [user])

  const handleLoadModel = useCallback((id: string) => {
    const found = models.find((m) => m.id === id)
    if (found) applyConfig(found.config)
  }, [applyConfig, models])

  const statsLabel = useMemo(
    () => `${config.width} × ${config.height} × ${config.depth} mm · ${config.holes.length} hole${config.holes.length !== 1 ? 's' : ''}`,
    [config.depth, config.height, config.holes.length, config.width],
  )

  const cloudSlot = (
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
  )

  if (currentRoute === 'order-success') {
    return (
      <div className="app-root">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <OrderSuccess />
      </div>
    )
  }

  return (
    <div className="app-root">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="app-layout">
        <ControlPanel
          config={config}
          onChange={applyConfig}
          onExportStl={() => exportModelAsStl(config)}
          onBuy={() => setBuyModalOpen(true)}
          cloudSlot={cloudSlot}
        />

        <div className="viewport-column">
          <DesignerCanvas config={config} statsLabel={statsLabel} />
        </div>
      </div>

      {buyModalOpen && (
        <BuyModal config={config} onClose={() => setBuyModalOpen(false)} />
      )}
    </div>
  )
}

export default App
