import { Suspense } from 'react'
import { TextureMapper } from './audioScope/base'
import ScopeVisual from './audioScope/reactive'
import { useVisualSourceDataX, useVisualSourceDataY } from '../appState'

interface AudioScopeVisualProps {}

const AudioScopeVisual = ({}: AudioScopeVisualProps) => {
  const timeSamples = useVisualSourceDataX()
  const quadSamples = useVisualSourceDataY()

  const textureMapper = new TextureMapper(timeSamples, quadSamples)

  return (
    <Suspense fallback={null}>
      <ScopeVisual textureMapper={textureMapper} />
    </Suspense>
  )
}

export default AudioScopeVisual