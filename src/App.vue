<script setup lang="ts">
import RoundSamplerDisplay from './components/RoundSamplerDisplay.vue';
import TensorFlowPose from './components/TensorFlowPose.vue';
import HeadsUp from './components/HeadsUp.vue';
import { onBeforeUnmount, ref } from 'vue';
import { usePoseStore } from './stores/pose';

const animString = ref('... ');
const poseStore = usePoseStore();
const interval = setInterval(() => {
    const asArray = [...animString.value]
    const last = asArray.pop();
    asArray.unshift(last!);
    animString.value = asArray.join('');
}, 200);

onBeforeUnmount(() => {
    clearInterval(interval);
});
const waitingPoseEstimator = ref(true);
poseStore.poseEstimator.waitInit().then(() => {
    waitingPoseEstimator.value = false;
});

</script>

<template>

    <div>
        <div class="viewport">
            <TensorFlowPose />
            <RoundSamplerDisplay />
        </div>
    </div>
        <HeadsUp />
    <template v-if="waitingPoseEstimator">
        Loading pose estimator {{ animString }}
    </template>
</template>

<style scoped>
.viewport {
    position: fixed;
    width: 100vw;
    height: 100vh;
    top: 0;
    left: 0;
    /** mirror */
    transform: scaleX(-1);
}
.viewport canvas, .viewport video {
    mix-blend-mode:difference;
}

</style>
