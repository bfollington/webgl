import { Suspense } from 'react'
import { TextureMapper } from './audioScope/base'
import ScopeVisual from './audioScope/reactive'
import { useScopeDataX, useScopeDataY } from '../appState'

interface AudioScopeVisualProps {}

const AudioScopeVisual = ({}: AudioScopeVisualProps) => {
  const timeSamples = useScopeDataX()
  const quadSamples = useScopeDataY()

  const textureMapper = new TextureMapper(timeSamples, quadSamples)

  return (
    <Suspense fallback={null}>
      <ScopeVisual textureMapper={textureMapper} />
    </Suspense>
  )
}

export default AudioScopeVisual
