import { CheckCircle2 } from 'lucide-react'

export function OrderSuccess() {
  return (
    <div className="success-page">
      <div className="success-card">
        <div className="success-icon">
          <CheckCircle2 size={36} strokeWidth={2.5} />
        </div>
        <h1>Order confirmed</h1>
        <p>Thank you! Your custom enclosure order has been received. We'll send you an email with the tracking details once it ships.</p>
        <button className="primary" onClick={() => { window.location.hash = '' }}>
          Back to Designer
        </button>
      </div>
    </div>
  )
}
