import { useMemo, useState } from 'react'
import type { CircularHole, EnclosureConfig, Face } from '../types/enclosure'
import { featureFlags } from '../config/featureFlags'
import { getFaceBounds } from '../utils/enclosureGeometry'

interface ControlPanelProps {
  config: EnclosureConfig
  onChange: (next: EnclosureConfig) => void
  onExportStl: () => void
}

const faces: Face[] = ['front', 'back', 'left', 'right', 'top', 'bottom']

function makeHoleId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `hole-${Date.now()}-${Math.floor(Math.random() * 10_000)}`
}

export function ControlPanel({ config, onChange, onExportStl }: ControlPanelProps) {
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

    const hole: CircularHole = {
      id: makeHoleId(),
      face,
      radius,
      x,
      y,
    }

    onChange({
      ...config,
      holes: [...config.holes, hole],
    })
  }

  return (
    <aside className="panel">
      <h1>Electronics Enclosure Designer</h1>
      <p className="panel-subtitle">Adjust dimensions, add face holes, and export a printable STL.</p>

      <section className="panel-section">
        <h2>Model</h2>

        <label>
          Name
          <input
            value={config.name}
            onChange={(event) => onChange({ ...config, name: event.target.value })}
          />
        </label>

        <label>
          Enclosure Type
          <select
            value={config.type}
            onChange={(event) =>
              onChange({ ...config, type: event.target.value as EnclosureConfig['type'] })
            }
          >
            <option value="plain">Plain box</option>
            <option value="lid">Lid style</option>
            <option value="flanged">Flanged base</option>
          </select>
        </label>

        <div className="grid-2">
          <label>
            Width (mm)
            <input
              type="number"
              min={40}
              max={240}
              value={config.width}
              onChange={(event) => onChange({ ...config, width: Number(event.target.value) })}
            />
          </label>

          <label>
            Height (mm)
            <input
              type="number"
              min={30}
              max={180}
              value={config.height}
              onChange={(event) => onChange({ ...config, height: Number(event.target.value) })}
            />
          </label>

          <label>
            Depth (mm)
            <input
              type="number"
              min={40}
              max={240}
              value={config.depth}
              onChange={(event) => onChange({ ...config, depth: Number(event.target.value) })}
            />
          </label>

          <label>
            Wall (mm)
            <input
              type="number"
              min={1}
              max={20}
              step={0.5}
              value={config.wallThickness}
              onChange={(event) =>
                onChange({
                  ...config,
                  wallThickness: Number(event.target.value),
                })
              }
            />
          </label>
        </div>
      </section>

      <section className="panel-section">
        <h2>Face Hole Tool</h2>

        <label>
          Surface
          <select
            value={face}
            onChange={(event) => {
              const nextFace = event.target.value as Face
              const nextBounds = getFaceBounds(config, nextFace)
              const nextMaxRadius = Math.max(1, Math.min(nextBounds.xLimit, nextBounds.yLimit))
              const nextRadius = clamp(holeRadius, 1, nextMaxRadius)

              setFace(nextFace)
              setHoleRadius(nextRadius)
              setHoleX(clamp(holeX, -nextBounds.xLimit + nextRadius, nextBounds.xLimit - nextRadius))
              setHoleY(clamp(holeY, -nextBounds.yLimit + nextRadius, nextBounds.yLimit - nextRadius))
            }}
          >
            {faces.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <div className="grid-2">
          <label>
            Radius (mm)
            <input
              type="number"
              min={1}
              max={maxRadius}
              step={0.5}
              value={holeRadius}
              onChange={(event) => {
                const nextRadius = clamp(Number(event.target.value), 1, maxRadius)
                setHoleRadius(nextRadius)
                setHoleX(clamp(holeX, -bounds.xLimit + nextRadius, bounds.xLimit - nextRadius))
                setHoleY(clamp(holeY, -bounds.yLimit + nextRadius, bounds.yLimit - nextRadius))
              }}
            />
          </label>

          <label>
            X offset (mm)
            <input
              type="number"
              min={-bounds.xLimit + holeRadius}
              max={bounds.xLimit - holeRadius}
              value={holeX}
              onChange={(event) =>
                setHoleX(clamp(Number(event.target.value), -bounds.xLimit + holeRadius, bounds.xLimit - holeRadius))
              }
            />
          </label>

          <label>
            Y offset (mm)
            <input
              type="number"
              min={-bounds.yLimit + holeRadius}
              max={bounds.yLimit - holeRadius}
              value={holeY}
              onChange={(event) =>
                setHoleY(clamp(Number(event.target.value), -bounds.yLimit + holeRadius, bounds.yLimit - holeRadius))
              }
            />
          </label>
        </div>

        <button onClick={addHole}>Add hole</button>

        <ul className="hole-list">
          {config.holes.length === 0 && <li>No holes yet.</li>}
          {config.holes.map((hole) => (
            <li key={hole.id}>
              <span>
                {hole.face} • r {hole.radius}mm @ ({hole.x}, {hole.y})
              </span>
              <button
                className="ghost"
                onClick={() =>
                  onChange({
                    ...config,
                    holes: config.holes.filter((item) => item.id !== hole.id),
                  })
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      {featureFlags.premiumOptions && (
        <section className="panel-section">
          <h2>Premium Options (Placeholder)</h2>
          <label className="placeholder-row">
            <input
              type="checkbox"
              checked={config.premium.advancedFastening}
              onChange={(event) =>
                onChange({
                  ...config,
                  premium: { ...config.premium, advancedFastening: event.target.checked },
                })
              }
              disabled
            />
            Advanced screw/fastening configs (coming soon)
          </label>
          <label className="placeholder-row">
            <input
              type="checkbox"
              checked={config.premium.waterproofSeal}
              onChange={(event) =>
                onChange({
                  ...config,
                  premium: { ...config.premium, waterproofSeal: event.target.checked },
                })
              }
              disabled
            />
            Waterproof seal package (coming soon)
          </label>
        </section>
      )}

      {featureFlags.paidServices && (
        <section className="panel-section">
          <h2>Paid Services (Placeholder)</h2>
          <label className="placeholder-row">
            <input
              type="checkbox"
              checked={config.services.printing}
              onChange={(event) =>
                onChange({
                  ...config,
                  services: { ...config.services, printing: event.target.checked },
                })
              }
              disabled
            />
            3D printing/manufacturing quote (coming soon)
          </label>
          <label className="placeholder-row">
            <input
              type="checkbox"
              checked={config.services.delivery}
              onChange={(event) =>
                onChange({
                  ...config,
                  services: { ...config.services, delivery: event.target.checked },
                })
              }
              disabled
            />
            Delivery & fulfilment options (coming soon)
          </label>
        </section>
      )}

      <button className="primary" onClick={onExportStl}>
        Download STL
      </button>
    </aside>
  )
}
