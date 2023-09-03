import { Canvas } from '@react-three/fiber'
import { Leva } from 'leva'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ACESFilmicToneMapping, sRGBEncoding } from 'three'
import { Scene } from './Scene'
import './styles/main.css'
import { WebMidi } from 'webmidi'
import AudioScene from './components/AudioScene'
import { RoomProvider, useOthers } from './liveblocks.config'
import { ClientSideSuspense } from '@liveblocks/react'

WebMidi.enable()
  .then(onEnabled)
  .catch((err) => alert(err))

function onEnabled() {
  if (WebMidi.inputs.length < 1) {
    console.log('No device detected.')
    return
  } else {
    WebMidi.inputs.forEach((device, index) => {
      console.log(`${index}: ${device.name} <br>`)
    })
  }

  const mySynth = WebMidi.inputs[0]
  // const mySynth = WebMidi.getInputByName("TYPE NAME HERE!")

  mySynth.channels[1].addListener('noteon', (e) => {
    console.log(`${e.note.name}`)
  })
}

function Main() {
  const others = useOthers()
  const userCount = others.length
  return (
    <div className='main'>
      <Leva
        collapsed={false}
        oneLineLabels={false}
        flat={true}
        theme={{
          fonts: {
            mono: '"SF Mono", monospace',
          },
          radii: {
            xs: '0px',
            sm: '0px',
            lg: '0px',
          },
          sizes: {
            titleBarHeight: '24px',
          },
          fontSizes: {
            root: '10px',
          },
        }}
      />
      <AudioScene />
      {/* <Canvas
        dpr={[1, 2]}
        gl={{
          antialias: true,
          toneMapping: ACESFilmicToneMapping,
          outputEncoding: sRGBEncoding,
        }}
        camera={{
          fov: 55,
          near: 0.1,
          far: 200,
          position: [3, 2, 9],
        }}
        shadows
      >
        <Scene />
      </Canvas> */}
      <div className='status-bar'>
        <div>There are {userCount} other user(s) online</div>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RoomProvider id='my-room' initialPresence={{ cursor: { x: 0, y: 0 } }}>
      <ClientSideSuspense fallback={<div>Loading…</div>}>{() => <Main />}</ClientSideSuspense>
    </RoomProvider>
  </React.StrictMode>
)
