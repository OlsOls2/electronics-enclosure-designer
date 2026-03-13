import { useState, useMemo } from 'react'
import { X, Minus, Plus, ShoppingCart, Loader2 } from 'lucide-react'
import type { EnclosureConfig } from '../types/enclosure'
import { createCheckoutSession } from '../services/stripeService'
import { useAuth } from '../hooks/useAuth'

interface BuyModalProps {
  config: EnclosureConfig
  onClose: () => void
}

export function BuyModal({ config, onClose }: BuyModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { enabled } = useAuth() // using enabled to check if Firebase is configured

  const materialVolumeCm3 = useMemo(() => {
    const outerMm3 = config.width * config.height * config.depth
    const innerW = Math.max(0, config.width - 2 * config.wallThickness)
    const innerH = Math.max(0, config.height - 2 * config.wallThickness)
    const innerD = Math.max(0, config.depth - 2 * config.wallThickness)
    const innerMm3 = innerW * innerH * innerD
    return (outerMm3 - innerMm3) / 1000
  }, [config])

  const unitPrice = Math.max(5.00, materialVolumeCm3 * 1.20)
  const total = unitPrice * quantity

  const handleCheckout = async () => {
    setError(null)
    setLoading(true)

    try {
      const url = await createCheckoutSession(config, quantity)
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start checkout.')
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <header className="modal-header">
          <h2>Order Print</h2>
          <button className="ghost close-btn" onClick={onClose}>
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        <div className="modal-body">
          <div className="summary-card">
            <p className="summary-title">{config.name || 'Custom Enclosure'}</p>
            <ul className="summary-details">
              <li>Dimensions: {config.width} × {config.height} × {config.depth} mm</li>
              <li>Wall thickness: {config.wallThickness} mm</li>
              <li>Material volume: {materialVolumeCm3.toFixed(1)} cm³</li>
              <li>Holes: {config.holes.length}</li>
              <li>Unit price: £{unitPrice.toFixed(2)}</li>
            </ul>
          </div>

          <div className="quantity-row">
            <span className="qty-label">Quantity</span>
            <div className="qty-stepper">
              <button 
                className="secondary" 
                disabled={quantity <= 1 || loading} 
                onClick={() => setQuantity(q => q - 1)}
              >
                <Minus size={14} strokeWidth={2.5} />
              </button>
              <span className="qty-value">{quantity}</span>
              <button 
                className="secondary" 
                disabled={quantity >= 100 || loading} 
                onClick={() => setQuantity(q => q + 1)}
              >
                <Plus size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {!enabled && (
             <div className="modal-error-banner">
               Firebase is not configured. Purchasing is disabled.
             </div>
          )}

          {error && <p className="error" style={{ marginTop: 0, marginBottom: '0.5rem' }}>{error}</p>}
        </div>

        <footer className="modal-footer">
          <button className="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="primary checkout-btn" onClick={handleCheckout} disabled={loading || !enabled}>
            {loading ? (
              <Loader2 className="spinner" size={16} strokeWidth={2.5} />
            ) : (
              <ShoppingCart size={16} strokeWidth={2.5} />
            )}
            Proceed to Checkout (£{total.toFixed(2)})
          </button>
        </footer>
      </div>
    </div>
  )
}
