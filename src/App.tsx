import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import './App.css'
import { defaultModel } from './app/defaultModel'
import { BuyModal } from './components/BuyModal'
import { CloudPanel } from './components/CloudPanel'
import { ControlPanel } from './components/ControlPanel'
import { DesignerCanvas } from './components/DesignerCanvas'
import { useAccountTier } from './hooks/useAccountTier'
import { useAuth } from './hooks/useAuth'
import { OrderSuccess } from './pages/OrderSuccess'
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
  const [checkoutPreviewImage, setCheckoutPreviewImage] = useState<string | null>(null)
  const [capturePreview, setCapturePreview] = useState<(() => string | null) | null>(null)
  const [currentRoute, setCurrentRoute] = useState(() => window.location.hash.slice(1) || 'home')

  const { enabled, loading: authLoading, user, signInWithGoogle, signOut } = useAuth()
  const account = useAccountTier(user, enabled)
  const previewConfig = useDeferredValue(config)

  const applyConfig = useCallback(
    (next: EnclosureConfig) => {
      setConfig(sanitizeConfig(next, { allowPremium: account.isPaid }))
    },
    [account.isPaid],
  )

  useEffect(() => {
    setConfig((current) => sanitizeConfig(current, { allowPremium: account.isPaid }))
  }, [account.isPaid])

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(window.location.hash.slice(1) || 'home')
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

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
      await refreshModels()
    } catch (error) {
      setCloudError(error instanceof Error ? error.message : 'Failed to save model.')
      setCloudLoading(false)
    }
  }, [config, refreshModels, user])

  const handleDelete = useCallback(
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
        setCloudError(error instanceof Error ? error.message : 'Failed to delete model.')
        setCloudLoading(false)
      }
    },
    [refreshModels, user],
  )

  const handleLoadModel = useCallback(
    (id: string) => {
      const found = models.find((model) => model.id === id)
      if (found) {
        applyConfig(found.config)
      }
    },
    [applyConfig, models],
  )

  const handleSignIn = useCallback(async () => {
    try {
      setCloudError(null)
      await signInWithGoogle()
    } catch (error) {
      setCloudError(error instanceof Error ? error.message : 'Unable to sign in.')
    }
  }, [signInWithGoogle])

  const handleSignOut = useCallback(async () => {
    try {
      setCloudError(null)
      await signOut()
      setModels([])
    } catch (error) {
      setCloudError(error instanceof Error ? error.message : 'Unable to sign out.')
    }
  }, [signOut])

  const openCheckoutModal = useCallback(() => {
    const previewImage = capturePreview?.() ?? null
    setCheckoutPreviewImage(previewImage)
    setBuyModalOpen(true)
  }, [capturePreview])

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
      onSignIn={handleSignIn}
      onSignOut={handleSignOut}
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
          onBuy={openCheckoutModal}
          cloudSlot={cloudSlot}
          accountTier={account.tier}
          accountLoading={account.loading}
          accountError={account.error}
        />

        <div className="viewport-column">
          <DesignerCanvas
            config={previewConfig}
            statsLabel={statsLabel}
            onCaptureReady={setCapturePreview}
          />
        </div>
      </div>

      {buyModalOpen && (
        <BuyModal
          config={config}
          firebaseEnabled={enabled}
          isPaidAccount={account.isPaid}
          previewImageDataUrl={checkoutPreviewImage}
          onClose={() => setBuyModalOpen(false)}
        />
      )}
    </div>
  )
}

export default App
