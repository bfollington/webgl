import { Billboard, Box, Plane, ScreenQuad, shaderMaterial } from '@react-three/drei'
import { extend, useFrame, useThree } from '@react-three/fiber'
import React, { useMemo } from 'react'
import * as THREE from 'three'
import { ShaderMaterial } from 'three'
import WebcamTexture from '../../../webcam/texture'
import { useFFTData, useScopeDataX, useScopeDataY } from '../../appState'
import { VisualProps } from '../common'

const ChainzMaterial = shaderMaterial(
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

  // Fork of "Baguete " by Elsio. https://shadertoy.com/view/DtjfR3
  // 2023-09-11 07:00:06
  
  #define R iResolution.xy
  #define rot(a) mat2 (cos(a), sin(a), -sin(a), cos(a))
  #define wmod(s, w) mod(s ,w) - w/2.
  
  #define PI 3.1415
  #define T  iTime * 1.
  #define torus(p) length(vec2(length(p.xz) - .3, p.y)) - .08
  
  /*    relateds
          https://www.shadertoy.com/view/ml2fRV 
          https://www.shadertoy.com/view/mlBBzK
          https://www.shadertoy.com/view/ctSfRV *
          https://www.shadertoy.com/view/dtSfRc
          https://www.shadertoy.com/view/DlffD4
          https://www.shadertoy.com/view/DlXfzj
      
  */ 
  
  
  vec2 path(float z) {
      return 1. * vec2(
          sin(cos(z * .3)), 
          cos(z * .5) 
      );
  }
  
  vec2 path2(float z) {
      return 1.3 * vec2(
          sin(z * .3) + sin(z * 13.3) * .015 , 
          cos(z * .5) + cos(z * 17.5) * .015
      );
  }
  
  vec3 cor; 
  
  float chain(vec3 p){
      p.z = 1. * p.z;
      p.z -= 4. * T;
  
      vec3 q = p;
      q.xy *= rot(PI/2.);
      q.z = fract(p.z + .5) - .5;
      p.z = fract(p.z) - .5;
      
      return min(torus(p), torus(q));
  }
  
  
  
  float cabos(vec3 p){
      p.z += T;
      p.xy -= path(p.z) - path(T);
      // 
          float ss = 1.5;
          float s = 1.;
  
          mat2 rotate = ss * rot(.5 * p.z);
  
          float i = 0., d = 100.;
          while(i++ < 2.){
              p.xy = abs(p.xy * rotate) - s;
              s /= ss;
              
              float c = chain(p) * s;
              if (c < d){
                  d = c;
                  cor = vec3(.7) * (.125 * i + .2);
              }
          }
          
          return d;
  }
  
  float map(vec3 p){
      float c = cabos(p);
      
      
      p.z += T;
      p.xy -= path2(p.z) - path(T);
      
      
      // baguete
      //float z = p.z * .1;
      //p.z = (p.z - T + cos(.1 * T) * 13.7) * .06;
      //p.y += .4; 
      
      
      
      float d = length(p) - .2;
      float ret = min(c, d);
      if (ret == d) cor = vec3(.4,.3,0);
      
      
      return ret;
  }
  
  vec3 normal(vec3 p) {
    float d = map(p);
      vec2 e = vec2(.01, 0);
      
      vec3 n = d - vec3(
          map(p-e.xyy),
          map(p-e.yxy),
          map(p-e.yyx));
      
      return normalize(n);
  }
  
  float shadow(vec3 p) {
      vec3 lightPos = vec3(-4.*sin(iTime), 15
      , 1);
      vec3 l = normalize(lightPos - p);
      return dot(normal(p), l);
  }
  
  vec3 palette( in float t )
  {
      vec3 col = vec3(0.4,0.4,0.4);
      col += 0.12*cos(6.28318*t*  1.0+vec3(0.0,0.8,1.1));
      col += 0.11*cos(6.28318*t*  3.1+vec3(0.3,0.4,0.1));
      col += 0.10*cos(6.28318*t*  5.1+vec3(0.1,0.7,1.1));
      col += 0.09*cos(6.28318*t*  9.1+vec3(0.2,0.8,1.4));
      col += 0.08*cos(6.28318*t* 17.1+vec3(0.2,0.6,0.7));
      col += 0.07*cos(6.28318*t* 31.1+vec3(0.1,0.6,0.7));
      col += 0.06*cos(6.28318*t* 65.1+vec3(0.0,0.5,0.8));
      col += 0.06*cos(6.28318*t*115.1+vec3(0.1,0.4,0.7));
      col += 0.09*cos(6.28318*t*265.1+vec3(1.1,1.4,2.7));
      return col;
  }
  
  vec3 pal( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d )
  {
      return a + b*cos( 6.28318*(c*t+d) );
  }
  
  
  
  void main(){
      vec4 O = gl_FragColor;
      vec2 u = gl_FragCoord.xy;

      // resolution
      vec2 uv = (u - .5 * R)/R.y;
  
      // camera
      vec3 ro = vec3(0, 0, -1),
           rd = normalize(vec3(uv, 1));
           
      // raymarch
      float s, i, d, far = 60.;
      while(i++ < 200.) {
          s = map(ro + d * rd);
          d += s * .5;
          if(d > far || s < .001) break;
      }
  
      vec3 col;
      if(d < far){
          // normal
          vec2 e = vec2(.01, 0);
          vec3 p = ro + rd * d,
               n = normalize(
                   map(p) - vec3(
                       map(p-e.xyy), 
                       map(p-e.yxy),
                       map(p-e.yyx)));
                       
          vec3 shad = vec3(shadow(p));
          
          vec3 q = vec3(1.);
          col = pal(shad.y, q, q, q, 0.35 * vec3(0.,0.33,0.66));
      
          col = 1.1 * shad * shad * col + 0.1 * col;
          col = pow(col * .9, vec3(3, 2.5, 2.2) * .2);
          col = mix(col, shad, .3);
          col -= pow(d, 2.) / 255.;
          col = col * .8- .5 * length(uv);
          
  
          // colors
          //col = cor;
          //col *= -dot(reflect(n, rd), n) *.6 + 1.1;
          //col = pow(col * .2, vec3(.88)) * 8. - .4;
      } 
      
      else{
          col = vec3(0);
      }
  
      O = vec4(col, 1);
      gl_FragColor = O;
  }
  `
)

extend({ ChainzMaterial })

type ChainzMaterialImpl = {
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
      chainzMaterial: ChainzMaterialImpl
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
      <chainzMaterial
        key={ChainzMaterial.key}
        ref={ref}
        iTime={0}
        fftBars={bars}
        scopeX={scopeX}
        scopeY={scopeY}
        iResolution={[size.width, size.height]}
      ></chainzMaterial>
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
