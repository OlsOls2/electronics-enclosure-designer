import { Canvas } from '@react-three/fiber'
import { Environment, Grid, OrbitControls } from '@react-three/drei'
import type { EnclosureConfig } from '../types/enclosure'
import { EnclosureMesh } from './EnclosureMesh'

interface DesignerCanvasProps {
  config: EnclosureConfig
}

export function DesignerCanvas({ config }: DesignerCanvasProps) {
  const largestDimension = Math.max(config.width, config.height, config.depth)
  const cameraDistance = largestDimension * 2.1

  return (
    <div className="canvas-shell">
      <Canvas shadows camera={{ position: [cameraDistance, cameraDistance, cameraDistance], fov: 40 }}>
        <ambientLight intensity={0.45} />
        <directionalLight
          intensity={1}
          position={[largestDimension, largestDimension * 1.8, largestDimension]}
          castShadow
        />
        <EnclosureMesh config={config} />
        <Grid args={[largestDimension * 3, largestDimension * 3]} cellSize={8} cellThickness={0.5} />
        <OrbitControls makeDefault />
        <Environment preset="city" />
      </Canvas>
    </div>
  )
}
