import { useMemo, useState } from 'react'
import { Download, ShoppingCart, Plus, X } from 'lucide-react'
import type { CircularHole, EnclosureConfig, Face } from '../types/enclosure'
import { getFaceBounds } from '../utils/enclosureGeometry'

// 1 inch = 25.4 mm
const MM_PER_INCH = 25.4

interface ControlPanelProps {
  config: EnclosureConfig
  onChange: (next: EnclosureConfig) => void
  onExportStl: () => void
  onBuy: () => void
  cloudSlot?: React.ReactNode
}

type Unit = 'mm' | 'in'

const faces: Face[] = ['front', 'back', 'left', 'right', 'top', 'bottom']

function makeHoleId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `hole-${Date.now()}-${Math.floor(Math.random() * 10_000)}`
}

export function ControlPanel({ config, onChange, onExportStl, onBuy, cloudSlot }: ControlPanelProps) {
  const [unit, setUnit] = useState<Unit>('mm')
  const [face, setFace] = useState<Face>('front')
  const [holeRadius, setHoleRadius] = useState(4)
  const [holeX, setHoleX] = useState(0)
  const [holeY, setHoleY] = useState(0)

  // Conversions for display
  const toDisplay = (mmValue: number) => unit === 'in' ? Number((mmValue / MM_PER_INCH).toFixed(3)) : mmValue
  const toMm = (displayValue: number) => unit === 'in' ? displayValue * MM_PER_INCH : displayValue
  const step = unit === 'in' ? 0.05 : 0.5

  const bounds = useMemo(() => getFaceBounds(config, face), [config, face])
  const maxRadius = Math.max(1, Math.min(bounds.xLimit, bounds.yLimit))

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

  const addHole = () => {
    const radius = clamp(holeRadius, 1, maxRadius)
    const x = clamp(holeX, -bounds.xLimit + radius, bounds.xLimit - radius)
    const y = clamp(holeY, -bounds.yLimit + radius, bounds.yLimit - radius)

    setHoleRadius(radius)
    setHoleX(x)
    setHoleY(y)

    const hole: CircularHole = { id: makeHoleId(), face, radius, x, y }
    onChange({ ...config, holes: [...config.holes, hole] })
  }

  const removeHole = (id: string) =>
    onChange({ ...config, holes: config.holes.filter((h) => h.id !== id) })

  return (
    <aside className="sidebar">
      {/* ── Scrollable body ── */}
      <div className="sidebar-body">
        {/* Header */}
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h1>Enclosure Designer</h1>
            <div className="unit-toggle">
              <button className={unit === 'mm' ? 'active' : ''} onClick={() => setUnit('mm')}>mm</button>
              <button className={unit === 'in' ? 'active' : ''} onClick={() => setUnit('in')}>in</button>
            </div>
          </div>
          <p>Parametric electronics enclosures, ready to print.</p>
        </div>

        {/* Dimensions */}
        <div className="section-group">
          <p className="section-label">Dimensions</p>

          <label className="field-label">
            Type
            <select
              value={config.type}
              onChange={(e) => onChange({ ...config, type: e.target.value as EnclosureConfig['type'] })}
            >
              <option value="plain">Plain box</option>
              <option value="lid">Lid style</option>
              <option value="flanged">Flanged base</option>
            </select>
          </label>

          <div className="dim-grid">
            <label className="field-label">
              Width ({unit})
              <input
                type="number"
                min={toDisplay(40)}
                max={toDisplay(240)}
                step={step}
                value={toDisplay(config.width)}
                onChange={(e) => onChange({ ...config, width: toMm(Number(e.target.value)) })}
              />
            </label>
            <label className="field-label">
              Height ({unit})
              <input
                type="number"
                min={toDisplay(30)}
                max={toDisplay(180)}
                step={step}
                value={toDisplay(config.height)}
                onChange={(e) => onChange({ ...config, height: toMm(Number(e.target.value)) })}
              />
            </label>
            <label className="field-label">
              Depth ({unit})
              <input
                type="number"
                min={toDisplay(40)}
                max={toDisplay(240)}
                step={step}
                value={toDisplay(config.depth)}
                onChange={(e) => onChange({ ...config, depth: toMm(Number(e.target.value)) })}
              />
            </label>
          </div>

          <label className="field-label">
            Wall thickness ({unit})
            <input
              type="number"
              min={toDisplay(1)}
              max={toDisplay(20)}
              step={step}
              value={toDisplay(config.wallThickness)}
              onChange={(e) => onChange({ ...config, wallThickness: toMm(Number(e.target.value)) })}
            />
          </label>
        </div>

        {/* Face holes */}
        <div className="section-group">
          <p className="section-label">Face Holes</p>

          <label className="field-label">
            Surface
            <select
              value={face}
              onChange={(e) => {
                const nextFace = e.target.value as Face
                const nb = getFaceBounds(config, nextFace)
                const nmr = Math.max(1, Math.min(nb.xLimit, nb.yLimit))
                const nr = clamp(holeRadius, 1, nmr)
                setFace(nextFace)
                setHoleRadius(nr)
                setHoleX(clamp(holeX, -nb.xLimit + nr, nb.xLimit - nr))
                setHoleY(clamp(holeY, -nb.yLimit + nr, nb.yLimit - nr))
              }}
            >
              {faces.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>

          <div className="hole-grid">
            <label className="field-label">
              Radius ({unit})
              <input
                type="number"
                min={toDisplay(1)}
                max={toDisplay(maxRadius)}
                step={step}
                value={toDisplay(holeRadius)}
                onChange={(e) => {
                  const nr = clamp(toMm(Number(e.target.value)), 1, maxRadius)
                  setHoleRadius(nr)
                  setHoleX(clamp(holeX, -bounds.xLimit + nr, bounds.xLimit - nr))
                  setHoleY(clamp(holeY, -bounds.yLimit + nr, bounds.yLimit - nr))
                }}
              />
            </label>
            <label className="field-label">
              X offset ({unit})
              <input
                type="number"
                min={toDisplay(-bounds.xLimit + holeRadius)}
                max={toDisplay(bounds.xLimit - holeRadius)}
                step={step}
                value={toDisplay(holeX)}
                onChange={(e) =>
                  setHoleX(clamp(toMm(Number(e.target.value)), -bounds.xLimit + holeRadius, bounds.xLimit - holeRadius))
                }
              />
            </label>
            <label className="field-label">
              Y offset ({unit})
              <input
                type="number"
                min={toDisplay(-bounds.yLimit + holeRadius)}
                max={toDisplay(bounds.yLimit - holeRadius)}
                step={step}
                value={toDisplay(holeY)}
                onChange={(e) =>
                  setHoleY(clamp(toMm(Number(e.target.value)), -bounds.yLimit + holeRadius, bounds.yLimit - holeRadius))
                }
              />
            </label>
          </div>

          <button className="add-btn" onClick={addHole}>
            <Plus size={13} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3rem' }} />
            Add hole
          </button>

          {config.holes.length === 0 ? (
            <p className="hole-empty">No holes yet — add one above.</p>
          ) : (
            <div className="hole-tags">
              {config.holes.map((hole) => (
                <span key={hole.id} className="hole-tag">
                  {hole.face} r{toDisplay(hole.radius)} ({toDisplay(hole.x)},{toDisplay(hole.y)})
                  <button onClick={() => removeHole(hole.id)} title="Remove hole"><X size={11} strokeWidth={2.5} /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Cloud save slot */}
        {cloudSlot}
      </div>

      {/* ── Sticky action footer ── */}
      <div className="action-footer">
        <button className="primary" onClick={onExportStl}>
          <Download size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.4rem' }} />
          Download STL
        </button>
        <button className="secondary" onClick={onBuy}>
          <ShoppingCart size={14} strokeWidth={2} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.4rem' }} />
          Buy
        </button>
      </div>
    </aside>
  )
}
