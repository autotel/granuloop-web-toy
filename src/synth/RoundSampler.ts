type DamnTimerType = ReturnType<typeof setTimeout> | ReturnType<typeof setTimeout> | number;

export interface SampleFileDefinition {
    name: string;
    path: string;
}

export interface GrainRealtimeParams {
    fadeInTime: number;
    sustainTime: number;
    fadeOutTime: number;
    grainsPerSecond: number;
    /** offset start time within the spl length 
     * (i.e. startTimeSeconds = sampleOffsetTime * sampleDuration) 
     **/
    sampleOffsetTime: number;
    playbackRate: number;
}

interface SoundGrain {
    output: AudioNode;
    /**
     * @param sampleStartTime - time within the sample where to jump at the start of the playback, in seconds
     * @param scheduleTime - time when to start the playback
     * @param targetFrequency - desired perceived frequency of the sound grain
     * @param params - asr envelope for the grain
     */
    play: (
        sampleStartTime: number,
        scheduleTime: number,
        params: GrainRealtimeParams
    ) => void;
    destroy: () => void;
}


/**
 * @param audioContext - audio context
 * @param sampleBuffer - buffer of the sample to be used as a source for the sound grain
 */
const getSoundGrain = (
    audioContext: AudioContext,
    sampleBuffer: AudioBuffer,
): SoundGrain => {
    const bufferSource = audioContext.createBufferSource();
    bufferSource.buffer = sampleBuffer;
    const gainNode = audioContext.createGain();
    bufferSource.connect(gainNode);
    gainNode.gain.value = 0;
    return {
        output: gainNode,
        play(
            sampleStartTime: number,
            scheduleTime: number,
            params: GrainRealtimeParams
        ) {

            const interval1 = params.fadeInTime;
            const interval2 = interval1 + params.sustainTime;
            const interval3 = interval2 + params.fadeOutTime;

            bufferSource.playbackRate.value = params.playbackRate;
            bufferSource.start(scheduleTime, sampleStartTime, interval3);
            gainNode.gain.setValueAtTime(0, scheduleTime);
            gainNode.gain.linearRampToValueAtTime(1, scheduleTime + interval1);
            gainNode.gain.linearRampToValueAtTime(1, scheduleTime + interval2);
            gainNode.gain.linearRampToValueAtTime(0, scheduleTime + interval3);

            bufferSource.addEventListener('ended', this.destroy);
        },
        destroy() {
            bufferSource.stop();
            bufferSource.disconnect();
            gainNode.disconnect();
            bufferSource.removeEventListener('ended', this.destroy);
        }
    };

}

/**
 * it would be possible to schedule all the grain start and end points at the start of the
 * trigger event. However, being able to tweak a parameter mid-note is appreciated, which
 * is why the notes are scheduled at small time intervals, using the latest parameter values.
 */
class Scheduler {
    private currentTimer: false | DamnTimerType = false;
    /** in seconds */
    frameLength: number = 0.1;
    scheduleStart: (absoluteStartTime: number) => void;
    scheduleStop: (absoluteStopTime: number) => void;
    stop: () => void;
    onStopCallback = () => { };
    constructor(
        audioContext: AudioContext,
        schedulingFunction: (frameStartTime: number, frameEndTime: number) => void
    ) {
        let isRunning = false;
        let nextFrameStartTime = 0;
        let endsAt = Infinity;

        this.scheduleStart = (absoluteStartTime: number) => {
            this.stop();
            nextFrameStartTime = absoluteStartTime;
            endsAt = Infinity;
            isRunning = true;
            frameFunction();
        }

        this.scheduleStop = (absoluteStopTime: number) => {
            endsAt = absoluteStopTime;
        }

        this.stop = () => {
            isRunning = false;
            clearTimeout(this.currentTimer as DamnTimerType);
        }

        const frameFunction = () => {
            if (!isRunning) return;
            const currentFrameStart = nextFrameStartTime;
            nextFrameStartTime += this.frameLength;
            if (nextFrameStartTime > endsAt) {
                nextFrameStartTime = endsAt;
            }
            schedulingFunction(currentFrameStart, nextFrameStartTime);

            if (nextFrameStartTime >= endsAt) {
                this.stop();
                return;
            }

            const interval = (nextFrameStartTime - audioContext.currentTime) * 1000;
            this.currentTimer = setTimeout(frameFunction, interval);
        }
    }
}


class SampleSource {
    private audioContext: AudioContext;
    sampleBuffer?: AudioBuffer;
    isLoaded: boolean = false;
    isLoading: boolean = false;

    load = async () => {
        console.error("samplesource constructed wrong");
    };

    constructor(audioContext: AudioContext, sampleDefinition: SampleFileDefinition) {
        this.audioContext = audioContext;

        this.load = async () => {
            console.groupCollapsed("header: " + sampleDefinition.name);
            console.log("load", sampleDefinition.name, sampleDefinition.path);
            if (this.isLoaded || this.isLoading) throw new Error("redundant load call");
            this.isLoading = true;
            // const fetchHeaders = new Headers();
            const response = await fetch(sampleDefinition.path, {
                cache: "default",
            })
            response.headers.forEach((value, key) => {
                if (key.match('date')) {
                    console.log("loaded:", (Date.now() - Date.parse(value)) / 1000 / 60, " minutes ago");
                } else if (key.match('cache-control')) {
                    console.log(key + ":", value);
                }
            });
            console.log("ready");
            const arrayBuffer = await response.arrayBuffer();
            this.sampleBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.isLoaded = true;
            this.isLoading = false;
            console.groupEnd();

        }
    }
}

