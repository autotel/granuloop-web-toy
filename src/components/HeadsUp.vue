<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue';
import { usePoseStore } from '../stores/pose';
import { useVideoSourceStore } from '../stores/videoSource';
const videoSourceStore = useVideoSourceStore();
const pose = usePoseStore();
const fps = ref('...');
const showStartCaptureButton = ref(false);
const confidenceThreshold = ref(0.5);
const poseInitd = ref(false);

watch(
    () => pose.poseEstimator.initialized && !videoSourceStore.stream,
    (res) => {
        console.log('showStartCaptureButton', res);
        showStartCaptureButton.value = res;
        const initdEstimator = pose.poseEstimator.initialized;
        if (initdEstimator) {
            confidenceThreshold.value = initdEstimator.confidenceThreshold;
        }
    }
);

watch(confidenceThreshold, () => {
    const initdEstimator = pose.poseEstimator.initialized;
    if (initdEstimator) {
        initdEstimator.confidenceThreshold = confidenceThreshold.value;
    }
});

setInterval(() => {
    const initdPoseEstimator = pose.poseEstimator.initialized;
    if (initdPoseEstimator) {
        fps.value = initdPoseEstimator.getFrameRate();
        poseInitd.value = true;
    }
}, 1000);
</script>
<template>
    <div class="hud">
        <template v-if="!videoSourceStore.stream">
            <button @click="videoSourceStore.startCapture">Start Capture</button>
        </template>
        <template v-if="poseInitd">
            <div class="hud__fps">
                <span class="hud__fps__label">FPS:</span>
                <span class="hud__fps__value">{{ fps }}</span>
            </div>
            <div id="confidence-threshold-input" style="display:flex">
                <label for="confidence-threshold">ct.</label>
                <input type="range" id="confidence-threshold" name="confidence-threshold" min="0" max="1" step="0.01"
                    v-model="confidenceThreshold" />
                <span>{{ confidenceThreshold }}</span>
            </div>
        </template>
    </div>
</template>
<style scoped>
.hud {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 100;
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background-color: rgba(0, 0, 0, 0.5);
    color: white;
    font-size: 1.5rem;
    font-family: sans-serif;
    flex-wrap: nowrap;
}
</style>
