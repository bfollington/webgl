import { folder, useControls } from 'leva'
import { PointLight } from 'three'
import BaseGrid from '../grid/base'
import { VisualProps } from '../common'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import WebCam from '../../../webcam/camera'

const WebcamVisual = ({ coordinateMapper }: VisualProps) => {
  const { nPinGridRows, nPinGridCols, pinGridUnitSideLength } = useControls({
    'Visual - Grid': folder(
      {
        nPinGridRows: {
          value: 50,
          min: 2,
          max: 150,
          step: 1,
        },
        nPinGridCols: {
          value: 50,
          min: 2,
          max: 150,
          step: 1,
        },
        pinGridUnitSideLength: {
          value: 0.3,
          min: 0.05,
          max: 1.0,
          step: 0.05,
        },
      },
      { collapsed: true }
    ),
  })

  const radius = Math.max(nPinGridCols, nPinGridRows) * 1.1 * pinGridUnitSideLength
  const lightRef = useRef<PointLight>(null!)
  useFrame(({ clock }) => {
    if (lightRef?.current) {
      const t = clock.getElapsedTime() * 0.1
      const halfR = radius / 2
      lightRef.current.position.x = halfR * Math.sin(t * 7)
      lightRef.current.position.y = halfR * Math.cos(t * 5)
      lightRef.current.position.z = Math.abs(halfR * Math.cos(t * 3))
    }
  })

  return (
    <>
      <WebCam />
    </>
  )
}

export default WebcamVisual
