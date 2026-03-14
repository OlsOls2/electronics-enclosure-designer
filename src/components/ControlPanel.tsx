import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown, Download, Plus, ShoppingCart, X } from 'lucide-react'
import type { AccountTier } from '../types/account'
import type { CircularHole, EnclosureConfig, Face } from '../types/enclosure'
import { getFaceBounds } from '../utils/enclosureBounds'

const MM_PER_INCH = 25.4
const MOBILE_MEDIA_QUERY = '(max-width: 768px)'

type Unit = 'mm' | 'in'
type CollapsibleSectionKey = 'dimensions' | 'faceHoles' | 'premium'
type SectionOpenState = Record<CollapsibleSectionKey, boolean>

interface ControlPanelProps {
  config: EnclosureConfig
  onChange: (next: EnclosureConfig) => void
  onExportStl: () => void
  onBuy: () => void
  onPremiumFeatureBlocked: () => void
  cloudSlot?: ReactNode
  accountTier: AccountTier
  accountLoading: boolean
  accountError: string | null
}

const faces: Face[] = ['front', 'back', 'left', 'right', 'top', 'bottom']

function makeHoleId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `hole-${Date.now()}-${Math.floor(Math.random() * 10_000)}`
}

function getPremiumGateLabel(accountTier: AccountTier): string {
  if (accountTier === 'guest') {
    return 'Sign in to unlock premium options.'
  }

  if (accountTier === 'free') {
    return 'Premium options require a paid account.'
  }

  return 'Premium account active.'
}

function getDefaultSectionOpenState(): SectionOpenState {
  if (typeof window === 'undefined') {
    return {
      dimensions: true,
      faceHoles: true,
      premium: true,
    }
  }

  const isMobile = window.matchMedia(MOBILE_MEDIA_QUERY).matches

  return {
    dimensions: !isMobile,
    faceHoles: !isMobile,
    premium: !isMobile,
  }
}

interface CollapsibleSectionProps {
  title: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}

function CollapsibleSection({ title, open, onToggle, children }: CollapsibleSectionProps) {
  return (
    <div className="section-accordion">
      <button className="section-toggle" type="button" onClick={onToggle} aria-expanded={open}>
        <span>{title}</span>
        <ChevronDown size={13} strokeWidth={2.5} className="section-toggle-chevron" />
      </button>

      {open && <div className="section-content">{children}</div>}
    </div>
  )
}

