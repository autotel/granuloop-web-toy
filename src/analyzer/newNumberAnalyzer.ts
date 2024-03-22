import { sustract, type DeltaTimeVector, type Vector2d, size, direction, add, vectorToScreenScale, distance, type WidthHeight, type Rect } from '@/utils/vector';
import type DrawScope from './DrawScope';
import MaxLengthArray from './MaxLengthArray';
import SimpleClusterizer from './SimpleClusterizer';
import { analyzerHistoryDuration } from './parameters';

type Onset = {
  time: number,
  score: number
}
type IntervalEntry = {
  interval: number,
  score: number,
  discardTime: number
}


class SineBeatTrackingAgent {
  currentPhase = 0;
  curentFrequency = 0;
  currentCosValue = 0;
  frame(deltaTime: number) {
    this.currentPhase += deltaTime * this.curentFrequency;
    this.currentCosValue = Math.sin(this.currentPhase * Math.PI * 2);
  }
  beat() {
    const predictionScore = this.currentCosValue;
    // beat falls before beat = positive offset value, frequency should be shifted up
    // beat falls after beat = negative offset value, frequency should be shifted down
    const offset = - this.currentPhase % 1 - 0.5
    // the higher the score, the more weight my current frequency has
    // lower score, more weight to the offset
    this.curentFrequency += offset * predictionScore;
  }
}

type DeltaNumber = {
  v: number,
  dt: number
}

