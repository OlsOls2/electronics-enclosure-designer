import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Mesh,
  MeshStandardMaterial,
} from 'three'
import { CSG } from 'three-csg-ts'
import type { CircularHole, EnclosureConfig, Face } from '../types/enclosure'
import { clampHoleToFace, getFaceBounds } from './enclosureBounds'

const sharedMaterial = new MeshStandardMaterial()

function buildBoxMesh(width: number, height: number, depth: number): Mesh {
  return new Mesh(new BoxGeometry(width, height, depth), sharedMaterial)
}

function disposeMeshGeometry(mesh: Mesh, keepGeometry?: BufferGeometry): void {
  if (mesh.geometry instanceof BufferGeometry && mesh.geometry !== keepGeometry) {
    mesh.geometry.dispose()
  }
}

function subtractMeshes(base: Mesh, cutter: Mesh): Mesh {
  base.updateMatrix()
  cutter.updateMatrix()

  const result = CSG.subtract(base, cutter)
  const keepGeometry = result.geometry instanceof BufferGeometry ? result.geometry : undefined

  disposeMeshGeometry(base, keepGeometry)
  disposeMeshGeometry(cutter, keepGeometry)

  return result
}

function unionMeshes(base: Mesh, additive: Mesh): Mesh {
  base.updateMatrix()
  additive.updateMatrix()

  const result = CSG.union(base, additive)
  const keepGeometry = result.geometry instanceof BufferGeometry ? result.geometry : undefined

  disposeMeshGeometry(base, keepGeometry)
  disposeMeshGeometry(additive, keepGeometry)

  return result
}

function createHoleDrill(hole: CircularHole, config: EnclosureConfig): Mesh {
  const clampedHole = clampHoleToFace(hole, config)

  const drillLength = Math.max(config.width, config.height, config.depth) + 20
  const radialSegments = Math.min(48, Math.max(16, Math.round(clampedHole.radius * 4)))
  const drill = new Mesh(
    new CylinderGeometry(clampedHole.radius, clampedHole.radius, drillLength, radialSegments),
    sharedMaterial,
  )

  switch (clampedHole.face) {
    case 'front':
      drill.rotation.x = Math.PI / 2
      drill.position.set(clampedHole.x, clampedHole.y, config.depth / 2)
      break
    case 'back':
      drill.rotation.x = Math.PI / 2
      drill.position.set(clampedHole.x, clampedHole.y, -config.depth / 2)
      break
    case 'left':
      drill.rotation.z = Math.PI / 2
      drill.position.set(-config.width / 2, clampedHole.y, clampedHole.x)
      break
    case 'right':
      drill.rotation.z = Math.PI / 2
      drill.position.set(config.width / 2, clampedHole.y, clampedHole.x)
      break
    case 'top':
      drill.position.set(clampedHole.x, config.height / 2, clampedHole.y)
      break
    case 'bottom':
      drill.position.set(clampedHole.x, -config.height / 2, clampedHole.y)
      break
  }

  drill.updateMatrix()
  return drill
}

function applyEnclosureType(shell: Mesh, config: EnclosureConfig): Mesh {
  let output = shell
  const trimWall = Math.max(1, config.wallThickness)

  if (config.type === 'lid') {
    const lid = buildBoxMesh(config.width * 0.98, trimWall * 1.4, config.depth * 0.98)
    lid.position.y = config.height / 2 + trimWall * 0.7
    output = unionMeshes(output, lid)
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

    const ringFlange = subtractMeshes(flange, centerCutout)
    output = unionMeshes(output, ringFlange)
  }

  return output
}

export function buildEnclosureMesh(config: EnclosureConfig): Mesh {
  const wallThickness = Math.max(1, Math.min(config.wallThickness, Math.min(config.width, config.height, config.depth) / 3))
  const normalizedConfig = { ...config, wallThickness }

  let shell = buildBoxMesh(config.width, config.height, config.depth)

  const innerWidth = config.width - wallThickness * 2
  const innerHeight = config.height - wallThickness * 2
  const innerDepth = config.depth - wallThickness * 2

  if (innerWidth > 1 && innerHeight > 1 && innerDepth > 1) {
    const inner = buildBoxMesh(innerWidth, innerHeight, innerDepth)
    shell = subtractMeshes(shell, inner)
  }

  shell = applyEnclosureType(shell, normalizedConfig)

  for (const hole of config.holes) {
    const drill = createHoleDrill(hole, normalizedConfig)
    shell = subtractMeshes(shell, drill)
  }

  shell.geometry.computeVertexNormals()
  shell.geometry.computeBoundingBox()

  const bounds = shell.geometry.boundingBox
  if (bounds) {
    const centerX = (bounds.min.x + bounds.max.x) / 2
    const centerZ = (bounds.min.z + bounds.max.z) / 2
    const minY = bounds.min.y
    shell.geometry.translate(-centerX, -minY, -centerZ)
  }

  return shell
}

export function buildEnclosureGeometry(config: EnclosureConfig): BufferGeometry {
  const shell = buildEnclosureMesh(config)
  return shell.geometry
}

export { getFaceBounds }
export type { Face }
