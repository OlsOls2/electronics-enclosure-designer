import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Mesh,
  MeshStandardMaterial,
} from 'three'
import { CSG } from 'three-csg-ts'
import type { CircularHole, EnclosureConfig, Face } from '../types/enclosure'

const material = new MeshStandardMaterial()

function buildBoxMesh(width: number, height: number, depth: number): Mesh {
  return new Mesh(new BoxGeometry(width, height, depth), material)
}

function getFaceLimits(config: EnclosureConfig, face: Face) {
  const w = config.width / 2 - config.wallThickness
  const h = config.height / 2 - config.wallThickness
  const d = config.depth / 2 - config.wallThickness

  if (face === 'front' || face === 'back') {
    return { xLimit: w, yLimit: h }
  }

  if (face === 'left' || face === 'right') {
    return { xLimit: d, yLimit: h }
  }

  return { xLimit: w, yLimit: d }
}

function createHoleDrill(hole: CircularHole, config: EnclosureConfig): Mesh {
  const limits = getFaceLimits(config, hole.face)
  const radius = Math.max(1, Math.min(hole.radius, Math.abs(limits.xLimit), Math.abs(limits.yLimit)))
  const x = Math.min(Math.max(hole.x, -limits.xLimit + radius), limits.xLimit - radius)
  const y = Math.min(Math.max(hole.y, -limits.yLimit + radius), limits.yLimit - radius)

  const drillLength = Math.max(config.width, config.height, config.depth) + 20
  const drill = new Mesh(new CylinderGeometry(radius, radius, drillLength, 48), material)

  switch (hole.face) {
    case 'front':
      drill.rotation.x = Math.PI / 2
      drill.position.set(x, y, config.depth / 2)
      break
    case 'back':
      drill.rotation.x = Math.PI / 2
      drill.position.set(x, y, -config.depth / 2)
      break
    case 'left':
      drill.rotation.z = Math.PI / 2
      drill.position.set(-config.width / 2, y, x)
      break
    case 'right':
      drill.rotation.z = Math.PI / 2
      drill.position.set(config.width / 2, y, x)
      break
    case 'top':
      drill.position.set(x, config.height / 2, y)
      break
    case 'bottom':
      drill.position.set(x, -config.height / 2, y)
      break
  }

  drill.updateMatrix()
  return drill
}

function applyEnclosureType(shell: Mesh, config: EnclosureConfig) {
  let output = shell
  const trimWall = Math.max(1, config.wallThickness)

  if (config.type === 'lid') {
    const lid = buildBoxMesh(config.width * 0.98, trimWall * 1.4, config.depth * 0.98)
    lid.position.y = config.height / 2 + trimWall * 0.7
    lid.updateMatrix()
    output.updateMatrix()
    output = CSG.union(output, lid)
  }

  if (config.type === 'flanged') {
    const flange = buildBoxMesh(
      config.width + trimWall * 4,
      trimWall,
      config.depth + trimWall * 4,
    )
    const centerCutout = buildBoxMesh(config.width, trimWall * 1.4, config.depth)

    flange.position.y = -config.height / 2 + trimWall / 2
    centerCutout.position.y = -config.height / 2 + trimWall / 2

    flange.updateMatrix()
    centerCutout.updateMatrix()

    const ringFlange = CSG.subtract(flange, centerCutout)
    output.updateMatrix()
    ringFlange.updateMatrix()
    output = CSG.union(output, ringFlange)
  }

  return output
}

export function buildEnclosureMesh(config: EnclosureConfig): Mesh {
  const wallThickness = Math.max(1, Math.min(config.wallThickness, Math.min(config.width, config.height, config.depth) / 3))
  const outer = buildBoxMesh(config.width, config.height, config.depth)

  const innerWidth = config.width - wallThickness * 2
  const innerHeight = config.height - wallThickness * 2
  const innerDepth = config.depth - wallThickness * 2

  let shell = outer
  if (innerWidth > 1 && innerHeight > 1 && innerDepth > 1) {
    const inner = buildBoxMesh(innerWidth, innerHeight, innerDepth)
    inner.updateMatrix()
    shell.updateMatrix()
    shell = CSG.subtract(shell, inner)
  }

  shell = applyEnclosureType(shell, { ...config, wallThickness })

  for (const hole of config.holes) {
    const drill = createHoleDrill(hole, { ...config, wallThickness })
    shell.updateMatrix()
    drill.updateMatrix()
    shell = CSG.subtract(shell, drill)
  }

  shell.geometry.computeVertexNormals()
  shell.geometry.center()

  return shell
}

export function buildEnclosureGeometry(config: EnclosureConfig): BufferGeometry {
  const shell = buildEnclosureMesh(config)
  return shell.geometry
}

export function getFaceBounds(config: EnclosureConfig, face: Face) {
  return getFaceLimits(config, face)
}
