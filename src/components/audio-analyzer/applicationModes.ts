export const APPLICATION_MODE = {
  R3F: 'R3F', // 'React Three Fiber
  PIXI: 'PIXI', // 'PixiJS'
} as const

type ObjectValues<T> = T[keyof T]
export type ApplicationMode = ObjectValues<typeof APPLICATION_MODE>

export const getAppModeDisplayName = (mode: ApplicationMode): string => {
  switch (mode) {
    case APPLICATION_MODE.R3F:
      return 'react-three-fiber'
    case APPLICATION_MODE.PIXI:
      return 'react-pixi'
    default:
      throw new Error(`Unknown mode ${mode}`)
  }
}

export const getPlatformSupportedApplicationModes = (): ApplicationMode[] => {
  return [APPLICATION_MODE.R3F, APPLICATION_MODE.PIXI]
}
