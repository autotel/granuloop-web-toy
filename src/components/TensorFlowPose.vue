<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue';
import { usePoseStore } from '../stores/pose';
import { useVideoSourceStore } from '../stores/videoSource';
import { useViewportStore } from '../stores/viewportStore';

const poseStore = usePoseStore();
const videoSourceStore = useVideoSourceStore();
let videoElement = ref<HTMLVideoElement | undefined>(undefined);
let poseDetectionIsRunning = ref(false);
let canvasElement = ref<HTMLCanvasElement | false>(false);
let context: CanvasRenderingContext2D | null = null;
let requestedAnimationFrame: number | null = null;
let requestedVideoFrame: number | null = null;
const viewport = useViewportStore();

watchEffect(async () => {
    if (!videoSourceStore.stream) return;
    if (!videoElement.value) return;
    videoElement.value.srcObject = videoSourceStore.stream;
    await videoElement.value.load();
    await videoElement.value.play();
    poseDetectionIsRunning.value = true;
});

watch(poseDetectionIsRunning, async (isRunning) => {
    if (isRunning) {
        detectorFrame();
        drawFrame();
    } else {
        cancelAnimationFrame(requestedAnimationFrame!);
        requestedAnimationFrame = null;
        if (videoElement.value) {
            videoElement.value?.cancelVideoFrameCallback(requestedVideoFrame!);
        }
    }
});

let videoFrameCallbackSupported = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
if (!videoFrameCallbackSupported) {
    console.log('requestVideoFrameCallback not supported, using requestAnimationFrame instead.');
}
const detectorFrame = async () => {

    const video = videoElement.value;
    if (video) {
        if (videoFrameCallbackSupported) {
            requestedVideoFrame = video.requestVideoFrameCallback(detectorFrame);
        } /* else {
            will happen on frame function
        } */
    }
    const poseEstimator = poseStore.poseEstimator.initialized;
    if (poseEstimator) {
        poseEstimator.detectorFrame();
    }

}
const drawFrame = async () => {
    if (!canvasElement.value) return;

    if (!context) {
        context = canvasElement.value.getContext('2d');
    }
    if (!context) return;

    if (!videoFrameCallbackSupported) {
        detectorFrame();
    }

    context.strokeStyle = '#ffcc00';
    context.lineWidth = 2;
    context.clearRect(0, 0, canvasElement.value.width, canvasElement.value.height);
    const initdPoseStore = poseStore.poseEstimator.initialized;
    if (initdPoseStore) {
        const segments = initdPoseStore.getLines();
        for (const segment of segments) {
            context.beginPath();
            context.moveTo(segment[0], segment[1]);
            context.lineTo(segment[2], segment[3]);
            context.stroke();
        }
    }
    if (poseDetectionIsRunning.value) {
        requestedAnimationFrame = requestAnimationFrame(drawFrame);
    }
}
const videoElementChanged = () => {
    console.log("videoElementChanged");
    if (videoElement.value) {
        poseStore.poseEstimator.init(videoElement.value);
    }
    if (videoElement.value?.videoWidth && videoElement.value?.videoHeight) {
        // viewport.resolution.width = videoElement.value.videoWidth;
        // viewport.resolution.height = videoElement.value.videoHeight;
        console.log("videoElement.value.videoWidth", videoElement.value.videoWidth);
    } else {
        console.warn("videoElement is " + videoElement.value);
    }
}
watch(videoElement, videoElementChanged);
watch([
    () => videoElement.value ? videoElement.value.videoWidth : 0,
    () => videoElement.value ? videoElement.value.videoHeight : 0,
], videoElementChanged);




watch(viewport.resolution, () => {
    if (!canvasElement.value) return;
    canvasElement.value.width = viewport.resolution.width;
    canvasElement.value.height = viewport.resolution.height;
});


</script>
<template>
    <div :style="viewport.sizeStyle" class="container">
        <video  ref="videoElement" autoplay></video>
        <canvas  ref="canvasElement"></canvas>
    </div>
</template>

<style scoped>
video {
    /* opacity: 0.5; */
}
.container {
    position: absolute;
    border: solid 1px red;
}
video,
canvas {
    position: absolute;
    width:100%;
    height:100%;
    mix-blend-mode: color-dodge;
}
</style>