export function ControlPanel({
  config,
  onChange,
  onExportStl,
  onBuy,
  onPremiumFeatureBlocked,
  cloudSlot,
  accountTier,
  accountLoading,
  accountError,
}: ControlPanelProps) {
  const [unit, setUnit] = useState<Unit>('mm')
  const [face, setFace] = useState<Face>('front')
  const [holeRadius, setHoleRadius] = useState(4)
  const [holeX, setHoleX] = useState(0)
  const [holeY, setHoleY] = useState(0)
  const [sectionsOpen, setSectionsOpen] = useState<SectionOpenState>(() => getDefaultSectionOpenState())

  const canEditPremium = accountTier === 'paid'

  const toDisplay = (mmValue: number) => (unit === 'in' ? Number((mmValue / MM_PER_INCH).toFixed(3)) : mmValue)
  const toMm = (displayValue: number) => (unit === 'in' ? displayValue * MM_PER_INCH : displayValue)
  const step = unit === 'in' ? 0.05 : 0.5

  const bounds = useMemo(() => getFaceBounds(config, face), [config, face])
  const maxRadius = Math.max(1, Math.min(bounds.xLimit, bounds.yLimit))

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

  const toggleSection = (section: CollapsibleSectionKey) => {
    if (section === 'premium' && !canEditPremium) {
      onPremiumFeatureBlocked()
      return
    }

    setSectionsOpen((current) => ({
      ...current,
      [section]: !current[section],
    }))
  }

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
    onChange({ ...config, holes: config.holes.filter((hole) => hole.id !== id) })

  const updatePremiumOption = (option: 'advancedFastening' | 'waterproofSeal', enabled: boolean) => {
    if (!canEditPremium) {
      onPremiumFeatureBlocked()
      return
    }

    onChange({
      ...config,
      premium: {
        ...config.premium,
        [option]: enabled,
      },
    })
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-body">
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h1>Enclosure Designer</h1>
            <div className="unit-toggle">
              <button className={unit === 'mm' ? 'active' : ''} type="button" onClick={() => setUnit('mm')}>mm</button>
              <button className={unit === 'in' ? 'active' : ''} type="button" onClick={() => setUnit('in')}>in</button>
            </div>
          </div>
          <p>Parametric electronics enclosures, ready to print.</p>
        </div>

        <CollapsibleSection
          title="Dimensions"
          open={sectionsOpen.dimensions}
          onToggle={() => toggleSection('dimensions')}
        >
          <label className="field-label">
            Type
            <select
              value={config.type}
              onChange={(event) => onChange({ ...config, type: event.target.value as EnclosureConfig['type'] })}
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
                onChange={(event) => onChange({ ...config, width: toMm(Number(event.target.value)) })}
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
                onChange={(event) => onChange({ ...config, height: toMm(Number(event.target.value)) })}
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
                onChange={(event) => onChange({ ...config, depth: toMm(Number(event.target.value)) })}
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
              onChange={(event) => onChange({ ...config, wallThickness: toMm(Number(event.target.value)) })}
            />
          </label>
        </CollapsibleSection>

        <CollapsibleSection
          title="Face Holes"
          open={sectionsOpen.faceHoles}
          onToggle={() => toggleSection('faceHoles')}
        >
          <label className="field-label">
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
              {faces.map((itemFace) => (
                <option key={itemFace} value={itemFace}>{itemFace}</option>
              ))}
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
                onChange={(event) => {
                  const nextRadius = clamp(toMm(Number(event.target.value)), 1, maxRadius)
                  setHoleRadius(nextRadius)
                  setHoleX(clamp(holeX, -bounds.xLimit + nextRadius, bounds.xLimit - nextRadius))
                  setHoleY(clamp(holeY, -bounds.yLimit + nextRadius, bounds.yLimit - nextRadius))
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
                onChange={(event) =>
                  setHoleX(clamp(toMm(Number(event.target.value)), -bounds.xLimit + holeRadius, bounds.xLimit - holeRadius))
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
                onChange={(event) =>
                  setHoleY(clamp(toMm(Number(event.target.value)), -bounds.yLimit + holeRadius, bounds.yLimit - holeRadius))
                }
              />
            </label>
          </div>

          <button className="add-btn" type="button" onClick={addHole}>
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
                  <button type="button" onClick={() => removeHole(hole.id)} title="Remove hole">
                    <X size={11} strokeWidth={2.5} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Premium Options"
          open={sectionsOpen.premium}
          onToggle={() => toggleSection('premium')}
        >
          <div
            onMouseDownCapture={(event) => {
              if (!canEditPremium) {
                const target = event.target as HTMLElement
                if (target.closest('select, input, button')) {
                  event.preventDefault()
                  onPremiumFeatureBlocked()
                }
              }
            }}
          >
          <label className="toggle-field">
            <input
              type="checkbox"
              checked={config.premium.advancedFastening}
              onClick={(event) => {
                if (!canEditPremium) {
                  event.preventDefault()
                  onPremiumFeatureBlocked()
                }
              }}
              onChange={(event) => updatePremiumOption('advancedFastening', event.target.checked)}
            />
            <span>
              Advanced fastening kit
              <small>adds threaded inserts and screw-ready support geometry presets</small>
            </span>
          </label>

          <label className="toggle-field">
            <input
              type="checkbox"
              checked={config.premium.waterproofSeal}
              onClick={(event) => {
                if (!canEditPremium) {
                  event.preventDefault()
                  onPremiumFeatureBlocked()
                }
              }}
              onChange={(event) => updatePremiumOption('waterproofSeal', event.target.checked)}
            />
            <span>
              Waterproof sealing profile
              <small>enables gasket-ready lip clearances for sealed enclosures</small>
            </span>
          </label>

          {accountLoading ? (
            <p className="premium-lock">Checking account tier…</p>
          ) : (
            <p className="premium-lock">{getPremiumGateLabel(accountTier)}</p>
          )}

          {accountError && <p className="error">{accountError}</p>}
          </div>
        </CollapsibleSection>

        {cloudSlot}
      </div>

      <div className="action-footer">
        <button className="primary" type="button" onClick={onExportStl}>
          <Download size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.4rem' }} />
          Download STL
        </button>
        <button className="secondary" type="button" onClick={onBuy}>
          <ShoppingCart size={14} strokeWidth={2} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.4rem' }} />
          Buy
        </button>
      </div>
    </aside>
  )
}
