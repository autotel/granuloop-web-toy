<script setup lang="ts">
import { ref } from 'vue';
import { usePoseStore } from '../stores/pose';
import { useVideoSourceStore } from '../stores/videoSource';
const videoSourceStore = useVideoSourceStore();
const pose = usePoseStore();
const fps = ref('...');
setInterval(() => {
    fps.value = pose.getFrameRate();
}, 1000);
</script>
<template>
    <div class="hud">

        <template v-if="!videoSourceStore.stream">
        <button @click="videoSourceStore.startCapture">Start Capture</button>
        </template>
        <div class="hud__fps">
            <span class="hud__fps__label">FPS:</span>
            <span class="hud__fps__value">{{ fps }}</span>
        </div>
    </div>
</template>
<style scoped>
.hud {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 100;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background-color: rgba(0, 0, 0, 0.5);
    color: white;
    font-size: 1.5rem;
    font-family: sans-serif;
}
</style>
