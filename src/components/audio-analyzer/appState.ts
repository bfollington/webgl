import { create } from 'zustand'

interface IAppState {
  visualSourceData: {
    x: Float32Array
    y: Float32Array
    // z: Float32Array;
  }
  fftData: {
    x: Float32Array
    // y: Float32Array
    // z: Float32Array;
  }
  scopeData: {
    x: Float32Array
    y: Float32Array
    // z: Float32Array;
  }
  energyInfo: {
    current: number
  }
  actions: {
    resizeVisualSourceData: (newSize: number) => void
    resizeFFTData: (newSize: number) => void
    resizeScopeData: (newSize: number) => void
  }
}

const useAppState = create<IAppState>((set, get) => ({
  visualSourceData: {
    x: new Float32Array(121).fill(0),
    y: new Float32Array(121).fill(0),
    // z: new Float32Array(121).fill(0),
  },
  fftData: {
    x: new Float32Array(121).fill(0),
    // y: new Float32Array(121).fill(0),
    // z: new Float32Array(121).fill(0),
  },
  scopeData: {
    x: new Float32Array(121).fill(0),
    y: new Float32Array(121).fill(0),
    // z: new Float32Array(121).fill(0),
  },
  energyInfo: { current: 0 },
  actions: {
    resizeVisualSourceData: (newSize: number) =>
      set((state) => {
        console.log(newSize)
        return {
          visualSourceData: {
            x: new Float32Array(newSize).fill(0),
            y: new Float32Array(newSize).fill(0),
            z: new Float32Array(newSize).fill(0),
          },
        }
      }),
    resizeFFTData: (newSize: number) =>
      set((state) => {
        console.log(newSize)
        return {
          fftData: {
            x: new Float32Array(newSize).fill(0),
            // y: new Float32Array(newSize).fill(0),
            // z: new Float32Array(newSize).fill(0),
          },
        }
      }),
    resizeScopeData: (newSize: number) =>
      set((state) => {
        console.log(newSize)
        return {
          scopeData: {
            x: new Float32Array(newSize).fill(0),
            y: new Float32Array(newSize).fill(0),
            // z: new Float32Array(newSize).fill(0),
          },
        }
      }),
  },
}))

// export const useVisualSourceDataX = () => useAppState((state) => state.visualSourceData.x)
// export const useVisualSourceDataY = () => useAppState((state) => state.visualSourceData.y)
export const useFFTData = () => useAppState((state) => state.fftData.x)
export const useScopeData = () => useAppState((state) => state.scopeData)
export const useScopeDataX = () => useAppState((state) => state.scopeData.x)
export const useScopeDataY = () => useAppState((state) => state.scopeData.y)
// export const useVisualSourceDataZ = () =>
//   useAppState((state) => state.visualSourceData.z);
export const useEnergyInfo = () => useAppState((state) => state.energyInfo)
export const useAppStateActions = () => useAppState((state) => state.actions)
