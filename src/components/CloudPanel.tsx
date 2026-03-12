import type { User } from 'firebase/auth'
import type { StoredModel } from '../types/enclosure'

interface CloudPanelProps {
  enabled: boolean
  user: User | null
  authLoading: boolean
  models: StoredModel[]
  cloudLoading: boolean
  cloudError: string | null
  onSignIn: () => Promise<void>
  onSignOut: () => Promise<void>
  onSave: () => Promise<void>
  onLoad: (id: string) => void
  onDelete: (id: string) => Promise<void>
  onRefresh: () => Promise<void>
}

export function CloudPanel({
  enabled,
  user,
  authLoading,
  models,
  cloudLoading,
  cloudError,
  onSignIn,
  onSignOut,
  onSave,
  onLoad,
  onDelete,
  onRefresh,
}: CloudPanelProps) {
  return (
    <section className="panel-section cloud-panel">
      <h2>Cloud Save / Load</h2>

      {!enabled && (
        <p className="hint">
          Firebase is not configured. Continue without account, or add env values to enable sign-in +
          cloud model storage.
        </p>
      )}

      {enabled && authLoading && <p className="hint">Checking auth status…</p>}

      {enabled && !authLoading && !user && (
        <button className="primary" onClick={onSignIn}>
          Sign in with Google
        </button>
      )}

      {enabled && user && (
        <>
          <div className="cloud-actions">
            <p className="hint">Signed in as {user.email ?? user.uid}</p>
            <button onClick={onSignOut}>Sign out</button>
          </div>

          <div className="cloud-actions">
            <button className="primary" onClick={onSave} disabled={cloudLoading}>
              {cloudLoading ? 'Saving…' : 'Save current model'}
            </button>
            <button onClick={onRefresh} disabled={cloudLoading}>
              Refresh
            </button>
          </div>

          <ul className="saved-model-list">
            {models.length === 0 && <li>No saved cloud models yet.</li>}
            {models.map((model) => (
              <li key={model.id}>
                <div>
                  <strong>{model.config.name || 'Untitled model'}</strong>
                  <p>{new Date(model.updatedAt).toLocaleString()}</p>
                </div>
                <div className="row-actions">
                  <button onClick={() => onLoad(model.id)}>Load</button>
                  <button className="ghost" onClick={() => onDelete(model.id)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {cloudError && <p className="error">{cloudError}</p>}
    </section>
  )
}
