//@ts-check

import type { Vector2d } from "@/utils/vector";

/**
 * @returns {Promise<AnalyserNode>}
 */
const getMicInputAnalyzer = (): Promise<AnalyserNode> => {
  return new Promise((resolve, reject) => {
    try {
      const audioContext = new AudioContext();

      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        resolve(analyser);
      }).catch((error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}

const getAudioAnalyzer = () => {
  const pubScope = {
    started: false,
    getBassAndHiLevelsAsCoords: () => [0, 0] as Vector2d,

  }
  getMicInputAnalyzer().then((analyzer: AnalyserNode) => {
    pubScope.started = true;
    pubScope.getBassAndHiLevelsAsCoords = () => {
      const bufferLength = analyzer.frequencyBinCount;
      const oneEighth = Math.floor(bufferLength / 8);
      const dataArray = new Uint8Array(bufferLength);
      analyzer.getByteFrequencyData(dataArray);
      const bass = dataArray[oneEighth];
      const hi = dataArray[oneEighth * 4];
      return [
        0.5 + hi / 255,
        0.5 + bass / 255,
      ] as Vector2d;
    }
  }).catch((error) => {
    console.log("not using mic input", error);
  });

  return pubScope;
}


export default getAudioAnalyzer;