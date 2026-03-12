import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import type { EnclosureConfig } from '../types/enclosure'
import { buildEnclosureMesh } from './enclosureGeometry'

export function exportModelAsStl(config: EnclosureConfig) {
  const exporter = new STLExporter()
  const mesh = buildEnclosureMesh(config)
  mesh.updateMatrixWorld(true)

  const stl = exporter.parse(mesh, { binary: false }) as string
  const blob = new Blob([stl], { type: 'model/stl' })
  const url = URL.createObjectURL(blob)

  const safeName = config.name.trim().replace(/\s+/g, '-').toLowerCase() || 'enclosure-model'
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${safeName}.stl`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  URL.revokeObjectURL(url)
}
