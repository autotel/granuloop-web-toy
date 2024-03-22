import { defineStore } from 'pinia';
import { createPoseEstimator, type KeypointName } from '../PoseEstimator';


export const usePoseStore = defineStore('pose', () => {
    const poseEstimator = createPoseEstimator();
    const getPoints = (...p: KeypointName[]) => {
        const ipe = poseEstimator.initialized;
        if (ipe) {
            return ipe.getPoints(...p);
        }
        return false;
    }
    const getTriangle = (a: KeypointName, b: KeypointName, c: KeypointName) => {
        return getPoints(a, b, c);
    }
    const getLine = (a: KeypointName, b: KeypointName) => {
        return getPoints(a, b);
    }
    
    return {
        poseEstimator,
        getPoints,
        getTriangle,
        getLine,
    };

})
