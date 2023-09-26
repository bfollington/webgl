import { Container } from '@pixi/react'
import React, { useEffect } from 'react'
import * as PIXI from 'pixi.js'
import { Assets } from '@pixi/assets'

export function useTexture(src: string) {
  const [texture, setTexture] = React.useState<PIXI.BaseTexture>(new PIXI.BaseTexture())

  useEffect(() => {
    Assets.load(src).then(setTexture)
  }, [src])

  return texture
}
