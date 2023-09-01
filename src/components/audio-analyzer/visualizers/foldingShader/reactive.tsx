import { Box, Plane, shaderMaterial } from '@react-three/drei'
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
  uniform float iTime;
  uniform float fftBars[121];
  uniform float scopeX[121];
  uniform float scopeY[121];
  uniform vec2 iResolution;
  uniform sampler2D map;

  varying vec2 vUv;

  #define res iResolution.xy
  #define rot(a) mat2 (cos(a), sin(a), -sin(a), cos(a))
  #define PI atan(.0, -1.)
  #define T iTime * .1

  float shape(vec2 p){
    p *= .04 * sin(T);
    
    float i, f, 
          s = .5,
          t = 2.;
          
    while(i++ < 4.) {
        t += s * (2.*cos(p.x * 1.) + sin(1. * p.y));
        p *= rot(T);
        p += t * 3.;
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

    ro = vec3(420., 970., 500.);
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
    while(i++ < 200.) {
        p = ro + t * rd;
        s = shape(p.xz);
        h =  p.y - s * 100.;

        if(h < .1 * t) break;
        t += h * .02;
    }
    
    float d =  1. - exp(-.0000049 * t * t) * 3.;
    //O = vec4(colormap(d), 1.);
    vec3 c = colormap(d);
    O = vec4(c, 1.);
    O = 1. -vec4(pow(O.xyz,vec3(1./2.2)),1.0);



    float pct = abs(sin(iTime));
    float amp = fftBars[int(floor((uv.x) * 64.0))];
    float sx = scopeX[int(floor((uv.x) * 64.0))];
    float sy = scopeY[int(floor((uv.y) * 64.0))];
    vec4 tex = texture2D(map, uv);
    vec3 color = vec3(sx+sy+tex.x, sx-sy+tex.y, amp+tex.z);
    vec3 colorA = vec3(amp,0.141,0.912);
    vec3 colorB = vec3(1.000,amp,0.224);
    // color = mix(color, tex, pct);
    gl_FragColor = vec4(color*amp,1.0);
    gl_FragColor = O;
    // gl_FragColor = tex;
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

    if (!boxRef.current) {
      return
    } else {
      boxRef.current.scale.x = 1 + bars[0] * 0.5
      boxRef.current.scale.y = 1 + bars[1] * 0.5
      boxRef.current.scale.z = 1 + bars[2] * 0.5
    }
  })

  return (
    <Plane ref={boxRef}>
      <foldingMaterial
        key={FoldingMaterial.key}
        ref={ref}
        iTime={0}
        fftBars={bars}
        scopeX={scopeX}
        scopeY={scopeY}
        iResolution={[size.width, size.height]}
      >
        <WebcamTexture />
      </foldingMaterial>
    </Plane>
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
