import { Billboard, Box, Plane, ScreenQuad, shaderMaterial } from '@react-three/drei'
import { extend, useFrame, useThree } from '@react-three/fiber'
import React, { useMemo } from 'react'
import * as THREE from 'three'
import { ShaderMaterial } from 'three'
import WebcamTexture from '../../../webcam/texture'
import { useFFTData, useScopeDataX, useScopeDataY } from '../../appState'
import { VisualProps } from '../common'

const SpiralsMaterial = shaderMaterial(
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

  varying vec2 vUv;

  #define res iResolution.xy
  #define rot(a) mat2 (cos(a), sin(a), -sin(a), cos(a))
  #define PI atan(.0, -1.)

  // standard GLSL 3D simplex noise
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
float simplex(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0);
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 =   v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1. + 3.0 * C.xxx;
  i = mod(i, 289.0); 
  vec4 p = permute(permute(permute(i.z+vec4(0,i1.z,i2.z,1))+i.y+vec4(0,i1.y,i2.y,1))+i.x+vec4(0,i1.x,i2.x,1));
  float n_ = 1.0/7.0;
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = 1.0/sqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
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
    // vec2 u = vUv * 512.;
    vec2 u = gl_FragCoord.xy * .5;
    float T = iTime / 10. + 67.4;
    vec2 R = iResolution.xy;
    float xr = -1.+(3.14159/2.0)*0.0;
    
    float Z = 0.+abs(0.5*cos(T))+abs(0.25*sin(cos(T / 1.33))); // good slider param
    float Y = 0.8; // good slider, camera movement rotation
    float X = 2.0; // translation
    float W = .01;
    float Q = 4.;
    float blowout = 1.0; // 1.0
    
    float col = 0.0;
    for(int i = 0; i < 20; i++)
    {
        // coordinates
        vec2 uv = (2.0*gl_FragCoord.xy - R) / R.y;
        
        // 3d projection
    	vec3 u3 = vec3(uv, 5.0)*mat3(1,0,0,0,cos(xr), -sin(xr), 0,sin(xr), cos(xr));
    	u3.y -= 3.5;
    	uv.x = (u3.x*R.x)/(u3.z*R.x)*2.5;
    	uv.y = (u3.y*R.y)/(u3.z*R.y)*sqrt(R.x/R.y)*2.5;
        
        float scale = 1.0+3.0*pow(0.5+0.5*cos(T*0.41),2.0);
        uv *= pow(1.002+mix(0.03, 0.0, scale/10.0), float(i));
        float rf = length(fwidth(uv*vec2(R.y/R.x,blowout)));
        
        uv += X;
        
        // rotate
        float a = (T)*Y;
        uv *= mat2(cos(a),sin(a),-sin(a),cos(a));

        // zoom
        uv *= scale;

        // repeat & pattern
        float repeat = (Z)+1.25*(0.5+0.5*sin(1.0+T*0.61));
        float r = pow(max(0.0, 0.5+0.5*simplex(vec3( round(0.5+uv/repeat)*(1.0/scale), 0.05*float(i)+T*0.77))),3.0);
        uv = mod(uv,repeat)-repeat/2.0 + vec2(0.5*cos(-T * 3.5 + 0.3449), -0.5*sin(T * 4.))*cos(T);

        float aa = W+Q*scale*rf*sqrt(r);
        
        // circle equation, uv.x^2 + uv.y^2
        float shape = dot(uv + 0.1+vec2(sin(T), cos(T)),uv);
        // extract outline
        float circle = 1.0-smoothstep(0.0, aa, abs(shape-r));
        col += circle*pow((1.0+.1*sin(T+u3.x+u3.y+u3.z))-smoothstep(0.0,20., float(i)), 2.0);
    }
    
    vec3 c = vec3(1.) - colormap(1. - col);
    gl_FragColor = vec4(pow(col*0.5, 1.0/2.2));
    gl_FragColor = vec4(c, 1.0);
  }
  `
)

extend({ SpiralsMaterial })

type SpiralsMaterialImpl = {
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
      spiralsMaterial: SpiralsMaterialImpl
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
      ref.current.uniforms.iTime.value =
        (Date.now() % 1000000) / 1000.0 +
        0.2 * Math.sin((bars[8] + bars[16] + bars[24] + bars[32] + bars[48]) * 0.2)
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
    <ScreenQuad ref={boxRef}>
      <spiralsMaterial
        key={SpiralsMaterial.key}
        ref={ref}
        iTime={0}
        fftBars={bars}
        scopeX={scopeX}
        scopeY={scopeY}
        iResolution={[size.width, size.height]}
      ></spiralsMaterial>
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
