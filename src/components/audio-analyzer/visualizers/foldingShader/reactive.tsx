import { Billboard, Box, Plane, ScreenQuad, shaderMaterial } from '@react-three/drei'
import { extend, useFrame, useThree } from '@react-three/fiber'
import React from 'react'
import * as THREE from 'three'
import { ShaderMaterial } from 'three'
import WebcamTexture from '../../../webcam/texture'
import { useFFTData, useScopeDataX, useScopeDataY } from '../../appState'
import { VisualProps } from '../common'

const FoldingMaterial = shaderMaterial(
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
    }
  `,
  `
  uniform float iTime;
  uniform float fftBars[121];
  uniform float scopeX[121];
  uniform float scopeY[121];
  uniform vec2 iResolution;

  varying vec2 vUv;

  #define res iResolution.xy
  #define rot(a) mat2 (cos(a), sin(a), -sin(a), cos(a))
  #define PI atan(.0, -1.)
  #define T iTime * .1

  float shape(vec2 p){
    float amp = fftBars[int(floor(p.x - 0.5 + p.y - 0.5) * 0.1)];
    float sx = scopeX[int(floor((p.x) * .1))];
    float sy = scopeY[int(floor((p.y) * .1))];

    p *= 0.01 + (0.1 * sin(T));
    
    float i, f, 
          s = .5,
          t = 2. + .5 * (sx + sy);
          
    while(i++ < 3.) {
        t += s * (cos(p.x) + sin(p.y));
        p *= rot(T);
        p += t * (3.);
        s *= 0.8;
    }
    return t;
  }

  float map_range(float inp, float inp_start, float inp_end, float out_start, float out_end)
  {
      return out_start + ((out_end - out_start) / (inp_end - inp_start)) * (inp - inp_start);
  }

  float map_range_clamp(float inp, float inp_start, float inp_end, float out_start, float out_end)
  {
      float t = clamp((inp - inp_start) / (inp_end - inp_start), 0.0, 1.0);
      float v = out_start + t * (out_end - out_start);
      return v;
  }


  vec3 colormap(float x)
  {
      vec3 c = vec3(1.0);
      c = mix(c, 1.2 * vec3(0.3, 0.5, 0.8), map_range_clamp(x, -1.0, -0.6, 0.0, 1.0));
      c = mix(c, 1.2 * vec3(0.1, 0.02, 0.4), map_range_clamp(x, -0.6, -0.25, 0.0, 1.0));
      c = mix(c, vec3(0.0), map_range_clamp(x, -0.25, 0.0, 0.0, 1.0));
      c = mix(c, 1.2 * vec3(0.4, 0.1, 0.02), map_range_clamp(x, 0.0, 0.25, 0.0, 1.0));
      c = mix(c, 1.2 * vec3(0.8, 0.5, 0.3), map_range_clamp(x, 0.25, 0.6, 0.0, 1.0));
      c = mix(c, vec3(1.0), map_range_clamp(x, 0.6, 1.0, 0.0, 1.0));
      
      c = pow(c, vec3(1.8));
      c += vec3(0.03, 0.0, 0.02);
      
      return c;
  }

  void main() {
    // vec2 uv = vUv;
    vec2 u = gl_FragCoord.xy;
    vec4 O = gl_FragColor;

    vec2 uv = vec2(3, 2) * (u - .5 * res) / res.y;
    
    vec3 cw, cu, cv, rd, ba;
    vec3 ro, ta;

    float vol = fftBars[32];
    ro = vec3(cos(T) * 255. + 100. * fftBars[8] - 50., 750. - 250. * fftBars[40], sin(T) * 100. +500. + 100. * fftBars[32]);
    ta = vec3(0);
    
    ba = ta - ro;
    cw = normalize(ba);
    cu = cross(cw, vec3(0, 1, 0));
    cv = normalize(cross(cu, ba));

    rd = normalize(
        uv.x * cu + uv.y * cv + 2.* normalize(cw)
    );
    
    ro.xz *= rot(T);
    rd.xz *= rot(T);

    vec3 p;
    float h, i, t, s;
    while(i++ < 150.) {
        p = ro + t * rd;
        s = shape(p.xz);
        h =  p.y - s * 100.;

        if(h < .1 * t) break;
        t += h * .02;
    }
    
    float amp = fftBars[int(floor((p.x - p.y) * 0.1) - 32.)] + 0.25 * sin(T);
    float d =  1. - exp(-.0000049 * t * t) * (2.);
    //O = vec4(colormap(d), 1.);
    vec3 c = colormap(d);
    O = vec4(c, 1.);
    O = 1. -vec4(pow(O.xyz,vec3(1./2.2)),1.0);



    float pct = abs(sin(iTime));
    float sx = scopeX[int(floor((uv.x) * 64.0))];
    float sy = scopeY[int(floor((uv.y) * 64.0))];
    gl_FragColor = O;
    // #include <tonemapping_fragment>
    // #include <encodings_fragment>
  }
  `
)

extend({ FoldingMaterial })

type FoldingMaterialImpl = {
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
      foldingMaterial: FoldingMaterialImpl
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
      ref.current.uniforms.iTime.value = state.clock.elapsedTime
      ref.current.uniforms.fftBars.value = bars
      ref.current.uniforms.scopeX.value = scopeX
      ref.current.uniforms.scopeY.value = scopeY
    }

    // if (!boxRef.current) {
    //   return
    // } else {
    //   boxRef.current.scale.x = 1 + bars[0] * 0.5
    //   boxRef.current.scale.y = 1 + bars[1] * 0.5
    //   boxRef.current.scale.z = 1 + bars[2] * 0.5
    // }
  })

  return (
    <ScreenQuad ref={boxRef}>
      <foldingMaterial
        key={FoldingMaterial.key}
        ref={ref}
        iTime={0}
        fftBars={bars}
        scopeX={scopeX}
        scopeY={scopeY}
        iResolution={[size.width, size.height]}
      ></foldingMaterial>
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
