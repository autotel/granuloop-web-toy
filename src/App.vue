<script setup lang="ts">
import RoundSamplerDisplay from './components/RoundSamplerDisplay.vue';
import TensorFlowPose from './components/TensorFlowPose.vue';
import HeadsUp from './components/HeadsUp.vue';
import { onBeforeUnmount, ref } from 'vue';

const animString = ref('... ');

const interval = setInterval(() => {
    const asArray = [...animString.value]
    const last = asArray.pop();
    asArray.unshift(last!);
    animString.value = asArray.join('');
}, 200);

onBeforeUnmount(() => {
    clearInterval(interval);
});


</script>

<template>
    <Suspense>

        <TensorFlowPose />
        <template #fallback>
            Loading pose estimator {{ animString }}
        </template>
    </Suspense>
    <RoundSamplerDisplay />
    <HeadsUp />
</template>

<style scoped></style>
