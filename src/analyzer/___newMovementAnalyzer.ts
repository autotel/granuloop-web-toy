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

const newMovementAnalyzer = () => {

  const pointsHistory: DeltaTimeVector[] = [];
  const changeInMovementHistory = new MaxLengthArray<number>();
  const speedXHistory = new MaxLengthArray<number>();
  const speedYHistory = new MaxLengthArray<number>();
  const directionChangHistory = new MaxLengthArray<number>();
  /** @type {MaxLengthArray<import('./vector.js').sizeDirectionVector>} */
  const angleSpeedMouseHistory = new MaxLengthArray();
  let lastPointInsertedTime = 0;

  const addPointToHistory = (newPoint: Vector2d, time: number) => {
    if (pointsHistory.length === 0) {
      lastPointInsertedTime = time;
    }
    const dt = time - lastPointInsertedTime;
    lastPointInsertedTime = time;
    pointsHistory.unshift({ v: newPoint, dt });
    // limit mouse history time to analyzerHistoryDuration
    let totalHistoryDuration = 0;
    for (let i = 0; i < pointsHistory.length; i++) {
      totalHistoryDuration += pointsHistory[i].dt;
      if (totalHistoryDuration > analyzerHistoryDuration) {
        pointsHistory.length = i + 1;
        break;
      }
    }
    // and consequently all the other history arrays
    [
      changeInMovementHistory,
      speedXHistory,
      speedYHistory,
      directionChangHistory,
      angleSpeedMouseHistory
    ].forEach((array) => {
      array.maxLength = pointsHistory.length;
    });

    if (pointsHistory.length < 3) {
      return;
    }

    const pp1 = pointsHistory[0];
    const pp2 = pointsHistory[1];
    const pp3 = pointsHistory[2];

    const deltaVector = sustract(pp2.v, pp1.v);
    // delta dir / distance latest
    const sdVector = {
      size: size(deltaVector),
      direction: direction(deltaVector)
    }
    // delta dir / distance previous
    const deltaVector2 = sustract(pp3.v, pp2.v);
    const sdVector2 = {
      size: size(deltaVector2),
      direction: direction(deltaVector2)
    }

    angleSpeedMouseHistory.unshift(sdVector);

    // it needs a shaping function where change between 1 and 0 (and vice-versa) is zero
    const deltaTheta = Math.abs(sdVector.direction - sdVector2.direction);
    // still need to figure it out
    let changeInDirection = Math.tan(deltaTheta / 2);
    if (changeInDirection > 1000) {
      changeInDirection = 1000;
    }
    if (changeInDirection < -1000) {
      changeInDirection = -1000;
    }

    directionChangHistory.unshift(changeInDirection);

    includeInBpmAnalysis(directionChangHistory, 0, time);


    if (pp2 && pp3) {
      // change of movement measurement
      const prevDelta = sustract(pp2.v, pp3.v);
      const extrapolated = add(pp1.v, prevDelta);
      const changeInMovement = distance(extrapolated, newPoint);
      changeInMovementHistory.unshift(changeInMovement);
      // includeInBpmAnalysis(changeInMovementHistory, 0.09, time);
    }

    const [speedX, speedY] = sustract(pp1.v, pp2.v);

    speedXHistory.unshift(speedX);
    speedYHistory.unshift(speedY);

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

    context.clearRect(0, 0, width, height);
    // draw mouse history 2d
    context.beginPath();
    context.moveTo(...vectorToScreenScale(pointsHistory[0].v, { width, height }));

    for (let i = 1; i < pointsHistory.length; i++) {
      const point = pointsHistory[i];
      context.lineTo(...vectorToScreenScale(point.v, { width, height }));
    }
    context.stroke();

    // plotter rect
    const plotHeight = 200;
    const plotRect = {
      x: 0,
      y: height - plotHeight,
      width: width,
      height: plotHeight,
    }

    context.strokeStyle = 'white';
    context.fillStyle = 'none';
    context.strokeRect(plotRect.x, plotRect.y, plotRect.width, plotRect.height);

    // plot stuff
    context.strokeStyle = 'orange';
    plotter(context, plotRect, directionChangHistory, 0.5);

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
    addPointToHistory
  };
}
export default newMovementAnalyzer;