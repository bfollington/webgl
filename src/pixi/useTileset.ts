import * as PIXI from 'pixi.js'
import React, { useEffect } from 'react'

export function useTileset(
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
