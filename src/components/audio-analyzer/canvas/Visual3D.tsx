import { OrbitControls, Stats } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { folder, useControls } from 'leva'
import { ApplicationMode, APPLICATION_MODE } from '../applicationModes'
import {
  AVAILABLE_COLOR_PALETTES,
  ColorPalette,
  ColorPaletteType,
  COLOR_PALETTE,
} from '../visualizers/palettes'
import AudioVisual from '../visualizers/visualizerAudio'
import NoiseVisual from '../visualizers/visualizerNoise'
import ParticleNoiseVisual from '../visualizers/visualizerParticleNoise'
import WaveformVisual from '../visualizers/visualizerWaveform'
import { Bloom, EffectComposer, Noise, Scanline, DepthOfField } from '@react-three/postprocessing'
import React, { useEffect } from 'react'
import { RoomProvider } from '../../../liveblocks.config'
import { ClientSideSuspense } from '@liveblocks/react'

const getVisualizerComponent = (
  mode: ApplicationMode,
  visual: string,
  palette: ColorPaletteType
) => {
  switch (mode) {
    case APPLICATION_MODE.WAVE_FORM:
      return <WaveformVisual visual={visual} palette={palette} />
    case APPLICATION_MODE.NOISE:
      return visual === 'particleSwarm' ? (
        <ParticleNoiseVisual />
      ) : (
        <NoiseVisual visual={visual} palette={palette} />
      )
    case APPLICATION_MODE.AUDIO:
      return <AudioVisual visual={visual} palette={palette} />
    default:
      throw new Error(`Unknown mode ${mode}`)
  }
}
export interface Visual3DCanvasProps {
  mode: ApplicationMode
}
const AVAILABLE_VISUALS = [
  'spectrum-plot',
  'fullscreenShader',
  'foldingShader',
  'spiralsShader',
  'alienWater',
  'intoTheDrink',
  'formWithoutForm',
  'lightPool',
  'cuttingWords',
  'conduit',
  'twoDirections',
  'webcam',
  'grid',
  'sphere',
  'cube',
  'diffusedRing',
  'pinGrid',
  'dna',
  // "traceParticles",
  // "particleSwarm",
]
const Visual3DCanvas = ({ mode }: Visual3DCanvasProps) => {
  const canvas = React.useRef<HTMLCanvasElement>(null)
  const visualizerParam = new URLSearchParams(document.location.search).get('visual') as string
  const { visualizer } = useControls({
    visualizer: {
      value:
        visualizerParam && AVAILABLE_VISUALS.includes(visualizerParam)
          ? visualizerParam
          : AVAILABLE_VISUALS[0],
      options: AVAILABLE_VISUALS,
    },
  })
  const { palette, colorBackground, fullscreen } = useControls({
    'Visual - Color': folder(
      {
        palette: {
          value: COLOR_PALETTE.THREE_COOL_TO_WARM,
          options: AVAILABLE_COLOR_PALETTES,
        },
        colorBackground: false,
      },
      { collapsed: true }
    ),
    fullscreen: {
      value: false,
    },
  })

  useEffect(() => {
    const main = document.querySelector('.main')
    if (main && fullscreen) {
      main.requestFullscreen()
    } else {
      document.fullscreenElement && document?.exitFullscreen()
    }
  }, [fullscreen])

  const backgroundColor = colorBackground
    ? ColorPalette.getPalette(palette).calcBackgroundColor(0)
    : '#010204'
  return (
    <Canvas
      ref={canvas}
      dpr={1}
      camera={{
        fov: 45,
        near: 1,
        far: 1000,
        position: [-17, -6, 6.5],
        up: [0, 0, 1],
      }}
    >
      <color attach='background' args={[backgroundColor]} />
      <ambientLight />
      {/* <fog attach='fog' args={[backgroundColor, 0, 10]} /> */}
      {getVisualizerComponent(mode as ApplicationMode, visualizer, palette)}
      {/* <Stats /> */}
      <OrbitControls makeDefault />
    </Canvas>
  )
}

export default Visual3DCanvas
