<script setup lang="ts">
import { onMounted, ref, watch, watchEffect } from 'vue';
import { usePoseStore } from '../stores/pose';
import { useVideoSourceStore } from '../stores/videoSource';

const poseStore = usePoseStore();
const videoSourceStore = useVideoSourceStore();
let videoElement = ref<HTMLVideoElement | false>(false);
let poseDetectionIsRunning = ref(false);
let canvasElement = ref<HTMLCanvasElement | false>(false);
let context: CanvasRenderingContext2D | null = null;
let requestedAnimationFrame: number | null = null;
let requestedVideoFrame: number | null = null;

const resizeCanvas = () => {
    if (!canvasElement.value) return;
    const video = videoElement.value;
    if (!video) return;
    canvasElement.value.width = video.videoWidth;
    canvasElement.value.height = video.videoHeight;
}


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
    if (!videoSourceStore.stream) return;
    if (!canvasElement.value) return;

    if (!context) {
        context = canvasElement.value.getContext('2d');
    }
    if (!context) return;

    if (!videoFrameCallbackSupported) {
        detectorFrame();
    }

    context.strokeStyle = '#00FF00';
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
        videoElement.value.addEventListener('loadedmetadata', resizeCanvas);
        poseStore.poseEstimator.init(videoElement.value);
    }else{
        console.warn("videoElement is "+videoElement.value);
    }
}
watch(videoElement, videoElementChanged);

watchEffect(() => {
    if (canvasElement.value) {
        resizeCanvas();
    }
});

onMounted(() => {
    videoElementChanged();
});

</script>
<template>
    <div>
        <div class="viewport">
            <video ref="videoElement" autoplay></video>
            <canvas ref="canvasElement"></canvas>
            <!-- {{ poseDetectionIsRunning }}, {{ drawnPoints }} -->
        </div>
        <template v-if="videoSourceStore.stream">
        </template>
    </div>
</template>

<style scoped>
.viewport {
    position: fixed;
    width: 100vw;
    height: 100vh;
    top: 0;
    left: 0;
}

.viewport * {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.viewport video {
    opacity: 0.5;
}
</style>
