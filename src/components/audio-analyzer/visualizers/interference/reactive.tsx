import { AnimatedSprite, Container, useTick } from '@pixi/react'
import * as PIXI from 'pixi.js'
import { useRef } from 'react'
import tiles from './tiles.png'
import { makeGrid } from '../../../../grid'
import { useTexture } from '../../../../pixi/useTexture'
import { useTileset } from '../../../../pixi/useTileset'

function Agent({
  x,
  y,
  textures,
  offset,
  tint,
}: {
  x: number
  y: number
  textures: PIXI.Texture[]
  offset: number
  tint: PIXI.ColorSource
}) {
  const spr = useRef<PIXI.AnimatedSprite>(null)
  useTick((delta) => {
    if (!spr.current) return
    spr.current.currentFrame =
      Math.round(
        Math.abs(
          Math.cos((x / 20) * y) * 2 +
            24 * Math.sin(Date.now() / 10000 + offset + x / 10 + Math.cos(y / 20))
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
      tint={tint}
    />
  )
}

export default function Interference({}) {
  const grid = makeGrid(28, 28, () => 0)
  const tex = useTexture(tiles)
  console.log(tex)
  const frames = useTileset(tex, 8, 8, 8, 8)
  if (!frames.length) return <Container />

  return (
    <Container>
      {frames != null && (
        <Container x={16} y={16}>
          {grid.map((row, i) => {
            return row.map((col, j) => {
              return (
                <Agent key={`${i}${j}`} x={i} y={j} textures={frames} tint={0xcccccc} offset={0} />
              )
            })
          })}
        </Container>
      )}
      {frames != null && (
        <Container x={16} y={16}>
          {grid.map((row, i) => {
            return row.map((col, j) => {
              return (
                <Agent
                  key={`${i}${j}`}
                  x={i}
                  y={j}
                  textures={frames}
                  tint={0x707070}
                  offset={0.5}
                />
              )
            })
          })}
        </Container>
      )}
    </Container>
  )
}
