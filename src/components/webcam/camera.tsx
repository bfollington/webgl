import { useAspect } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import WebcamTexture from './texture'

export default function WebCam() {
  const ref = useRef<THREE.Mesh | null>(null)
  const { viewport, clock } = useThree()
  const [vx, vy] = useAspect(viewport.width, viewport.height)
  const [active, setActive] = useState(false)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>()
  const [startTime, setStartTime] = useState(0)

  useFrame(({ clock }) => {
    if (ref.current) {
      if (active) {
        ref.current.rotation.x = Math.sin((clock.getElapsedTime() - startTime) * 0.5)
        ref.current.rotation.y = Math.sin((clock.getElapsedTime() - startTime) * 0.2)
      } else {
        ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, 0, 0.1)
        ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, 0, 0.1)
      }
    }
  })

  useEffect(() => {
    setStartTime(clock.getElapsedTime())
  }, [active, clock])

  return (
    <mesh
      ref={ref}
      position={[0, 0, 0]}
      scale={[vx, vy, 1]}
      onClick={() => {
        setActive(!active)
      }}
    >
      <planeBufferGeometry args={[1, 1]} />
      <meshBasicMaterial>
        <WebcamTexture />
      </meshBasicMaterial>
    </mesh>
  )
}
