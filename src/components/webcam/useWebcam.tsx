import React, { useMemo, useState, useEffect } from 'react'

export function useWebcam({ id }: { id: string }) {
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const [vid] = useState(document.createElement('video'))

  useEffect(() => {
    document.body.appendChild(vid)
  }, [vid])

  /**
   * Device ID can be found using;
   *
   *  navigator.mediaDevices.enumerateDevices()
   *  .then((devices)=>{
   *    console.log(devices)
   *  })
   *
   * This is useful if you have more than one camera and don't want to make a UI to select one,
   * but maybe I should write a Leva interface for this?
   *
   */

  useMemo(() => {
    if (navigator.mediaDevices.getUserMedia) {
      const constraints = { video: { deviceId: id } }

      navigator.mediaDevices
        .getUserMedia(constraints)
        .then(function (stream) {
          const video = stream.getVideoTracks()
          setWidth((_) => video[0].getSettings().width || 0)
          setHeight((_) => video[0].getSettings().height || 0)
          vid.style.position = 'absolute'
          vid.width = 160
          vid.height = 120
          vid.srcObject = stream
          vid.play()
        })
        .catch(function (error) {
          console.warn(error)
        })
    }
  }, [vid, id])

  return [vid, width, height] as [HTMLVideoElement, number, number]
}
