import { Canvas, useThree } from '@react-three/fiber'
import { Environment, OrbitControls } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import type { EnclosureConfig } from '../types/enclosure'
import { EnclosureMesh } from './EnclosureMesh'
import { OrientationWidget } from './scene/OrientationWidget'
import { SceneGridAndRulers } from './scene/SceneGridAndRulers'

interface DesignerCanvasProps {
  config: EnclosureConfig
  statsLabel: string
  onCaptureReady?: (capture: (() => string | null) | null) => void
}

interface CaptureBridgeProps {
  onCaptureReady?: (capture: (() => string | null) | null) => void
}

function CaptureBridge({ onCaptureReady }: CaptureBridgeProps) {
  const { gl, scene, camera } = useThree()

  useEffect(() => {
    if (!onCaptureReady) {
      return
    }

    const capture = () => {
      try {
        gl.render(scene, camera)
        return gl.domElement.toDataURL('image/png')
      } catch {
        return null
      }
    }

    onCaptureReady(capture)

    return () => {
      onCaptureReady(null)
    }
  }, [camera, gl, onCaptureReady, scene])

  return null
}

export function DesignerCanvas({ config, statsLabel, onCaptureReady }: DesignerCanvasProps) {
  const sceneMetrics = useMemo(() => {
    const largestDimension = Math.max(config.width, config.height, config.depth)
    return {
      largestDimension,
      cameraDistance: largestDimension * 2.1,
      lightPosition: [largestDimension, largestDimension * 1.8, largestDimension] as [number, number, number],
    }
  }, [config.depth, config.height, config.width])

  return (
    <div className="canvas-shell">
      <Canvas
        shadows
        dpr={[1, 1.8]}
        gl={{ preserveDrawingBuffer: true }}
        camera={{
          position: [sceneMetrics.cameraDistance, sceneMetrics.cameraDistance, sceneMetrics.cameraDistance],
          fov: 40,
        }}
      >
        <ambientLight intensity={0.45} />
        <directionalLight
          intensity={1}
          position={sceneMetrics.lightPosition}
          castShadow
        />

        <EnclosureMesh config={config} />
        <SceneGridAndRulers width={config.width} height={config.height} depth={config.depth} />

        <CaptureBridge onCaptureReady={onCaptureReady} />
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
        <OrientationWidget />
        <Environment preset="city" />
      </Canvas>
      <div className="stats-overlay">{statsLabel}</div>
    </div>
  )
}
