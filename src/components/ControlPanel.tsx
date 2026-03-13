import { useMemo, useState } from 'react'
import { Download, ShoppingCart, Plus, X } from 'lucide-react'
import type { CircularHole, EnclosureConfig, Face } from '../types/enclosure'
import { getFaceBounds } from '../utils/enclosureGeometry'

interface ControlPanelProps {
  config: EnclosureConfig
  onChange: (next: EnclosureConfig) => void
  onExportStl: () => void
  cloudSlot?: React.ReactNode
}

const faces: Face[] = ['front', 'back', 'left', 'right', 'top', 'bottom']

function makeHoleId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `hole-${Date.now()}-${Math.floor(Math.random() * 10_000)}`
}

export function ControlPanel({ config, onChange, onExportStl, cloudSlot }: ControlPanelProps) {
  const [face, setFace] = useState<Face>('front')
  const [holeRadius, setHoleRadius] = useState(4)
  const [holeX, setHoleX] = useState(0)
  const [holeY, setHoleY] = useState(0)

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
          <h1>Enclosure Designer</h1>
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
              Width (mm)
              <input
                type="number"
                min={40}
                max={240}
                value={config.width}
                onChange={(e) => onChange({ ...config, width: Number(e.target.value) })}
              />
            </label>
            <label className="field-label">
              Height (mm)
              <input
                type="number"
                min={30}
                max={180}
                value={config.height}
                onChange={(e) => onChange({ ...config, height: Number(e.target.value) })}
              />
            </label>
            <label className="field-label">
              Depth (mm)
              <input
                type="number"
                min={40}
                max={240}
                value={config.depth}
                onChange={(e) => onChange({ ...config, depth: Number(e.target.value) })}
              />
            </label>
          </div>

          <label className="field-label">
            Wall thickness (mm)
            <input
              type="number"
              min={1}
              max={20}
              step={0.5}
              value={config.wallThickness}
              onChange={(e) => onChange({ ...config, wallThickness: Number(e.target.value) })}
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
              Radius (mm)
              <input
                type="number"
                min={1}
                max={maxRadius}
                step={0.5}
                value={holeRadius}
                onChange={(e) => {
                  const nr = clamp(Number(e.target.value), 1, maxRadius)
                  setHoleRadius(nr)
                  setHoleX(clamp(holeX, -bounds.xLimit + nr, bounds.xLimit - nr))
                  setHoleY(clamp(holeY, -bounds.yLimit + nr, bounds.yLimit - nr))
                }}
              />
            </label>
            <label className="field-label">
              X offset (mm)
              <input
                type="number"
                min={-bounds.xLimit + holeRadius}
                max={bounds.xLimit - holeRadius}
                value={holeX}
                onChange={(e) =>
                  setHoleX(clamp(Number(e.target.value), -bounds.xLimit + holeRadius, bounds.xLimit - holeRadius))
                }
              />
            </label>
            <label className="field-label">
              Y offset (mm)
              <input
                type="number"
                min={-bounds.yLimit + holeRadius}
                max={bounds.yLimit - holeRadius}
                value={holeY}
                onChange={(e) =>
                  setHoleY(clamp(Number(e.target.value), -bounds.yLimit + holeRadius, bounds.yLimit - holeRadius))
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
                  {hole.face} r{hole.radius} ({hole.x},{hole.y})
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
        <button className="secondary" title="Manufacturing quotes coming soon" disabled>
          <ShoppingCart size={14} strokeWidth={2} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.4rem' }} />
          Buy
        </button>
      </div>
    </aside>
  )
}
