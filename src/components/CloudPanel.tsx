import { useState } from 'react'
import { Cloud, ChevronDown, RefreshCw } from 'lucide-react'
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
  const [open, setOpen] = useState(false)

  return (
    <div className="cloud-accordion">
      <button className="cloud-toggle" type="button" onClick={() => setOpen((o) => !o)}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Cloud size={13} strokeWidth={2} />
          Cloud save
        </span>
        <ChevronDown size={13} strokeWidth={2.5} style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', color: '#d1d5db' }} />
      </button>

      {open && (
        <div className="cloud-body">
          {!enabled && (
            <p className="cloud-hint">
              Firebase not configured — cloud save is disabled. Add env vars to enable.
            </p>
          )}

          {enabled && authLoading && <p className="cloud-hint">Checking auth…</p>}

          {enabled && !authLoading && !user && (
            <button className="primary" type="button" style={{ width: '100%' }} onClick={onSignIn}>
              Sign in with Google
            </button>
          )}

          {enabled && user && (
            <>
              <div className="cloud-actions" style={{ marginTop: '0.5rem' }}>
                <span className="cloud-user">{user.email ?? user.uid}</span>
                <button className="secondary" type="button" style={{ marginLeft: 'auto' }} onClick={onSignOut}>
                  Sign out
                </button>
              </div>

              <div className="cloud-actions">
                <button className="primary" type="button" onClick={onSave} disabled={cloudLoading} style={{ flex: 1 }}>
                  {cloudLoading ? 'Saving…' : 'Save design'}
                </button>
                <button type="button" onClick={onRefresh} disabled={cloudLoading}>
                  <RefreshCw size={13} strokeWidth={2} />
                </button>
              </div>

              <ul className="saved-model-list">
                {models.length === 0 && (
                  <li style={{ border: 'none', background: 'none', padding: '0.2rem 0' }}>
                    <span style={{ color: '#9ca3af', fontSize: '0.78rem' }}>No saved designs yet.</span>
                  </li>
                )}
                {models.map((model) => (
                  <li key={model.id}>
                    <div>
                      <strong>{model.config.name || 'Untitled'}</strong>
                      <p>{new Date(model.updatedAt).toLocaleString()}</p>
                    </div>
                    <div className="row-actions">
                      <button type="button" onClick={() => onLoad(model.id)}>Load</button>
                      <button type="button" className="ghost" onClick={() => onDelete(model.id)}>
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {cloudError && <p className="error">{cloudError}</p>}
        </div>
      )}
    </div>
  )
}
