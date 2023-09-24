import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { folder, useControls } from 'leva'
import React, { useEffect, useMemo, useRef } from 'react'
import { AVAILABLE_COLOR_PALETTES, COLOR_PALETTE, ColorPalette } from '../visualizers/palettes'
import AudioVisual from '../visualizers/visualizerAudio'
import { Container, Sprite, Stage, Text, useApp } from '@pixi/react'
import { BlurFilter } from 'pixi.js'
import { useRedo } from '../../../liveblocks.config'

export interface Visual2DCanvasProps {}

const AVAILABLE_VISUALS = ['test']
const Visual3DCanvas = ({}: Visual2DCanvasProps) => {
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

  const blurFilter = useMemo(() => new BlurFilter(4), [])

  return (
    <div className='pixi'>
      <Stage
        width={256}
        height={256}
        options={{
          backgroundColor: '#FF0000',
          antialias: false,
          resolution: 1,
        }}
      >
        <Sprite
          image='https://pixijs.io/pixi-react/img/bunny.png'
          x={128}
          y={128}
          anchor={{ x: 0, y: 0 }}
        />

        <Sprite
          image='https://pixijs.io/pixi-react/img/bunny.png'
          x={64}
          y={128}
          anchor={{ x: 0, y: 0 }}
        />

        <Container x={128} y={128}>
          <Text text='Hello World' anchor={{ x: 0.5, y: 0.5 }} filters={[blurFilter]} />
        </Container>
      </Stage>
    </div>
  )
}

export default Visual3DCanvas
