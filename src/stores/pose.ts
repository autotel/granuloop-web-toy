import { defineStore } from 'pinia';
import { createPoseEstimator } from '../PoseEstimator';


export const usePoseStore = defineStore('pose', () => {
    const poseEstimator = createPoseEstimator();

    return {
        poseEstimator
    };

})
