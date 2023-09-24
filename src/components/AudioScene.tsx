import { Suspense } from 'react'
import { useControls } from 'leva'
import {
  APPLICATION_MODE,
  ApplicationMode,
  getAppModeDisplayName,
  getPlatformSupportedApplicationModes,
} from './audio-analyzer/applicationModes'
import AudioFFTAnalyzer from './audio-analyzer/analyzers/audioFFTAnalyzer'
import AudioScopeAnalyzer from './audio-analyzer/analyzers/audioScopeAnalyzer'
import AudioScopeCanvas from './audio-analyzer/canvas/AudioScope'
import Visual3DCanvas from './audio-analyzer/canvas/Visual3D'
import Visual2DCanvas from './audio-analyzer/canvas/Visual2D'

const AVAILABLE_MODES = getPlatformSupportedApplicationModes()

const getCanvasComponent = (mode: ApplicationMode) => {
  switch (mode) {
    case APPLICATION_MODE.PIXI:
      return <Visual2DCanvas />
    case APPLICATION_MODE.R3F:
    default:
      return <Visual3DCanvas />
  }
}

const AudioScene = () => {
  const modeParam = new URLSearchParams(document.location.search).get(
    'mode'
  ) as ApplicationMode | null
  const { mode } = useControls({
    mode: {
      value: modeParam && AVAILABLE_MODES.includes(modeParam) ? modeParam : AVAILABLE_MODES[0],
      options: AVAILABLE_MODES.reduce(
        (o, mode) => ({ ...o, [getAppModeDisplayName(mode)]: mode }),
        {}
      ),
      order: -100,
    },
  })

  return (
    <Suspense fallback={<span>loading...</span>}>
      <AudioFFTAnalyzer />
      <AudioScopeAnalyzer />
      {getCanvasComponent(mode as ApplicationMode)}
    </Suspense>
  )
}

export default AudioScene