const newNumberAnalyzer = () => {

  const pointsHistory: DeltaNumber[] = [];
  let lastPointInsertedTime = 0;
  let flatHistory: number[] = [];
  let movingAverageValue = 0;

  const addSample = (newPoint: number, time: number) => {
    if (lastPointInsertedTime === 0) {
      lastPointInsertedTime = time;
    }
    const dt = time - lastPointInsertedTime;
    // console.log('totalHistoryDuration', dt, time, lastPointInsertedTime);
    lastPointInsertedTime = time;
    pointsHistory.unshift({ v: newPoint, dt });
    // limit mouse history time to analyzerHistoryDuration
    flatHistory = [];
    let totalHistoryDuration = 0;
    for (let i = 0; i < pointsHistory.length; i++) {
      totalHistoryDuration += pointsHistory[i].dt;
      flatHistory.push(pointsHistory[i].v);
      if (totalHistoryDuration > analyzerHistoryDuration) {
        pointsHistory.length = i + 1;
        break;
      }
    }
    movingAverageValue = newPoint * 0.05 + movingAverageValue * 0.95;
    // TODO: should use instead timestamped history
    includeInBpmAnalysis(flatHistory, movingAverageValue, time);
  }

  const plotter = (
    context: CanvasRenderingContext2D,
    plotRect: Rect,
    history: number[],
    multiply: number = 1
  ) => {
    context.beginPath();
    const stepWidth = plotRect.width / history.length;
    const plotCenterY = plotRect.y + plotRect.height / 2;
    history.forEach((value, i) => {
      const x = plotRect.x + i * stepWidth;
      const y = plotCenterY - (value * multiply) * plotRect.height;
      // console.log('plot', x, y);
      if (i === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });
    context.stroke();
  }

  const analyze = (time: number, deltaTime: number) => {

    sbta.frame(deltaTime);


    // remove onsets older than mouse history
    let lastOnsetToDelete = -1;
    for (let i = 0; i < onsets.length; i++) {
      if (onsets[i].time < time - analyzerHistoryDuration) {
        lastOnsetToDelete = i;
      }
    }
    if (lastOnsetToDelete > -1) {
      onsets.splice(0, lastOnsetToDelete + 1);
      intervalsClusterizer.dataToCluster = intervalsClusterizer.dataToCluster.filter(({ assocData }) => assocData.discardTime >= time);
    }

    intervalsClusterizer.updateClusters();

  }


  const sbta = new SineBeatTrackingAgent();

  const intervalsClusterizer = new SimpleClusterizer<IntervalEntry>(200);


  const onsets = [] as Onset[];

  let lastOnsetDetected: Onset | false = false;
  // TODO: should not be recalculating on every frame!!!
  // keep a higher-scoped memory
  const includeInBpmAnalysis = (history: number[], threshold: number, timestamp: number) => {
    if (history.length < 2) {
      return;
    }


    const lastHistoryValue = history[0];
    const prevToLastHistoryValue = history[1];

    if (lastHistoryValue >= threshold) {
      if (prevToLastHistoryValue < threshold) {
        lastOnsetDetected = {
          time: timestamp,
          score: lastHistoryValue
        };
        addOnset(lastOnsetDetected);
      } else if (lastOnsetDetected) {
        lastOnsetDetected.score = Math.max(lastOnsetDetected.score, lastHistoryValue);
      }
    }

  }

  const expectedBPSRange = {
    min: 1.1,
    max: 2.9
  }
  const expectedIntervalRange = {
    min: 1000 / expectedBPSRange.max,
    max: 1000 / expectedBPSRange.min
  }
  /**
   * register an onset to be considered in the bpm analysis
   */
  const addOnset = (onset: Onset) => {

    // get a number of previous onsets in to measure the distance (interval) to them
    const prevOnsets = onsets.slice(-4);

    // calculate my distance to the last onsets
    const intervals: IntervalEntry[] = [];
    prevOnsets.forEach((prevOnset) => {
      const interval = onset.time - prevOnset.time;
      //discard intervals that would lead to a bps value outside the expected range
      if (interval < expectedIntervalRange.min || interval > expectedIntervalRange.max) {
        return;
      }
      intervals.push({
        interval,
        score: onset.score,
        discardTime: onset.time + analyzerHistoryDuration,
      });
    });

    onsets.push(onset);

    // clustering the intervals
    intervals.forEach((ii) => {
      intervalsClusterizer.add(ii.interval, ii);
    });

  }
  let averageDeltaTime = 0;
  const draw = ({ width, height, context }: DrawScope, time: number, deltaTime: number) => {
    const avgWeight = 0.99;

    averageDeltaTime = averageDeltaTime * avgWeight + deltaTime * (1 - avgWeight);


    // plotter rect
    const plotHeight = 200;
    const plotRect = {
      x: 0,
      y: 0,
      width,
      height,
    }

    context.strokeStyle = 'white';
    context.fillStyle = 'none';
    context.strokeRect(plotRect.x, plotRect.y, plotRect.width, plotRect.height);

    // plot stuff
    context.strokeStyle = 'orange';
    plotter(context, plotRect, flatHistory, 1/365);
    context.strokeStyle = 'white';
    plotter(context, plotRect, [movingAverageValue,movingAverageValue], 1/365);

    // plot onset

    const pxPerTime = 0.06 * averageDeltaTime * width / analyzerHistoryDuration;
    // todo: got to reference time with timestamps instead of index position,
    // or otherwise I can convert using framerate
    onsets.forEach((onset) => {
      const xpos = plotRect.x + (time - onset.time) * pxPerTime;
      const ypos = plotRect.y + plotRect.height - onset.score * plotRect.height;

      context.beginPath();
      context.arc(xpos, ypos, 5, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    });


    // plot interval clusters

    intervalsClusterizer.clusters.map(({ center, assocData }) => {
      const count = assocData.length;
      const xpos = plotRect.x + center * pxPerTime;
      const ypos = plotRect.y + 10;
      context.beginPath();
      context.arc(xpos, ypos, 2 * count, 0, Math.PI * 2);
      // context.fill();
      context.stroke();

      // text with bpm value
      context.fillStyle = 'white';
      context.fillText((1000 / center * 60).toFixed(1), xpos, ypos);

    });
  }

  return {
    analyze, draw,
    addSample
  };
}
export default newNumberAnalyzer