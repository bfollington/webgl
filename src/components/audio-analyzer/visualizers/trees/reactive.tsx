import { AnimatedSprite, Container, useTick } from '@pixi/react'
import * as PIXI from 'pixi.js'
import { useEffect, useRef, useState } from 'react'
import tree from './tree.png'
import { Grid, makeGrid } from '../../../../grid'
import { useTexture } from '../../../../pixi/useTexture'
import { useTileset } from '../../../../pixi/useTileset'

function TreeAgent({
  x,
  y,
  textures,
  tree,
}: {
  x: number
  y: number
  textures: PIXI.Texture[]
  tree: TreeAgentModel
}) {
  const spr = useRef<PIXI.AnimatedSprite>(null)
  useTick((delta) => {
    if (!spr.current || !tree) return
    spr.current.currentFrame = tree.age
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
      initialFrame={tree?.age}
      animationSpeed={0}
    />
  )
}

function fastRand(v: [number, number]): number {
  const scaleFactor = 1.0 / 4320.0
  v = [scaleFactor * v[0] + 0.25, scaleFactor * v[1]]

  const state = ((v[0] * v[0] + v[1] * v[1]) * 3571) % 1 // mimicking fract function with % 1
  return (state * state * 3571 * 2) % 1
}

function treeAgent(x: number, y: number) {
  if (Math.random() < 0.5) return undefined

  return {
    age: Math.round(fastRand([x, y]) * 100) % 8,
  }
}

function passTime(grid: Grid<TreeAgentModel>) {
  return grid.map((row, i) => {
    return row.map((col, j) => {
      if (!col.content) return col

      return {
        ...col,
        content: {
          ...col.content,
          age: (col.content.age + 1) % 8,
        },
      }
    })
  })
}

function sproutAdjacent(grid: Grid<TreeAgentModel>) {
  return grid.map((row, i) => {
    return row.map((col, j) => {
      const adjacent = [
        grid[i - 1]?.[j - 1],
        grid[i - 1]?.[j],
        grid[i - 1]?.[j + 1],
        grid[i]?.[j - 1],
        grid[i]?.[j + 1],
        grid[i + 1]?.[j - 1],
        grid[i + 1]?.[j],
        grid[i + 1]?.[j + 1],
      ].filter((x) => x?.content && x?.content.age == 4)

      if (adjacent.length >= 3 && col.content === undefined) {
        return {
          ...col,
          content: {
            age: 0,
          },
        }
      }

      return col
    })
  })
}

type TreeAgentModel = ReturnType<typeof treeAgent>

export default function Tree({}) {
  const [grid, setGrid] = useState(makeGrid(28, 28, treeAgent))
  const tex = useTexture(tree)
  console.log(tex)
  const frames = useTileset(tex, 8, 8, 8, 8).slice(0, 8)

  useEffect(() => {
    const cb = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setGrid(passTime)
        setGrid(sproutAdjacent)
      }
    }
    document.addEventListener('keydown', cb)

    return () => {
      document.removeEventListener('keydown', cb)
    }
  }, [document])

  if (!frames.length) return <Container />

  return (
    <Container>
      {frames != null && (
        <Container x={16} y={16}>
          {grid.map((row, i) => {
            return row.map((col, j) => {
              if (!col.content) {
                return <Container key={`${i}${j}`} />
              }
              return <TreeAgent key={`${i}${j}`} x={i} y={j} textures={frames} tree={col.content} />
            })
          })}
        </Container>
      )}
    </Container>
  )
}
