import { Billboard, Box, Plane, ScreenQuad, shaderMaterial } from '@react-three/drei'
import { extend, useFrame, useThree } from '@react-three/fiber'
import React, { useMemo } from 'react'
import * as THREE from 'three'
import { ShaderMaterial } from 'three'
import WebcamTexture from '../../../webcam/texture'
import { useFFTData, useScopeDataX, useScopeDataY } from '../../appState'
import { VisualProps } from '../common'

const ComplexExponentialMaterial = shaderMaterial(
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

  // https://github.com/anvaka/pplay/blob/master/src/util/shaders/complex.glsl
// based on https://github.com/rust-num/num-complex/blob/master/src/lib.rs
// Copyright 2013 The Rust Project Developers. MIT license
// Ported to GLSL by Andrei Kashcha (github.com/anvaka), available under MIT license as well.


// Returns a complex number z = 1 + i * 0.
vec2 c_one() { return vec2(1., 0.); }

// Returns a complex number z = 0 + i * 1.
vec2 c_i() { return vec2(0., 1.); }

float arg(vec2 c) {
  return atan(c.y, c.x);
}

// Returns conjugate of a complex number.
vec2 c_conj(vec2 c) {
  return vec2(c.x, -c.y);
}

vec2 c_from_polar(float r, float theta) {
  return vec2(r * cos(theta), r * sin(theta));
}

vec2 c_to_polar(vec2 c) {
  return vec2(length(c), atan(c.y, c.x));
}

// Computes e^(c), where e is the base of the natural logarithm.
vec2 c_exp(vec2 c) {
  return c_from_polar(exp(c.x), c.y);
}


// Raises a floating point number to the complex power c.
vec2 c_exp(float base, vec2 c) {
  return c_from_polar(pow(base, c.x), c.y * log(base));
}

// Computes the principal value of natural logarithm of c.
vec2 c_ln(vec2 c) {
  vec2 polar = c_to_polar(c);
  return vec2(log(polar.x), polar.y);
}

// Returns the logarithm of c with respect to an arbitrary base.
vec2 c_log(vec2 c, float base) {
  vec2 polar = c_to_polar(c);
  return vec2(log(polar.r), polar.y) / log(base);
}

// Computes the square root of complex number c.
vec2 c_sqrt(vec2 c) {
  vec2 p = c_to_polar(c);
  return c_from_polar(sqrt(p.x), p.y/2.);
}

// Raises c to a floating point power e.
vec2 c_pow(vec2 c, float e) {
  vec2 p = c_to_polar(c);
  return c_from_polar(pow(p.x, e), p.y*e);
}

// Raises c to a complex power e.
vec2 c_pow(vec2 c, vec2 e) {
  vec2 polar = c_to_polar(c);
  return c_from_polar(
     pow(polar.x, e.x) * exp(-e.y * polar.y),
     e.x * polar.y + e.y * log(polar.x)
  );
}

// Computes the complex product of self * other.
vec2 c_mul(vec2 self, vec2 other) {
    return vec2(self.x * other.x - self.y * other.y, 
                self.x * other.y + self.y * other.x);
}

vec2 c_div(vec2 self, vec2 other) {
    float norm = length(other);
    return vec2(self.x * other.x + self.y * other.y,
                self.y * other.x - self.x * other.y)/(norm * norm);
}

vec2 c_sin(vec2 c) {
  return vec2(sin(c.x) * cosh(c.y), cos(c.x) * sinh(c.y));
}

vec2 c_cos(vec2 c) {
  // formula: cos(a + bi) = cos(a)cosh(b) - i*sin(a)sinh(b)
  return vec2(cos(c.x) * cosh(c.y), -sin(c.x) * sinh(c.y));
}

vec2 c_tan(vec2 c) {
  vec2 c2 = 2. * c;
  return vec2(sin(c2.x), sinh(c2.y))/(cos(c2.x) + cosh(c2.y));
}

vec2 c_atan(vec2 c) {
  // formula: arctan(z) = (ln(1+iz) - ln(1-iz))/(2i)
  vec2 i = c_i();
  vec2 one = c_one();
  vec2 two = one + one;
  if (c == i) {
    return vec2(0., 1./1e-10);
  } else if (c == -i) {
    return vec2(0., -1./1e-10);
  }

  return c_div(
    c_ln(one + c_mul(i, c)) - c_ln(one - c_mul(i, c)),
    c_mul(two, i)
  );
}

vec2 c_asin(vec2 c) {
 // formula: arcsin(z) = -i ln(sqrt(1-z^2) + iz)
  vec2 i = c_i(); vec2 one = c_one();
  return c_mul(-i, c_ln(
    c_sqrt(c_one() - c_mul(c, c)) + c_mul(i, c)
  ));
}

vec2 c_acos(vec2 c) {
  // formula: arccos(z) = -i ln(i sqrt(1-z^2) + z)
  vec2 i = c_i();

  return c_mul(-i, c_ln(
    c_mul(i, c_sqrt(c_one() - c_mul(c, c))) + c
  ));
}

vec2 c_sinh(vec2 c) {
  return vec2(sinh(c.x) * cos(c.y), cosh(c.x) * sin(c.y));
}

vec2 c_cosh(vec2 c) {
  return vec2(cosh(c.x) * cos(c.y), sinh(c.x) * sin(c.y));
}

vec2 c_tanh(vec2 c) {
  vec2 c2 = 2. * c;
  return vec2(sinh(c2.x), sin(c2.y))/(cosh(c2.x) + cos(c2.y));
}

vec2 c_asinh(vec2 c) {
  // formula: arcsinh(z) = ln(z + sqrt(1+z^2))
  vec2 one = c_one();
  return c_ln(c + c_sqrt(one + c_mul(c, c)));
}

vec2 c_acosh(vec2 c) {
  // formula: arccosh(z) = 2 ln(sqrt((z+1)/2) + sqrt((z-1)/2))
  vec2 one = c_one();
  vec2 two = one + one;
  return c_mul(two,
      c_ln(
        c_sqrt(c_div((c + one), two)) + c_sqrt(c_div((c - one), two))
      ));
}

vec2 c_atanh(vec2 c) {
  // formula: arctanh(z) = (ln(1+z) - ln(1-z))/2
  vec2 one = c_one();
  vec2 two = one + one;
  if (c == one) {
      return vec2(1./1e-10, vec2(0.));
  } else if (c == -one) {
      return vec2(-1./1e-10, vec2(0.));
  }
  return c_div(c_ln(one + c) - c_ln(one - c), two);
}

// Attempts to identify the gaussian integer whose product with \`modulus\`
// is closest to \`c\`
vec2 c_rem(vec2 c, vec2 modulus) {
  vec2 c0 = c_div(c, modulus);
  // This is the gaussian integer corresponding to the true ratio
  // rounded towards zero.
  vec2 c1 = vec2(c0.x - mod(c0.x, 1.), c0.y - mod(c0.y, 1.));
  return c - c_mul(modulus, c1);
}

vec2 c_inv(vec2 c) {
  float norm = length(c);
	return vec2(c.x, -c.y) / (norm * norm);
}

  #define cx_arg(a) atan(a.y, a.x)


#define PI 3.14159265
#define TAU (2.*PI)

#define cx_mul(a, b) vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x)
#define cx_div(a, b) vec2(((a.x*b.x + a.y*b.y)/(b.x*b.x + b.y*b.y)),((a.y*b.x - a.x*b.y)/(b.x*b.x + b.y*b.y)))
#define cx_sin(a) vec2(sin(a.x) * cosh(a.y), cos(a.x) * sinh(a.y))
#define cx_cos(a) vec2(cos(a.x) * cosh(a.y), -sin(a.x) * sinh(a.y))

float sharp = 0.39; // delay
float b = 0.655; // brightness 0 -> dark, 1 -> bright
float nMod = 2.; // num of level curves mod
float nPhase = 20.; // num. of level curves phase
float base = 2.; // For the base of a logarithm
float nContour = 16.;

vec2 as_polar(vec2 z) {
  return vec2(
    length(z),
    atan(z.y, z.x)
  );
}

vec2 cx_tan(vec2 a) {return cx_div(cx_sin(a), cx_cos(a)); }
vec2 cx_log(vec2 a) {
    vec2 polar = as_polar(a);
    float rpart = polar.x;
    float ipart = polar.y;
    if (ipart > PI) ipart=ipart-(2.0*PI);
    return vec2(log(rpart),ipart);
}
vec2 cx_pow(vec2 v, float p) {
  vec2 z = as_polar(v);
  return pow(z.x, p) * vec2(cos(z.y * p), sin(z.y * p));
}

vec3 rgb2hsv(vec3 c)
{
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 palette( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d )
{
    return a + b*cos(2. * PI *(c*t+d) );
}

float funPhase(vec2 p) {
    return (PI - atan(p.y, -p.x)) / (2. * PI);
}

float funColor(vec2 p) {
    return sharp * (nContour * (PI - atan(p.y, -p.x)) / (2. * PI) -  floor(nContour * (PI - atan(p.y, -p.x)) / (2. * PI))) + 0.7;
}

void main()
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = (fragCoord.xy - 0.5 * iResolution.xy) / min(iResolution.y, iResolution.x);
    vec2 z = uv;
    float angle = sin(iTime/5.) * TAU;
    float length = .2;
  
    // Spin our points in a circle of radius length
    float c = cos(angle);
    float s = sin(angle);
    vec2 p = vec2( s*length, c*length);
    vec2 q = vec2( s*-length, c*-length );
    
    vec2 res = c_exp(c_div(vec2(1., 0.),(z + vec2(0.01*sin(iTime),0.01*cos(iTime)))) + vec2(1., iTime));
   

    vec3 col = palette(5. + 0.15*funPhase(res) * (12. * cos(3.*cos(iTime / 10.) + PI/2.3)), vec3(0.50,.52,0.53), vec3(.46,.32,.35), vec3(.82,.84,.65), vec3(0.53,0.23,0.22));
    vec3 hsv = rgb2hsv(col);
    col = vec3(hsv.r, hsv.b, hsv.g);
    //col = vec3(funPhase(res), 1., funColor(res));
    fragColor = vec4(col, 1.0);
}
  `
)

extend({ ComplexExponentialMaterial })

type ComplexExponentialMaterialImpl = {
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
      complexExponentialMaterial: ComplexExponentialMaterialImpl
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
      <complexExponentialMaterial
        key={ComplexExponentialMaterial.key}
        ref={ref}
        iTime={0}
        fftBars={bars}
        scopeX={scopeX}
        scopeY={scopeY}
        iResolution={[size.width, size.height]}
      ></complexExponentialMaterial>
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
