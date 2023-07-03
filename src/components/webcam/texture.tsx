import { useControls } from 'leva'
import { useEffect, useState } from 'react'
import { useWebcam } from './useWebcam'
import { AttachType } from '@react-three/fiber/dist/declarations/src/core/renderer'

type Props = {
  attach?: AttachType
}

export default function WebcamTexture({ attach = 'map' }: Props) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>()
  const [startTime, setStartTime] = useState(0)

  const [deviceOptions, setDeviceOptions] = useState({
    Default: 'default',
  })

  const { camera } = useControls(
    {
      camera: {
        value: 'default',
        options: deviceOptions,
      },
    },
    [deviceOptions]
  )

  const [webcamMaterial, width, height] = useWebcam({ id: camera })

  useEffect(() => {
    if ((navigator.mediaDevices as any).getUserMedia) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        setDevices((_) => devices)
      })
    }
  }, [])

  useEffect(() => {
    if (devices && devices.length > 0) {
      const cameraVideoInputs = devices.filter((device) => device.kind === 'videoinput')
      const _deviceOptions = { ...deviceOptions } as any
      cameraVideoInputs.forEach((device) => {
        _deviceOptions[device.label] = device.deviceId
      })
      setDeviceOptions(_deviceOptions)
    }
  }, [devices])

  return <videoTexture attach={attach} args={[webcamMaterial]} />
}
