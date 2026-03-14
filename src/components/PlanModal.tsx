import { X } from 'lucide-react'
import type { AccountTier } from '../types/account'

interface PlanModalProps {
  accountTier: AccountTier
  onClose: () => void
}

export function PlanModal({ accountTier, onClose }: PlanModalProps) {
  const subtitle = accountTier === 'guest'
    ? 'Sign in and upgrade to unlock premium design controls.'
    : 'Upgrade your account to unlock premium design controls.'

  return (
    <div className="modal-overlay">
      <div className="modal-card plan-modal-card">
        <header className="modal-header plan-modal-header">
          <h2>Choose a plan</h2>
          <button className="ghost close-btn" type="button" onClick={onClose}>
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        <div className="modal-body">
          <p className="plan-modal-subtitle">{subtitle}</p>

          <div className="plan-grid">
            <article className="plan-card">
              <h3>Free</h3>
              <p className="plan-price">£0</p>
              <ul>
                <li>Core enclosure builder</li>
                <li>Face holes + STL export</li>
                <li>Cloud save (signed-in users)</li>
              </ul>
            </article>

            <article className="plan-card featured">
              <h3>Premium</h3>
              <p className="plan-price">£9/mo</p>
              <ul>
                <li>Advanced fastening features</li>
                <li>Waterproof seal controls</li>
                <li>Future premium geometry tools</li>
              </ul>
            </article>
          </div>
        </div>

        <footer className="modal-footer">
          <button className="secondary" type="button" onClick={onClose}>Maybe later</button>
          <button className="primary" type="button" onClick={onClose}>Upgrade</button>
        </footer>
      </div>
    </div>
  )
}