const grainScheduler = (
    audioContext: AudioContext,
    grainRealtimeParams: GrainRealtimeParams,
    output: AudioNode,
) => {
    let latestGrainStartTime = 0;
    let sampleSource: SampleSource | undefined;

    const scheduler = new Scheduler(audioContext, (_frameStartTime, frameEndTime) => {
        const {
            grainsPerSecond,
            sampleOffsetTime,
        } = grainRealtimeParams;

        const grainInterval = 1 / grainsPerSecond;
        let iterNum = 0;
        if (!sampleSource?.sampleBuffer) return;

        for (let time = latestGrainStartTime; time < frameEndTime; time += grainInterval) {
            const grain = getSoundGrain(
                audioContext,
                sampleSource.sampleBuffer
            );
            if (time <= latestGrainStartTime) continue;
            latestGrainStartTime = time;
            grain.play(
                sampleOffsetTime,
                latestGrainStartTime,
                grainRealtimeParams
            );

            grain.output.connect(output);
            iterNum++;
        }
    });

    const setSampleSource = (_sampleSource: SampleSource) => {
        sampleSource = _sampleSource;
    }

    return {
        ...scheduler,
        setSampleSource,
    }

}

type GrainScheduler = ReturnType<typeof grainScheduler>;

const getProxyValueForTime = (arraySection: Float32Array, startIndex: number, endIndex: number) => {
    let max = -Infinity;
    let min = Infinity;
    for (let i = startIndex; i < endIndex; i++) {
        if (arraySection[i] > max) max = arraySection[i];
        if (arraySection[i] < min) min = arraySection[i];
    }
    return -min > max ? min : max;
}

export const roundSampler = (
    audioContext: AudioContext,
    sampleDefinition: SampleFileDefinition,
    grainRealtimeParams: GrainRealtimeParams
) => {
    const output = audioContext.createGain();
    output.gain.value = 0.5;
    let latestGrainStartTime = 0;
    let currentSampleSource = new SampleSource(audioContext, sampleDefinition);
    let currentSampleStartOffsetSeconds = 0;
    let currentFragmentBuffer:AudioBuffer | undefined;
    currentSampleSource.load();

    const myScheduler: GrainScheduler = grainScheduler(
        audioContext,
        grainRealtimeParams,
        output
    );

    const stop = () => {
        myScheduler.stop();
    }


    const setSample = async (sample: SampleFileDefinition) => {
        const newSampleSource = new SampleSource(audioContext, sample);
        await newSampleSource.load();
        currentSampleSource = newSampleSource;
        return currentSampleSource;
    }

    const getDuration = () => {
        if (!currentSampleSource?.sampleBuffer) return 0;
        return currentSampleSource.sampleBuffer.duration;
    }

    const updateFragmentBuffer = () => {
        const sampleBuffer = currentSampleSource.sampleBuffer;
        if(!sampleBuffer) return new Float32Array(0);
        const sampleRate = sampleBuffer.sampleRate;
        
        const {
            sampleOffsetTime,
            // to-do
            sustainTime,
            fadeInTime,
            fadeOutTime,
            grainsPerSecond,
        } = grainRealtimeParams;
        const samplePortionDuration = fadeInTime + sustainTime + fadeOutTime;
        let sampleChannelData = sampleBuffer.getChannelData(0);
        let currentSampĺeGateLevel = 0;
        let sampleStartIndex = Math.floor(sampleOffsetTime * sampleRate);
        let sampleEndIndex = Math.min(
            sampleStartIndex + samplePortionDuration * sampleRate,
            sampleChannelData.length
        );
        const waveValues = new Float32Array(sampleChannelData.slice(sampleStartIndex, sampleEndIndex));
        const newFragmentBuffer = audioContext.createBuffer(1, waveValues.length, sampleRate);
        newFragmentBuffer.copyToChannel(waveValues, 0);
        currentFragmentBuffer = newFragmentBuffer;
    }

    const getWaveShape = (pointsCount: number): Float32Array => {
        if (!currentSampleSource?.sampleBuffer) return new Float32Array(pointsCount);
        if (!currentFragmentBuffer) return new Float32Array(pointsCount);
        const waveValues = new Float32Array(pointsCount);
        const currentFragmentValues = currentFragmentBuffer.getChannelData(0);
        const fragmentDuration = currentFragmentBuffer.length;
        const step = fragmentDuration / pointsCount;
        
        for (let i = 0; i < pointsCount; i++) {
            const sampleIndex = Math.floor(i * step);
            if (sampleIndex > fragmentDuration) {
                waveValues[i] = 0;
                continue;
            }
            if (step <= 1) {
                waveValues[i] = currentFragmentValues[sampleIndex];
            } else {
                waveValues[i] = getProxyValueForTime(
                    currentFragmentValues,
                    sampleIndex,
                    Math.min(sampleIndex + step, fragmentDuration)
                );
            }
        }
        return waveValues;
    }

    return {
        setSample,
        getWaveShape,
        getDuration,
        updateFragmentBuffer,
        inUse: false,
        output,
        scheduleStart(
            absoluteStartTime: number,
        ) {

            if (this.inUse) throw new Error("Polyphony fail: voice already in use");

            this.inUse = true;

            if (!currentSampleSource?.sampleBuffer) throw new Error("No sample source loaded");
            // transform proportional start time to real start time
            currentSampleStartOffsetSeconds = currentSampleSource.sampleBuffer.duration * grainRealtimeParams.sampleOffsetTime;

            latestGrainStartTime = absoluteStartTime;
            myScheduler.scheduleStart(absoluteStartTime);
            myScheduler.onStopCallback = () => {
                this.inUse = false;
            }
            return this;
        },
        scheduleEnd(absoluteStopTime: number) {
            myScheduler.scheduleStop(absoluteStopTime);
            return this;
        },
        stop,
    }
}