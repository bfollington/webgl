import { AnimatedSprite, Container, Sprite, Stage, useApp, useTick } from '@pixi/react'
import { folder, useControls } from 'leva'
import * as PIXI from 'pixi.js'
import { BlurFilter } from 'pixi.js'
import React, { useEffect, useMemo, useRef } from 'react'
import tiles from '../../../assets/tiles.png'
import { AVAILABLE_COLOR_PALETTES, COLOR_PALETTE, ColorPalette } from '../visualizers/palettes'
import { Assets } from '@pixi/assets'

export interface Visual2DCanvasProps {}

// function makeAnimatedSpriteTextures() {
//   const textures = []

//   for (let i = 1; i <= 10; i++) {
//     const style = new PIXI.TextStyle({
//       fontFamily: 'mono',
//       fontSize: 36,
//       fontStyle: 'italic',
//       fontWeight: 'bold',
//       fill: ['#ffffff', '#00ff99'], // gradient
//       stroke: '#4a1850',
//       strokeThickness: 5,
//       dropShadow: true,
//       dropShadowColor: '#000000',
//       dropShadowBlur: 4,
//       dropShadowAngle: Math.PI / 6,
//       dropShadowDistance: 6,
//       wordWrap: true,
//       wordWrapWidth: 440,
//     })
//     const text = new PIXI.Text(i.toString(), style)

//     text.width = 60
//     text.height = 50
//     textures.push(new PIXI.Texture(text.texture as any))
//   }

//   return textures
// }

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

function makeGrid(x: number, y: number) {
  return [...Array(x)].map((_, i) => {
    return [...Array(y)].map((_, j) => {
      return { x: i, y: j }
    })
  })
}

function useTexture(src: string) {
  const [texture, setTexture] = React.useState<PIXI.BaseTexture>(new PIXI.BaseTexture())

  useEffect(() => {
    Assets.load(src).then(setTexture)
  }, [src])

  return texture
}

function useTileset(
  texture: PIXI.BaseTexture,
  rows: number,
  columns: number,
  width: number,
  height: number
) {
  const [textures, setTextures] = React.useState<PIXI.Texture[]>([])

  useEffect(() => {
    const textures = []
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < columns; j++) {
        textures.push(
          new PIXI.Texture(texture, new PIXI.Rectangle(j * width, i * height, width, height))
        )
      }
    }
    setTextures(textures)
  }, [texture, rows, columns, width, height])

  return textures
}

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
  const textures = useMemo(() => makeAnimatedSpriteTextures(), [])

  const grid = makeGrid(28, 28)
  const tex = useTexture(tiles)
  const frames = useTileset(tex, 8, 8, 8, 8)

  return (
    <div className='pixi'>
      <Stage
        width={256}
        height={256}
        options={{
          backgroundColor: '#000000',
          antialias: false,
          resolution: 1,
        }}
      >
        {frames != null && (
          <Container x={16} y={16}>
            {grid.map((row, i) => {
              return row.map((col, j) => {
                return <Agent x={i} y={j} textures={frames} />
              })
            })}
          </Container>
        )}
      </Stage>
    </div>
  )
}

function Agent({ x, y, textures }: { x: number; y: number; textures: PIXI.Texture[] }) {
  const spr = useRef<PIXI.AnimatedSprite>(null)
  useTick((delta) => {
    if (!spr.current) return
    spr.current.currentFrame =
      Math.round(
        Math.abs(
          Math.cos((x / 20) * y) * 2 + 24 * Math.sin(Date.now() / 10000 + x / 10 + Math.cos(y / 20))
        )
      ) % 24
  })

  return (
    <AnimatedSprite
      ref={spr}
      key={`${x}-${y}`}
      x={x * 8}
      y={y * 8}
      anchor={0}
      textures={textures}
      isPlaying={true}
      initialFrame={Math.round(Math.abs(24 * Math.sin(Date.now() + x + y))) % 24}
      animationSpeed={0}
    />
  )
}

export default Visual3DCanvas
