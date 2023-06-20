import { useEffect, useRef } from 'react'
import { useAppStateActions, useScopeDataX, useScopeDataY } from '../appState'
import ScopeAnalyzer from './analyzers/scope'

export interface AudioScopeAnalyzerControlsProps {
  analyzer: ScopeAnalyzer
}
const AudioScopeAnalyzerControls = ({ analyzer }: AudioScopeAnalyzerControlsProps) => {
  const timeData2 = useScopeDataX()
  const quadData2 = useScopeDataY()
  const { resizeScopeData } = useAppStateActions()
  const animationRequestRef = useRef<number>(null!)

  /**
   * Transfers data from the analyzer to the target arrays
   */
  const animate = (): void => {
    // Check if the state sizes need to be updated
    const targetLength = analyzer.quadSamples.length
    if (timeData2.length !== targetLength || quadData2.length !== targetLength) {
      console.log(`Resizing ${targetLength}`)
      resizeScopeData(targetLength)
      return
    }
    // Copy the data over to state
    analyzer.timeSamples.forEach((v, index) => {
      timeData2[index] = v
    })
    analyzer.quadSamples.forEach((v, index) => {
      quadData2[index] = v
    })
    animationRequestRef.current = requestAnimationFrame(animate)
  }

  /**
   * Re-Synchronize the animation loop if the target data destination changes.
   */
  useEffect(() => {
    if (animationRequestRef.current) {
      cancelAnimationFrame(animationRequestRef.current)
    }
    animationRequestRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationRequestRef.current)
  }, [timeData2, quadData2])

  return <></>
}

export default AudioScopeAnalyzerControls
