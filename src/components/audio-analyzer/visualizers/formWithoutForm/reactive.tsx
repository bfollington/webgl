import { Billboard, Box, Plane, ScreenQuad, shaderMaterial } from '@react-three/drei'
import { extend, useFrame, useThree } from '@react-three/fiber'
import React, { useMemo } from 'react'
import * as THREE from 'three'
import { ShaderMaterial } from 'three'
import WebcamTexture from '../../../webcam/texture'
import { useFFTData, useScopeDataX, useScopeDataY } from '../../appState'
import { VisualProps } from '../common'

const FormWithoutFormMaterial = shaderMaterial(
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

  // Fork of "Knot de pedrinhas " by Elsio. https://shadertoy.com/view/ddlcW2
// 2023-06-20 02:29:51

#define MAX_STEPS 100
#define MAX_DIST 100.0
#define EPS 0.01
#define _2PI 6.28318530718/9.
#define PI atan(0., -1.)
#define TIME (iTime/7.0)


float luma(in vec4 color) {
    return dot(color.rgb, vec3(0.299, 0.587, 0.114));
}

float dither4x4(in vec2 position, in float brightness) {
    int x = int(mod(position.x, 4.0));
	int y = int(mod(position.y, 4.0));
	int index = x + y * 4;
	float limit = 0.0;

	if (x < 8) {
		if (index == 0) limit = 0.0625;
		if (index == 1) limit = 0.5625;
    	if (index == 2) limit = 0.1875;
    	if (index == 3) limit = 0.6875;
    	if (index == 4) limit = 0.8125;
    	if (index == 5) limit = 0.3125;
    	if (index == 6) limit = 0.9375;
    	if (index == 7) limit = 0.4375;
    	if (index == 8) limit = 0.25;
    	if (index == 9) limit = 0.75;
    	if (index == 10) limit = 0.125;
    	if (index == 11) limit = 0.625;
    	if (index == 12) limit = 1.0;
    	if (index == 13) limit = 0.5;
    	if (index == 14) limit = 0.875;
    	if (index == 15) limit = 0.375;
        limit *= 0.75;
  }

  return brightness < limit ? 0.0 : 1.0;
}

vec4 dither4x4(in vec2 position, in vec4 color) {
	return vec4(color.rgb * dither4x4(position, luma(color)), 1.0);
}


float sdBola(vec3 p) {

    float r = .5*length(p.xy);
    float a = mod(atan(p.y, p.x) + cos(TIME) * 1., _2PI) - _2PI / 2.;
    float b = 5.*cos(TIME) * atan(p.y, p.x);
    
    p.xy = r * vec2(cos(a), sin(a));
    p.x -= 1.;

    p.xz = cos(b) * p.xz + sin(TIME/1.3 + b) * vec2(-p.z, p.x);
    p.x = abs(p.x) - .8*abs(0.1 + sin(TIME + 3.*r)); 

    return length(p)*(0.2+abs(cos(TIME/10.)+sin(TIME/4.12))) - .3*abs(sin(5.*r + TIME/1.5));
}


vec2 rot(vec2 p, float ang){
    float c = cos(ang);
    float s = sin(ang);
    return p * mat2(c,s,-s,c);
}


float map(vec3 p) {
    vec3 bola = vec3(0, 1, 5);
    return min(2., sdBola(p - bola));
}


float rayMarch(vec3 ro, vec3 rd){
    float t = 0.;
    for(int i = 0; i < MAX_STEPS; i++){
        float step = map(ro + t * rd);
        t += step;
        if(t > MAX_DIST || step < EPS) break;
    }
    return t;
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
    vec3 lightPos = vec3(4, 15, 1);
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
    vec2 uv = (fragCoord.xy - .5 * iResolution.xy) / iResolution.y;
    float noise = (fract(TIME + sin(dot(uv, vec2(12.9898,78.233)*2.0)) * 43758.5453));
    
    vec3 ro = vec3(0, 1, 0);
    vec3 rd = normalize(vec3(uv, 1.));
    
    float t = rayMarch(ro, rd);
    
    vec3 pos = ro + rd * t;
    vec3 shad = vec3(shadow(pos));

    vec3 col;
    vec3 e = vec3(1.);
    col = pal(shad.y, e, e, e, 0.35 * vec3(0.,0.33,0.66));
    
	col = 1.1 * shad * shad * col + 0.1 * col;
    col = pow(col * .9, vec3(3, 2.5, 2.2) * .2);
    col = mix(col, shad, .3);
    col = col * .8- .5 * length(uv);
    //col = pow( col, vec3(0.4545) );
    
    if (t >= MAX_DIST) {
        fragColor = vec4(vec3(0.), 1.0);
        return;
    }
    
        
    
    //col += noise / 10.;
    
    fragColor = vec4(col, 1.);
    //fragColor = dither4x4(fragCoord / 2., fragColor);
}
  `
)

extend({ FormWithoutFormMaterial })

type FormWithoutFormMaterialImpl = {
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
      formWithoutFormMaterial: FormWithoutFormMaterialImpl
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
      <formWithoutFormMaterial
        key={FormWithoutFormMaterial.key}
        ref={ref}
        iTime={0}
        fftBars={bars}
        scopeX={scopeX}
        scopeY={scopeY}
        iResolution={[size.width, size.height]}
      ></formWithoutFormMaterial>
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
