import { Billboard, Box, Plane, ScreenQuad, shaderMaterial } from '@react-three/drei'
import { extend, useFrame, useThree } from '@react-three/fiber'
import React, { useMemo } from 'react'
import * as THREE from 'three'
import { ShaderMaterial } from 'three'
import WebcamTexture from '../../../webcam/texture'
import { useFFTData, useScopeDataX, useScopeDataY } from '../../appState'
import { VisualProps } from '../common'

const AlienWaterMaterial = shaderMaterial(
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

  // Fork of "magic curtain 3" by vivavolt. https://shadertoy.com/view/dslXzf
// 2022-11-25 04:51:03

#define alpha (1.+.5*sin(iTime / 100. + 1.))
#define beta (1.+.5*cos(iTime / 250. + 2.))
#define gamma (1.+.5*cos(sin(iTime / 1000. + 2.)))

#define t (iTime / 5. + 1.)

mat2 move(in float a) {
    float c = cos(a);
    float s = sin(a);
    return mat2(c, -s, s, -c);
}

float map(in vec3 st) {
    st.xy *= move(t * (0.2 + 0.2 * alpha));
    st.xz *= move(t * (0.2 + 0.2 * beta));
    vec3 p = st * (.2*sin(t / 10. * alpha) + 8. + 3.*beta) * 2.0 + t;
    return length(st + vec3(sin(cos(t * 0.5 * gamma)))) + sin(p.x + sin(cos(p.y) + cos(p.z)*gamma)) * 0.5 - 2.0;
}

const float noiseSizeCoeff = 0.61; // Bigger => larger glitter spots
const float noiseDensity = 53.0;  // Bigger => larger glitter spots


vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
     return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v)
  { 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  // First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

  // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //   x0 = x0 - 0.0 + 0.0 * C.xxx;
  //   x1 = x0 - i1  + 1.0 * C.xxx;
  //   x2 = x0 - i2  + 2.0 * C.xxx;
  //   x3 = x0 - 1.0 + 3.0 * C.xxx;
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
  vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

  // Permutations
  i = mod289(i); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  // Gradients: 7x7 points over a square, mapped onto an octahedron.
  // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
  float n_ = 0.142857142857; // 1.0/7.0
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  // Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix final noise value
  vec4 m = max(noiseSizeCoeff - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return noiseDensity * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}


float softLight( float s, float d )
{
	return (s < 0.5) ? d - (1.0 - 2.0 * s) * d * (1.0 - d) 
		: (d < 0.25) ? d + (2.0 * s - 1.0) * d * ((16.0 * d - 12.0) * d + 3.0) 
					 : d + (2.0 * s - 1.0) * (sqrt(d) - d);
}

vec3 softLight( vec3 s, vec3 d )
{
	vec3 c;
	c.x = softLight(s.x,d.x);
	c.y = softLight(s.y,d.y);
	c.z = softLight(s.z,d.z);
	return c;
}

float hardLight( float s, float d )
{
	return (s < 0.5) ? 2.0 * s * d : 1.0 - 2.0 * (1.0 - s) * (1.0 - d);
}

vec3 hardLight( vec3 s, vec3 d )
{
	vec3 c;
	c.x = hardLight(s.x,d.x);
	c.y = hardLight(s.y,d.y);
	c.z = hardLight(s.z,d.z);
	return c;
}

float vividLight( float s, float d )
{
	return (s < 0.5) ? 1.0 - (1.0 - d) / (2.0 * s) : d / (2.0 * (1.0 - s));
}

vec3 vividLight( vec3 s, vec3 d )
{
	vec3 c;
	c.x = vividLight(s.x,d.x);
	c.y = vividLight(s.y,d.y);
	c.z = vividLight(s.z,d.z);
	return c;
}

vec3 linearLight( vec3 s, vec3 d )
{
	return 2.0 * s + d - 1.0;
}

float pinLight( float s, float d )
{
	return (2.0 * s - 1.0 > d) ? 2.0 * s - 1.0 : (s < 0.5 * d) ? 2.0 * s : d;
}

vec3 pinLight( vec3 s, vec3 d )
{
	vec3 c;
	c.x = pinLight(s.x,d.x);
	c.y = pinLight(s.y,d.y);
	c.z = pinLight(s.z,d.z);
	return c;
}

float vignette(vec2 uv) {
    uv *=  1.0 - uv.yx;   //vec2(1.0)- uv.yx; -> 1.-u.yx; Thanks FabriceNeyret !
    
    float vig = uv.x*uv.y * 15.0; // multiply with sth for intensity
    
    vig = pow(vig, 0.25); // change pow for modifying the extend of the  vignette
    return vig;
}

vec3 pixel(vec2 p) {
    vec2 st = p / iResolution.xy - vec2(1.0, 0.5);

    vec3 col = vec3(beta, gamma, alpha);
    float dist = 2.5;

    for (int i = 0; i <= 3; i++) {
        vec3 st = vec3(0.0, 0.0, beta) + normalize(vec3(st, -1.0)) * dist;
        float rz = map(st);
        float f = clamp((rz - map(st + 0.1)) * 0.5, -0.5, 1.0);
        vec3 l = vec3(0.1588235294*alpha, 0.1254901961*beta, 0.349019608*gamma) + vec3(4.0, 2.5, 2.5) * f;
        col = col * l + smoothstep(5.0, 2.0, rz) * 0.4 * l;
        dist += min(rz, t);
    }
    
    return col;
}

vec3 blur9(vec2 p, vec2 resolution, vec2 direction) {
  vec3 color = vec3(0.0);
  vec2 off1 = vec2(1.3846153846) * direction;
  vec2 off2 = vec2(3.2307692308) * direction;
  color += pixel(p) * 0.2270270270;
  color += pixel(p + (off1 / resolution)) * 0.3162162162;
  color += pixel(p - (off1 / resolution)) * 0.3162162162;
  color += pixel(p + (off2 / resolution)) * 0.0702702703;
  color += pixel(p - (off2 / resolution)) * 0.0702702703;
  return color;
}


void main() {    
    vec3 col = blur9(fragCoord.xy, iResolution.xy, vec2(255., 255.));
    fragColor = vec4(col,1.0);
    
    vec2 uv = fragCoord.xy / iResolution.xy;
    float vig = vignette(uv / 2.);
 
    float fadeLR = .7 - abs(uv.x - .4);
    float fadeTB = 1.1 - uv.y;
    vec3 pos = vec3(uv * vec2( 3. , 1.) - vec2(0., iTime * .00005), iTime * .006);
   
    float n = fadeLR * fadeTB * smoothstep(.50, 1.0, snoise(t + pos * iResolution.y / 10.)) * 8.;
  
    // a bunch of constants here to shift the black-white of the noise to a greyer tone
    vec3 noiseGreyShifted = min((vec3(n) + 1.) / 3. + .3, vec3(1.)) * .91;
    
    
    vec3 mixed = col.xyz;
    //mixed = softLight(noiseGreyShifted, s);
    //mixed = mix(col.xyz, hardLight(noiseGreyShifted, col.xyz), .2);
    mixed = mix(col.xyz, vividLight(noiseGreyShifted, col.xyz), .02);
    
    fragColor = vec4(mixed, 1.0);
    
    float k = (sin(t / 1.0) + 1.0)/4.0 + 0.75;
   
    #define heartoffset vec2(sin(uv.x + iTime)*10., cos(uv.x * 10. + 0.01*sin(iTime) + iTime)*15.*(1.5-uv.y)*0.4)
    #define heartcoord fract(((fragCoord.xy + heartoffset) - iResolution.xy/2.) / cellsize)
    
    //vec3 col = vec3(0.2588235294, 0.1254901961, 0.2549019608);

    
    // Add a bit of shading to make things seem more 3-dimensional
    fragColor -= (heartoffset.y + heartoffset.x) * 0.01 * k * (1.-uv.y)*0.4;
    // fragColor -= vec4((1.-uv.y)*0.1*k,0,0,1.);
    fragColor -= (vec4(uv.y, uv.y * 0.8, uv.y, 1.)) / 8.0;
    fragColor = mix(vec4(vec3(0.), 1.), fragColor, vig);

    // fragColor = vec4( uv.x, uv.y, 0.0, 1.0 );
}
  `
)

extend({ AlienWaterMaterial })

type AlienWaterMaterialImpl = {
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
      alienWaterMaterial: AlienWaterMaterialImpl
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
      <alienWaterMaterial
        key={AlienWaterMaterial.key}
        ref={ref}
        iTime={0}
        fftBars={bars}
        scopeX={scopeX}
        scopeY={scopeY}
        iResolution={[size.width, size.height]}
      ></alienWaterMaterial>
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
