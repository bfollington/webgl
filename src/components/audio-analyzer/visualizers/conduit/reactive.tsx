import { Billboard, Box, Plane, ScreenQuad, shaderMaterial } from '@react-three/drei'
import { extend, useFrame, useThree } from '@react-three/fiber'
import React, { useMemo } from 'react'
import * as THREE from 'three'
import { ShaderMaterial } from 'three'
import WebcamTexture from '../../../webcam/texture'
import { useFFTData, useScopeDataX, useScopeDataY } from '../../appState'
import { VisualProps } from '../common'

const ConduitMaterial = shaderMaterial(
  {
    iTime: 0,
    fftBars: new Float32Array(),
    scopeX: new Float32Array(),
    scopeY: new Float32Array(),
    iResolution: new THREE.Vector2(),
  },
  `
  varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      gl_Position = vec4(position, 1.0);
    }
  `,
  `
  uniform float iTime;
  uniform float fftBars[121];
  uniform float scopeX[121];
  uniform float scopeY[121];
  uniform vec2 iResolution;
  #define fragCoord gl_FragCoord
  #define fragColor gl_FragColor

  varying vec2 vUv;

  // Forked from https://www.shadertoy.com/view/csj3zt

float seg(in vec2 p, in vec2 a, in vec2 b) {
    vec2 pa = p-a, ba = b-a;
    float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
    return length( pa - ba*h );
}

void main()
{
    vec2 uv = (fragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
    float a = atan(uv.y, uv.x);
    vec2 p = cos(a + iTime) * vec2(cos(0.5 * iTime), sin(0.3 * iTime));
    vec2 q = (cos(iTime)) * vec2(cos(iTime), sin(iTime));
    
    float d1 = length(uv - p);
    float d2 = length(uv - 0.);
    
    vec2 uv2 = 2. * cos(log(length(uv))*0.25 - 0.5 * iTime + log(vec2(d1,d2)/(d1+d2)));///(d1+d2);

    float c = cos(10. * length(uv2) + 4. * iTime);
    vec3 col = (0.5 + 0.5 * c) * vec3(.9,.9,1) *
           exp(-9. * abs(cos(9. * a + iTime) * uv.x
                       + sin(9. * a + iTime) * uv.y 
                       + 0.1 * c));
    
    fragColor = vec4(col,1.0);
}
  `
)

extend({ ConduitMaterial })

type ConduitMaterialImpl = {
  iTime: number
  fftBars: Float32Array
  scopeX: Float32Array
  scopeY: Float32Array
  iResolution: number[]
} & JSX.IntrinsicElements['shaderMaterial']

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      conduitMaterial: ConduitMaterialImpl
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
  const date = useMemo(() => Date.now(), [])

  useFrame((state) => {
    if (!ref.current) return

    if (ref.current.uniforms) {
      ref.current.uniforms.iTime.value = (Date.now() % 1000000) / 1000.0
      ref.current.uniforms.fftBars.value = bars
      ref.current.uniforms.scopeX.value = scopeX
      ref.current.uniforms.scopeY.value = scopeY
    }
  })

  return (
    <ScreenQuad ref={boxRef}>
      <conduitMaterial
        key={ConduitMaterial.key}
        ref={ref}
        iTime={0}
        fftBars={bars}
        scopeX={scopeX}
        scopeY={scopeY}
        iResolution={[size.width, size.height]}
      ></conduitMaterial>
    </ScreenQuad>
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
