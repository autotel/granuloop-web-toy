import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs-core';
export type KeypointName =
    'left_ear' |
    'right_ear' |
    'left_eye' |
    'right_eye' |
    'left_shoulder' |
    'right_shoulder' |
    'left_hip' |
    'right_hip' |
    'left_elbow' |
    'right_elbow' |
    'left_ankle' |
    'right_ankle' |
    'left_wrist' |
    'right_wrist' |
    'left_knee' |
    'right_knee' |
    // made up ones
    'neck' |
    'head_center'

export interface InitializedPoseEstimator {
    getFrameRate: () => string;
    lastPose: poseDetection.Pose;
    detectorFrame: () => Promise<void>;
    getTriangle: (a: KeypointName, b: KeypointName, c: KeypointName) => [number, number, number, number, number, number] | false;
    getLine: (from: KeypointName, to: KeypointName) => [number, number, number, number] | false;
    getPoints: (...p: KeypointName[]) => number[] | false;
    getLines: () => [number, number, number, number][];
    htmlVideoElement: HTMLVideoElement;
    confidenceThreshold: number;
}

type EstimConfig = poseDetection.PoseNetEstimationConfig | poseDetection.BlazePoseTfjsEstimationConfig | poseDetection.BlazePoseMediaPipeEstimationConfig | poseDetection.MoveNetEstimationConfig;

export function createPoseEstimator() {

    let lastPose: poseDetection.Pose = {
        keypoints: [],
        score: 0
    }
    let lastTime = new Date().getTime();
    let initialized: InitializedPoseEstimator | false = false;
    let initializing = false;
    const lastDeltaTimes: number[] = [];

    const timestamp = (time: number) => {
        lastDeltaTimes.push(time - lastTime);
        lastTime = time;
        if (lastDeltaTimes.length > 10) {
            lastDeltaTimes.shift();
        }
    }

    const getFrameRate = () => {
        if (lastDeltaTimes.length === 0) {
            return '...';
        }
        return (1000 / (lastDeltaTimes.reduce((a, b) => a + b, 0) / lastDeltaTimes.length)).toFixed(2);
    }

    const estimationConfig = {
        flipHorizontal: false,
        maxPoses: 1,
        scoreThreshold: 0.1,
    }

    type InitResolver = (value: InitializedPoseEstimator) => void;
    const initWaiters: InitResolver[] = [];
    const waitInit = (): Promise<InitializedPoseEstimator> => {
        if (initialized) {
            return Promise.resolve(initialized);
        }
        const p = new Promise<InitializedPoseEstimator>((resolve: InitResolver) => {
            initWaiters.push(resolve);
        });
        return p;
    }

    const init = async (htmlVideoElement: HTMLVideoElement): Promise<InitializedPoseEstimator> => {
        let video = htmlVideoElement;
        if(initializing || initialized){
            console.log("already initializing or initialized, only setting video element");
            return waitInit();
        }

        console.log("waiting tf ready");
        await tf.ready();
        console.log("waiting detector");
        const detector = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            {
                runtime: 'tfjs',
                enableSmoothing: true,

            });
        console.log("detector ready");

        const initializedDetectorFrame = async () => {
            await detectorFrame(video, detector);
        }
        const readyPoseEstimator = {
            getFrameRate,
            get lastPose() {
                return lastPose;
            },
            detectorFrame: initializedDetectorFrame,
            getTriangle,
            getLine,
            getPoints,
            getLines,
            set confidenceThreshold(v: number) {
                estimationConfig.scoreThreshold = v;
            },
            get confidenceThreshold() {
                return estimationConfig.scoreThreshold;
            },
            get htmlVideoElement() {
                return video;
            },
            set htmlVideoElement(v: HTMLVideoElement) {
                video = v;
            }
        }
        initWaiters.forEach((resolve) => {
            resolve(readyPoseEstimator);
        });
        initialized = readyPoseEstimator;
        return readyPoseEstimator;
    }
    const detectorFrame = async (video: HTMLVideoElement, detector: poseDetection.PoseDetector) => {
        if (video.readyState < 2) {
            await new Promise((resolve) => {
                console.log('waiting for video to load');
                video.onloadeddata = () => {
                    resolve(video);
                };
            });
        }
        const pose = await detector.estimatePoses(video, estimationConfig)
        // For some reason the scoreTrheshold setting is being ignored, thus the fitlering.
        const filteredKeypoints = pose[0].keypoints.filter((kp) => kp.score && kp.score > estimationConfig.scoreThreshold);
        lastPose = {
            ...pose[0],
            keypoints: filteredKeypoints,
        }

        const neck = getLine('left_shoulder', 'right_shoulder');

        if (neck) {
            const avgx = (neck[0] + neck[2]) / 2;
            const avgy = (neck[1] + neck[3]) / 2;
            lastPose.keypoints.push({
                name: 'neck',
                x: avgx,
                y: avgy
            });
        }
        const headCenter = getLine('left_ear', 'right_ear');
        if (headCenter) {
            const avgx = (headCenter[0] + headCenter[2]) / 2;
            const avgy = (headCenter[1] + headCenter[3]) / 2;
            lastPose.keypoints.push({
                name: 'head_center',
                x: avgx,
                y: avgy
            });
        }

        const now = new Date().getTime();
        timestamp(now);
    }

    // get all the keypoints or false if either is unavailable
    const getPoints = (
        ...p: KeypointName[]
    ): number[] | false => {
        const testArr = p;
        const { keypoints } = lastPose;
        const expectedLength = p.length * 2;
        const points: number[] = [];
        for (let i = 0; i < keypoints.length; i++) {
            const name = keypoints[i].name;
            if (!name) continue;
            if (testArr.includes(keypoints[i].name as KeypointName)) {
                points.push(keypoints[i].x, keypoints[i].y);
            }
            if (points.length === expectedLength) {
                return points;
            }
        }
        return false;
    }
    const getTriangle = (a: KeypointName, b: KeypointName, c: KeypointName) => {
        return getPoints(a, b, c) as [number, number, number, number, number, number] | false;
    }
    const getLine = (from: KeypointName, to: KeypointName) => {
        return getPoints(from, to) as [number, number, number, number] | false;
    }
    const getLines = (): [number, number, number, number][] => {
        const lines: [number, number, number, number][] = [];
        const segs = [
            ['left_ear', 'right_ear'],
            ['left_eye', 'right_eye'],
            ['left_shoulder', 'right_shoulder'],
            ['right_shoulder', 'right_hip'],
            ['left_shoulder', 'left_hip'],
            ['left_elbow', 'left_shoulder'],
            ['left_elbow', 'left_wrist'],
            ['right_elbow', 'right_shoulder'],
            ['right_elbow', 'right_wrist'],
            ['left_hip', 'right_hip'],
            ['left_hip', 'left_knee'],
            ['left_knee', 'left_ankle'],
            ['right_hip', 'right_knee'],
            ['right_knee', 'right_ankle'],
            // and the made up ones
            ['neck', 'head_center']
        ] as [KeypointName, KeypointName][];


        for (const [from, to] of segs) {
            const tp = getLine(from, to);
            if (tp) {
                lines.push(tp);
            }
        }
        return lines;
    }
    return {
        init,
        waitInit,
        get initialized() {
            return initialized;
        }
    }
}