import { Billboard, Box, Plane, ScreenQuad, shaderMaterial } from '@react-three/drei'
import { extend, useFrame, useThree } from '@react-three/fiber'
import React, { useMemo } from 'react'
import * as THREE from 'three'
import { ShaderMaterial } from 'three'
import WebcamTexture from '../../../webcam/texture'
import { useFFTData, useScopeDataX, useScopeDataY } from '../../appState'
import { VisualProps } from '../common'

const TwoDirectionsMaterial = shaderMaterial(
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

  // Fork of "Little Fibonacci Sphere" by Xor. https://shadertoy.com/view/7tVSDh
// 2022-12-23 07:29:48

//twigl: https://t.co/Eqa9WrS2Yg
//tweet: https://twitter.com/XorDev/status/1475524322785640455

//Thanks to Fabrice for some tricks and ideas.
void main()
{
    //Clear base color.
    vec4 O = vec4(vec3(0.), 1.);
    vec2 I = fragCoord.xy;
    
    //Iterate though 400 points and add them to the output color.
    for(float i=-1.; i<1.; i+=9e-3)
    {
        vec2 r = iResolution.xy, //A shortened resolution variable, because we use it twice.
        p = cos(i*sin(iTime / 100. +10.)*2e2+iTime+vec2(0., 11.))*sqrt(1.-i*i);  //Rotate and scale xy coordinates.
        O += (cos(i+vec4(3,3,3,3))+1.)*(1.-p.y) /      //Color and brightness.
        dot(p=(I+I-r)/r.y+vec2(p.x,i)/(p.y+1.+1.*sin(iTime / 10.)),p)/1e4; //Project light point.
    }

    fragColor = O;
}

  `
)

extend({ TwoDirectionsMaterial })

type TwoDirectionsMaterialImpl = {
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
      twoDirectionsMaterial: TwoDirectionsMaterialImpl
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
      <twoDirectionsMaterial
        key={TwoDirectionsMaterial.key}
        ref={ref}
        iTime={0}
        fftBars={bars}
        scopeX={scopeX}
        scopeY={scopeY}
        iResolution={[size.width, size.height]}
      ></twoDirectionsMaterial>
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
