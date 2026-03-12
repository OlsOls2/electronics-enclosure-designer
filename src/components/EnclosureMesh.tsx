import { useEffect, useMemo } from 'react'
import type { EnclosureConfig } from '../types/enclosure'
import { buildEnclosureGeometry } from '../utils/enclosureGeometry'

interface EnclosureMeshProps {
  config: EnclosureConfig
}

export function EnclosureMesh({ config }: EnclosureMeshProps) {
  const geometry = useMemo(() => buildEnclosureGeometry(config), [config])

  useEffect(() => {
    return () => {
      geometry.dispose()
    }
  }, [geometry])

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#7aa2ff" metalness={0.15} roughness={0.55} />
    </mesh>
  )
}
