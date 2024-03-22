import { defineStore } from 'pinia';
import { useMovementStore } from './movement';
import type { Keypoint } from '@tensorflow-models/pose-detection';
import { angleDegs, twoVectorsAngle } from '@/utils/vector';
import type { Vector2d } from '@/utils/vector';

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
    'neck' |
    'head_center' // made up ones

export const usePoseStore = defineStore('store', () => {
    const movementStore = useMovementStore();

    let points: { [key: string]: [number, number] } = {};
    let lastTime = new Date().getTime();
    const lastDeltaTimes: number[] = [];
    /**
     * timestamp should be called together with the insertion of a new skeleton
     * in order to analyze movement.
     */
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

    const keypoint = (name: string, x: number, y: number) => {
        points[name] = [x, y];
    }

    const keypoints = (keypoints: Keypoint[]) => {
    }

    const getTriangle = (a: KeypointName, b: KeypointName, c: KeypointName): [number, number, number, number, number, number] | false => {
        if (points[a] && points[b] && points[c]) {
            return [points[a][0], points[a][1], points[b][0], points[b][1], points[c][0], points[c][1]];
        }
        return false;
    }

    const getLine = (from: string, to: string): [number, number, number, number] | false => {
        if (points[from] && points[to]) {
            return [points[from][0], points[from][1], points[to][0], points[to][1]];
        }
        return false;
    }

    const reset = () => {
        points = {};
    }

    const getParentKeyPoint = (keypointName: KeypointName) => {
        switch (keypointName) {
            case 'left_eye':
            case 'right_eye':
            case 'left_ear':
            case 'right_ear':
                return 'head_center';
            case 'left_shoulder':
            case 'right_shoulder':
                return 'neck';
            case 'head_center':
                return 'neck';
            case 'left_knee':
                return 'left_hip';
            case 'right_knee':
                return 'right_hip';
            case 'left_ankle':
                return 'left_knee';
            case 'right_ankle':
                return 'right_knee';
            case 'left_wrist':
                return 'left_elbow';
            case 'right_wrist':
                return 'right_elbow';
            case 'right_elbow':
                return 'right_shoulder';
            case 'left_elbow':
                return 'left_shoulder';
            default: return null;
        }
    }

    const testAngle = (
        centerKeypoint: KeypointName,
        k1: KeypointName,
        k2: KeypointName
    ) => {
        const coords = getTriangle(centerKeypoint, k1, k2);
        if (coords) {
            const angle = Math.abs(twoVectorsAngle(
                [coords[0], coords[1]],
                [coords[2], coords[3]],
                [coords[4], coords[5]]
            ) * 180 / Math.PI);
            const pos = [coords[0], coords[1]] as Vector2d;



            return { angle, pos, centerKeypoint };
        }

        return null;
    }

    const getLines = () => {
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
        currentTime: () => lastTime,
        points,
        keypoint,
        getLines,
        getLine,
        reset,
        timestamp,
        getFrameRate,
        testAngle,
    };

})
