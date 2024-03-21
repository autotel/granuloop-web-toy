<script setup lang="ts">
import { useAudioContextStore } from '../stores/audioContextStore';
import { type GrainRealtimeParams, roundSampler, type RoundSampler } from '../synth/RoundSampler';
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue';
import VeryBasicDraggable from './VeryBasicDraggable.vue';

const sizeParameters = ref({
    rad: 0,
    vMult: 0,
    cx: 0,
    cy: 0,
});

const windowResizedListener = () => {
    console.log('windowResizedListener');
    const rad = Math.min(window.innerWidth, window.innerHeight) * 0.4;
    const midHeight = window.innerHeight / 2;
    const midWidth = window.innerWidth / 2;
    const vMult = rad * 0.2;
    const cx = midWidth;
    const cy = midHeight;
    sizeParameters.value = { rad, vMult, cx, cy };

};

const audioContextStore = useAudioContextStore();

const params = {
    fadeInTime: 0,
    sustainTime: 10000,
    fadeOutTime: 0,
    grainsPerSecond: 2,
    sampleOffsetTime: 0,
    playbackRate: 1,
};

const sampleDefinition = {
    name: 'test loop',
    path: '17927__sebpiga__32-cumbia-rapida.mp3',
}

const myTestSampler = ref(
    roundSampler(audioContextStore.audioContext, sampleDefinition, params)
);

const waveForm = ref<Float32Array | null>(null);
const waveD = computed(() => {
    const { rad, vMult, cx, cy } = sizeParameters.value;
    if (waveForm.value) {
        const steps = waveForm.value.length;
        const radialIncrement = Math.PI * 2 / steps;
        let d = '';
        for (let i = 0; i < steps; i++) {
            const rxi = radialIncrement * i;
            const radValX = rad + waveForm.value[i] * vMult;
            const x = Math.cos(rxi) * radValX + cx;
            const y = Math.sin(rxi) * radValX + cy;
            const c = i === 0 ? 'M' : 'L';
            d += `${c}${x},${y} `;
        }
        return d;
    }
    return '';
});

const updateWaveForm = () => {
    myTestSampler.value.updateFragmentBuffer();
    waveForm.value = myTestSampler.value.getWaveShape(10000);
};

watch(() => params, (newParams) => {
    updateWaveForm();
});

audioContextStore.audioContextPromise.then(() => {
    updateWaveForm();
});

const draggableMoved = (newPos: { x: number, y: number }) => {

    const { cx, cy } = sizeParameters.value;
    // console.log('draggableMoved', { x: newPos.x, y: newPos.y });
    const x = newPos.x - cx;
    const y = newPos.y - cy;
    const rad = Math.sqrt(x * x + y * y);
    const angle = Math.atan2(y, x);
    const portion = ((1 + (angle / Math.PI)) / 2);
    const newSampleOffsetTime = portion * myTestSampler.value.getDuration();
    const newSampleSustainTime = rad?100 / rad:0;
    Object.assign(params, { 
        sampleOffsetTime: newSampleOffsetTime ,
        sustainTime: newSampleSustainTime
        
    });
    updateWaveForm();

};


onMounted(() => {
    windowResizedListener();
    window.addEventListener('resize', windowResizedListener);
});
onBeforeUnmount(() => {
    window.removeEventListener('resize', windowResizedListener);
});
</script>
<template>
    <svg width="100vw" height="100vh">
        <circle :cx="sizeParameters.cx" :cy="sizeParameters.cy" :r="sizeParameters.rad" fill="none"
            stroke="rgba(0,0,0,0.3)" stroke-dasharray="2 2" />
        <path v-if="waveForm" :d="waveD" fill="none" stroke="black" />
        <VeryBasicDraggable :onPositionChanged="draggableMoved" />
    </svg>
</template>
<style>
svg {
    position: absolute;
    top: 0;
    left: 0;
}
</style>
