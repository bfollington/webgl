import { Billboard, Box, Plane, ScreenQuad, shaderMaterial } from '@react-three/drei'
import { extend, useFrame, useThree } from '@react-three/fiber'
import React, { useMemo } from 'react'
import * as THREE from 'three'
import { ShaderMaterial } from 'three'
import WebcamTexture from '../../../webcam/texture'
import { useFFTData, useScopeDataX, useScopeDataY } from '../../appState'
import { VisualProps } from '../common'

const IntoTheDrinkMaterial = shaderMaterial(
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

  // Fork of "Rainier mood" by Zavie. https://shadertoy.com/view/ldfyzl
// 2023-09-04 04:29:47

/*

A quick experiment with rain drop ripples.

This effect was written for and used in the launch scene of the
64kB intro "H - Immersion", by Ctrl-Alt-Test.

 > http://www.ctrl-alt-test.fr/productions/h-immersion/
 > https://www.youtube.com/watch?v=27PN1SsXbjM

-- 
Zavie / Ctrl-Alt-Test

*/

// Maximum number of cells a ripple can cross.
#define MAX_RADIUS 2

// Set to 1 to hash twice. Slower, but less patterns.
#define DOUBLE_HASH 0

// Hash functions shamefully stolen from:
// https://www.shadertoy.com/view/4djSRW
#define HASHSCALE1 .1031
#define HASHSCALE3 vec3(.1031, .1030, .0973)

float hash12(vec2 p)
{
	vec3 p3  = fract(vec3(p.xyx) * HASHSCALE1);
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p)
{
	vec3 p3 = fract(vec3(p.xyx) * HASHSCALE3);
    p3 += dot(p3, p3.yzx+19.19);
    return fract((p3.xx+p3.yz)*p3.zy);

}

float map(vec2 p) {
    return length(p) - 0.2;
}

vec3 bg(vec2 coord) {
  return vec3(0.);
    vec2 uv = (coord.xy * 4.0 - iResolution.xy) / min(iResolution.x, iResolution.y);
    vec3 col = vec3(0.0); 
    float time = iTime * 0.1;
    float frequency = 1.0;  // color frequency
    for(float j = 0.0; j < 3.0; j++) {
        for(float i = 1.0; i < 8.0; i++) {
            uv.x += (0.2 / (i + j) * sin(i * cos(time) * 2.0 * uv.y + (time * 0.1) + i * j));
            uv.y += (1.0 / (i + j) * cos(i * 0.6 * uv.x + (time * 0.25) + i * j));
            // motion
            float angle = time * 0.1;
            mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
            uv = rotation * uv;
        }
        vec3 newColor = vec3(
            0.5 * sin(frequency * uv.x + time) + 0.5,
            0.5 * sin(frequency * uv.y + time + 2.0) + 0.5,
            sin(frequency * (uv.x + uv.y) + time + 4.0)
        );
        
newColor = pow(newColor, vec3(2.0));  // sharpnesss
        col += newColor;
    }
        col /= 3.0;
    vec3 bg = vec3(0.0, 0.0, 0.0); //for darkness =)
    col = mix(
        col,
        bg,
        1.0 - smoothstep(0.1, abs(sin(iTime * 0.05) * 3.0), map(uv))
    );
    return col;
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
    //return col;
    
    return (col - vec3(0.2588235294*t, 0.1254901961*t, 0.2549019608*t));
}


float vignette(vec2 uv) {
    uv *=  1.0 - uv.yx;   //vec2(1.0)- uv.yx; -> 1.-u.yx; Thanks FabriceNeyret !
    
    float vig = uv.x*uv.y * 15.0; // multiply with sth for intensity
    
    vig = pow(vig, 0.25); // change pow for modifying the extend of the  vignette
    return vig;
}

void main()
{
    float s = 0.3;
    float resolution = 10. * exp2(-3.*s);
	vec2 uv = fragCoord.xy / iResolution.y * resolution + vec2(sin(cos(iTime / 10.) + 1.23), cos(cos(iTime / 8.) - 0.4));
    vec2 p0 = floor(uv);

    vec2 circles = vec2(0.);
    for (int j = -MAX_RADIUS; j <= MAX_RADIUS; ++j)
    {
        for (int i = -MAX_RADIUS; i <= MAX_RADIUS; ++i)
        {
			vec2 pi = p0 + vec2(i, j);
            #if DOUBLE_HASH
            vec2 hsh = hash22(pi);
            #else
            vec2 hsh = pi;
            #endif
            vec2 p = pi + hash22(hsh);

            float t = fract(0.3*iTime + hash12(hsh));
            vec2 v = p - uv;
            float d = length(v) - (float(MAX_RADIUS) + 1.)*t;

            float h = 1e-3;
            float d1 = d - h;
            float d2 = d + h;
            float p1 = sin(31.*d1) * smoothstep(-.3, -0.3, d1) * smoothstep(0., -0.3, d1);
            float p2 = sin(31.*d2) * smoothstep(-0.6, -0.3, d2) * smoothstep(0., -0.3, d2);
            circles += 0.5 * normalize(v) * ((p2 - p1) / (2. * h) * (1. - t) * (1. - t));
        }
    }
    circles /= float((MAX_RADIUS*2+1)*(MAX_RADIUS*2+1));

    float intensity = mix(0.01, 0.15, smoothstep(0.1, 0.6, abs(fract(0.01*iTime + 0.5)*2.-1.)));
    vec3 n = vec3(circles, sqrt(1. - dot(circles, circles)));
    vec3 base = bg(fragCoord.xy - 10.*intensity*n.xy);
    vec3 color = base.rgb - 5.*pow(clamp(dot(n, normalize(vec3(1., 0.7, 0.5))), 0., 1.), 6.);
    
	fragColor = vec4(palette(pow(color.r * 2., 3.)) / 2., 1.0);
}
  `
)

extend({ IntoTheDrinkMaterial })

type IntoTheDrinkMaterialImpl = {
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
      intoTheDrinkMaterial: IntoTheDrinkMaterialImpl
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
      <intoTheDrinkMaterial
        key={IntoTheDrinkMaterial.key}
        ref={ref}
        iTime={0}
        fftBars={bars}
        scopeX={scopeX}
        scopeY={scopeY}
        iResolution={[size.width, size.height]}
      ></intoTheDrinkMaterial>
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
