import { Box, shaderMaterial } from '@react-three/drei'
import { extend, useFrame, useThree } from '@react-three/fiber'
import React from 'react'
import * as THREE from 'three'
import { ShaderMaterial } from 'three'
import WebcamTexture from '../../../webcam/texture'
import { useFFTData, useScopeDataX, useScopeDataY } from '../../appState'
import { VisualProps } from '../common'

const DemoMaterial = shaderMaterial(
  {
    time: 0,
    fftBars: new Float32Array(),
    scopeX: new Float32Array(),
    scopeY: new Float32Array(),
    resolution: new THREE.Vector2(),
    map: new THREE.Texture(),
  },
  `
  varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  `
  uniform float time;
  uniform float fftBars[121];
  uniform float scopeX[121];
  uniform float scopeY[121];
  uniform vec2 resolution;
  uniform sampler2D map;

  varying vec2 vUv;
  
  void main() {
    vec2 uv = vUv;
    float pct = abs(sin(time));
    float amp = fftBars[int(floor((uv.x) * 64.0))];
    float sx = scopeX[int(floor((uv.x) * 64.0))];
    float sy = scopeY[int(floor((uv.y) * 64.0))];
    vec4 tex = texture2D(map, uv);
    vec3 color = vec3(sx+sy+tex.x, sx-sy+tex.y, amp+tex.z);
    vec3 colorA = vec3(amp,0.141,0.912);
    vec3 colorB = vec3(1.000,amp,0.224);
    // color = mix(color, tex, pct);
    gl_FragColor = vec4(color*amp,1.0);
    // gl_FragColor = tex;
    #include <tonemapping_fragment>
    #include <encodings_fragment>
  }
  `
)

extend({ DemoMaterial })

type DemoMaterialImpl = {
  time: number
  fftBars: Float32Array
  scopeX: Float32Array
  scopeY: Float32Array
  resolution: number[]
} & JSX.IntrinsicElements['shaderMaterial']

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      demoMaterial: DemoMaterialImpl
    }
  }
}

export function ShaderScene() {
  const size = useThree((state) => state.size)
  const ref = React.useRef<ShaderMaterial>(null)
  const boxRef = React.useRef<THREE.Mesh | null>(null)

  const bars = useFFTData()
  const scopeX = useScopeDataX()
  const scopeY = useScopeDataY()

  useFrame((state) => {
    if (!ref.current) return

    if (ref.current.uniforms) {
      ref.current.uniforms.time.value = state.clock.elapsedTime
      ref.current.uniforms.fftBars.value = bars
      ref.current.uniforms.scopeX.value = scopeX
      ref.current.uniforms.scopeY.value = scopeY
    }

    if (!boxRef.current) {
      return
    } else {
      boxRef.current.scale.x = 1 + bars[0] * 0.5
      boxRef.current.scale.y = 1 + bars[1] * 0.5
      boxRef.current.scale.z = 1 + bars[2] * 0.5
    }
  })

  return (
    <Box ref={boxRef}>
      <demoMaterial
        key={DemoMaterial.key}
        ref={ref}
        time={0}
        fftBars={bars}
        scopeX={scopeX}
        scopeY={scopeY}
        resolution={[size.width, size.height]}
      >
        <WebcamTexture />
      </demoMaterial>
    </Box>
  )
}

const FullscreenShaderVisual = ({ coordinateMapper }: VisualProps) => {
  return (
    <>
      <ShaderScene />
    </>
  )
}

export default FullscreenShaderVisual
