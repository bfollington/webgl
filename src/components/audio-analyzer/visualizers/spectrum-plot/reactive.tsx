import { Box, Plane, shaderMaterial, useTexture } from '@react-three/drei'
import { extend, useFrame, useThree } from '@react-three/fiber'
import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { ShaderMaterial } from 'three'
import WebcamTexture from '../../../webcam/texture'
import { useFFTData, useScopeDataX, useScopeDataY } from '../../appState'
import { VisualProps } from '../common'
import linearMap from './linear.png'

const SpectrumMaterial = shaderMaterial(
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

extend({ DemoMaterial: SpectrumMaterial })

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
  const dataTexture = useRef<THREE.DataTexture>(null)
  const linearMapTex = useTexture(linearMap)

  const bars = useFFTData()
  const scopeX = useScopeDataX()
  const scopeY = useScopeDataY()

  const fftSize = 121
  const history = 512
  const buffer = useRef<Uint8Array>(new Uint8Array(fftSize * history))

  useEffect(() => {
    buffer.current.fill(0)
  })

  useFrame(() => {
    const values = new Uint8Array(bars.map((v) => v * 128))
    // push all data in buffer back one fftSize worth
    // buffer.current.map((v, i) => (buffer.current[i] = v * 0.9999999999999999))
    buffer.current.copyWithin(fftSize, 0)
    // multiply each value to be 90% of the previous value

    buffer.current.set(values, 0)
    if (dataTexture.current) {
      dataTexture.current.needsUpdate = true
      dataTexture.current.magFilter = THREE.LinearFilter
    }

    // debugger
  })

  return (
    <group>
      <pointLight position={[-3, -3, -3]} intensity={0.1} color={'white'} />
      <Plane args={[7, 10, 256, 256]}>
        <meshPhysicalMaterial
          map={linearMapTex}
          side={0}
          color={'#32324A'}
          opacity={0.6}
          transparent
        >
          {/* <WebcamTexture attach='map' /> */}
          {/* <dataTexture
          attach='map'
          args={[buffer.current, fftSize, history]}
          onUpdate={(self) => (self.needsUpdate = true)}
        /> */}
          <dataTexture
            ref={dataTexture}
            attach='normalMap'
            type={THREE.UnsignedByteType}
            format={THREE.RedFormat}
            args={[buffer.current, fftSize, history]}
            onUpdate={(self) => (self.needsUpdate = true)}
          />
          <dataTexture
            ref={dataTexture}
            attach='displacementMap'
            type={THREE.UnsignedByteType}
            format={THREE.RedFormat}
            args={[buffer.current, fftSize, history]}
            onUpdate={(self) => (self.needsUpdate = true)}
          />
        </meshPhysicalMaterial>
      </Plane>
    </group>
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
