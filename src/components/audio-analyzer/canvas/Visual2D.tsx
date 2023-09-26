import { AnimatedSprite, Container, Sprite, Stage, useApp, useTick } from '@pixi/react'
import { folder, useControls } from 'leva'
import * as PIXI from 'pixi.js'
import { BlurFilter } from 'pixi.js'
import React, { Suspense, useEffect, useMemo, useRef } from 'react'
import { AVAILABLE_COLOR_PALETTES, COLOR_PALETTE, ColorPalette } from '../visualizers/palettes'
import { Assets } from '@pixi/assets'

export interface Visual2DCanvasProps {}

function makeAnimatedSpriteTextures() {
  const textures = []

  for (let i = 1; i <= 10; i++) {
    const style = new PIXI.TextStyle({
      fontFamily: 'Kitchen Sink',
      fontSize: 10,
      fill: ['#ffffff', '#00ff99'], // gradient
      stroke: '#4a1850',
      strokeThickness: 5,
      wordWrap: true,
      wordWrapWidth: 440,
    })
    const text = new PIXI.Text(i.toString(), style)

    text.width = 60
    text.height = 50
    textures.push(new PIXI.Texture(text.texture as any))
  }

  return textures
}

const AVAILABLE_VISUALS = ['interference', 'trees']
const Visual3DCanvas = ({}: Visual2DCanvasProps) => {
  const canvas = React.useRef<HTMLCanvasElement>(null)
  const visualizerParam = new URLSearchParams(document.location.search).get('visual') as string
  const { visualizer2d } = useControls({
    visualizer2d: {
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
  const VisualComponent = React.lazy(() => import(`../visualizers/${visualizer2d}/reactive.tsx`))

  return (
    <div className='pixi'>
      <Stage
        width={256}
        height={256}
        options={{
          antialias: false,
          resolution: 1,
        }}
      >
        <Suspense fallback={null}>
          <VisualComponent />
        </Suspense>
      </Stage>
    </div>
  )
}

export default Visual3DCanvas
