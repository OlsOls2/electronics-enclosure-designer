import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { defaultModel } from './app/defaultModel'
import { BuyModal } from './components/BuyModal'
import { CloudPanel } from './components/CloudPanel'
import { ControlPanel } from './components/ControlPanel'
import { DesignerCanvas } from './components/DesignerCanvas'
import { useAccountTier } from './hooks/useAccountTier'
import { useAuth } from './hooks/useAuth'
import { useCloudModels } from './hooks/useCloudModels'
import { OrderSuccess } from './pages/OrderSuccess'
import type { EnclosureConfig } from './types/enclosure'
import { getErrorMessage } from './utils/error'
import { exportModelAsStl } from './utils/exportStl'
import { sanitizeConfig } from './utils/sanitize'

function App() {
  const [config, setConfig] = useState<EnclosureConfig>(defaultModel)
  const [buyModalOpen, setBuyModalOpen] = useState(false)
  const [checkoutPreviewImage, setCheckoutPreviewImage] = useState<string | null>(null)
  const [capturePreview, setCapturePreview] = useState<(() => string | null) | null>(null)
  const [currentRoute, setCurrentRoute] = useState(() => window.location.hash.slice(1) || 'home')

  const { enabled, loading: authLoading, user, signInWithGoogle, signOut } = useAuth()
  const account = useAccountTier(user, enabled)
  const {
    models,
    cloudLoading,
    cloudError,
    setCloudError,
    clearModels,
    refreshModels,
    saveCurrentModel,
    deleteModel,
    loadModelById,
  } = useCloudModels(user)
  const effectiveConfig = useMemo(
    () => sanitizeConfig(config, { allowPremium: account.isPaid }),
    [account.isPaid, config],
  )
  const previewConfig = useDeferredValue(effectiveConfig)
  const configRef = useRef(effectiveConfig)

  useEffect(() => {
    configRef.current = effectiveConfig
  }, [effectiveConfig])

  const applyConfig = useCallback(
    (next: EnclosureConfig) => {
      setConfig(sanitizeConfig(next, { allowPremium: account.isPaid }))
    },
    [account.isPaid],
  )

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(window.location.hash.slice(1) || 'home')
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const handleCloudSave = useCallback(async () => {
    await saveCurrentModel(configRef.current)
  }, [saveCurrentModel])

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteModel(id)
    },
    [deleteModel],
  )

  const handleLoadModel = useCallback(
    (id: string) => {
      const modelConfig = loadModelById(id)
      if (modelConfig) {
        applyConfig(modelConfig)
      }
    },
    [applyConfig, loadModelById],
  )

  const handleSignIn = useCallback(async () => {
    try {
      setCloudError(null)
      await signInWithGoogle()
    } catch (error) {
      setCloudError(getErrorMessage(error, 'Unable to sign in.'))
    }
  }, [setCloudError, signInWithGoogle])

  const handleSignOut = useCallback(async () => {
    try {
      setCloudError(null)
      await signOut()
      clearModels()
    } catch (error) {
      setCloudError(getErrorMessage(error, 'Unable to sign out.'))
    }
  }, [clearModels, setCloudError, signOut])

  const handleCaptureReady = useCallback((capture: (() => string | null) | null) => {
    setCapturePreview(() => capture)
  }, [])

  const openCheckoutModal = useCallback(() => {
    let previewImage: string | null = null

    try {
      previewImage = capturePreview?.() ?? null
    } catch {
      previewImage = null
    }

    setCheckoutPreviewImage(previewImage)
    setBuyModalOpen(true)
  }, [capturePreview])

  const handleExportStl = useCallback(() => {
    exportModelAsStl(effectiveConfig)
  }, [effectiveConfig])

  const statsLabel = useMemo(
    () => `${effectiveConfig.width} × ${effectiveConfig.height} × ${effectiveConfig.depth} mm · ${effectiveConfig.holes.length} hole${effectiveConfig.holes.length !== 1 ? 's' : ''}`,
    [effectiveConfig.depth, effectiveConfig.height, effectiveConfig.holes.length, effectiveConfig.width],
  )

  const cloudSlot = useMemo(
    () => (
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
    ),
    [
      authLoading,
      cloudError,
      cloudLoading,
      enabled,
      handleCloudSave,
      handleDelete,
      handleLoadModel,
      handleSignIn,
      handleSignOut,
      models,
      refreshModels,
      user,
    ],
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
          config={effectiveConfig}
          onChange={applyConfig}
          onExportStl={handleExportStl}
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
            onCaptureReady={handleCaptureReady}
          />
        </div>
      </div>

      {buyModalOpen && (
        <BuyModal
          config={effectiveConfig}
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
