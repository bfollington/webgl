import { Billboard, Box, Plane, ScreenQuad, shaderMaterial } from '@react-three/drei'
import { extend, useFrame, useThree } from '@react-three/fiber'
import React, { useMemo } from 'react'
import * as THREE from 'three'
import { ShaderMaterial } from 'three'
import WebcamTexture from '../../../webcam/texture'
import { useFFTData, useScopeDataX, useScopeDataY } from '../../appState'
import { VisualProps } from '../common'

const ShimmeringMaterial = shaderMaterial(
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

  
vec3 roty(vec3 p, float a) {
  return p * mat3(cos(a), 0, -sin(a), 0, 1, 0, sin(a), 0, cos(a));
}

float map(in vec3 p) {

  float res = 0.;
  vec3 c = p;
  for (int i = 0; i < 3; i++) 
  {
      p = 3.0 * abs(p) / dot(p, p) - .7; 
      p.yz = vec2(p.y * p.y - p.z * p.z, 2. * abs(sin(iTime / 10.0))  * p.y * p.z);
      res += exp(-10. * abs(dot(p, c)));
  }
  return res / 2.0;

}

vec3 pal( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d )
{
  return a + b*cos( 6.28318*(c*t+d) );
}

vec3 raymarch(vec3 ro, vec3 rd) {

  float t = 4.0;
  vec3 col = vec3(0);
  float c = 0.;
  for (int i = 0; i < 64; i++) 
  {
      t += 0.02 * exp(-1.0 * c);
      c = map(ro + t * rd);
      col = 0.98 * col + 0.08 * vec3(c * c, c, c * c * c);
      col = 0.98 * col + 0.08 * vec3(c * c * c, c * c, c);
      col = 0.98 * col + 0.08 * vec3(c, c * c * c, c * c);
      col += c*c*c*c*pal((2.0*c*c)/5.0 + 0.1 + 0.2*sin(iTime / 5.0), vec3(0.8,0.5,0.4),vec3(0.2,0.4,0.2),vec3(2.0,1.0,1.0),vec3(0.0,0.25,0.25) );
  }
  return col;

}


void main() {

  vec2 vUv = fragCoord.xy / iResolution.xy;
  vec2 uv = ((vUv - 0.5) * 2.0) * vec2(1.0, 1.0);

  vec2 p = uv;//(vUv.xy - iResolution / 2.0) / (iResolution.y);
  vec3 ro = roty(vec3(3.), iTime * 0.3 + 0.2);
  vec3 uu = normalize(cross(ro, vec3(0.0, 1.0, 0.0)));
  vec3 vv = normalize(cross(uu, ro));
  vec3 rd = normalize(p.x * uu + p.y * vv - ro * 0.3);
  fragColor.rgb = 0.5 * log(1.0 + raymarch(ro, rd));
  fragColor.a = 1.0;

}
  `
)

extend({ ShimmeringMaterial })

type ShimmeringMaterialImpl = {
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
      shimmeringMaterial: ShimmeringMaterialImpl
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
      <shimmeringMaterial
        key={ShimmeringMaterial.key}
        ref={ref}
        iTime={0}
        fftBars={bars}
        scopeX={scopeX}
        scopeY={scopeY}
        iResolution={[size.width, size.height]}
      ></shimmeringMaterial>
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
