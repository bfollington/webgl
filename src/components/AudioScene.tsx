import { Suspense } from 'react'
import { useControls } from 'leva'
import {
  APPLICATION_MODE,
  ApplicationMode,
  getAppModeDisplayName,
  getPlatformSupportedApplicationModes,
} from './audio-analyzer/applicationModes'
import AudioFFTAnalyzer from './audio-analyzer/analyzers/audioScopeAnalyzer'
import AudioScopeAnalyzer from './audio-analyzer/analyzers/audioScopeAnalyzer'
import AudioScopeCanvas from './audio-analyzer/canvas/AudioScope'
import Visual3DCanvas from './audio-analyzer/canvas/Visual3D'

const getAnalyzerComponent = (mode: ApplicationMode) => {
  switch (mode) {
    case APPLICATION_MODE.AUDIO:
      return <AudioFFTAnalyzer />
    case APPLICATION_MODE.AUDIO_SCOPE:
      return <AudioScopeAnalyzer />
    default:
      return null
  }
}

const AVAILABLE_MODES = getPlatformSupportedApplicationModes()

const getCanvasComponent = (mode: ApplicationMode) => {
  switch (mode) {
    case APPLICATION_MODE.AUDIO_SCOPE:
      return <AudioScopeCanvas />
    default:
      return <Visual3DCanvas mode={mode} />
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
      {getAnalyzerComponent(mode as ApplicationMode)}
      {getCanvasComponent(mode as ApplicationMode)}
    </Suspense>
  )
}

export default AudioScene