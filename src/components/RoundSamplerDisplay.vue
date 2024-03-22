<script setup lang="ts">
import { usePoseStore } from '@/stores/pose';
import { useViewportStore } from '@/stores/viewportStore';
import { throttle } from 'lodash';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useAudioContextStore } from '../stores/audioContextStore';
import { roundSampler } from '../synth/RoundSampler';
const sizeParameters = ref({
    rad: 0,
    vMult: 0,
    cx: 0,
    cy: 0,
});
(() => {
    const rad = Math.min(window.innerWidth, window.innerHeight) * 0.4;
    const midHeight = window.innerHeight / 2;
    const midWidth = window.innerWidth / 2;
    const vMult = rad * 0.2;
    const cx = midWidth;
    const cy = midHeight;
    sizeParameters.value = { rad, vMult, cx, cy };

})()
const viewport = useViewportStore();
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

let canvasElement = ref<HTMLCanvasElement | false>(false);
const waveForm = ref<Float32Array | null>(null);
const waveD = computed(() => {
    const { radius, center } = circleParameters;
    const vMult = radius * 0.2;
    if (waveForm.value) {
        const steps = waveForm.value.length;
        const radialIncrement = Math.PI * 2 / steps;
        let d = '';
        for (let i = 0; i < steps; i++) {
            const rxi = radialIncrement * i;
            const radValX = radius + waveForm.value[i] * vMult;
            const x = Math.cos(rxi) * radValX + center.x;
            const y = Math.sin(rxi) * radValX + center.y;
            const c = i === 0 ? 'M' : 'L';
            d += `${c}${x},${y} `;
        }
        return d;
    }
    return '';
});
const drawWaveInCanvas = () => {

    if (!canvasElement.value) return;
    const ctx = canvasElement.value.getContext('2d');
    ctx?.clearRect(0, 0, canvasElement.value.width, canvasElement.value.height);
    if (!ctx) return;
    const { radius, center } = circleParameters;
    const vMult = radius * 0.2;
    ctx.fillStyle = '#222222';
    // ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (waveForm.value) {
        const steps = waveForm.value.length;
        const radialIncrement = Math.PI * 2 / steps;
        for (let i = 0; i < steps; i++) {
            const rxi = radialIncrement * i;
            const radValX = radius + waveForm.value[i] * vMult;
            const x = Math.cos(rxi) * radValX + center.x;
            const y = Math.sin(rxi) * radValX + center.y;
            if (i === 0) {
                ctx.beginPath();
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
    }
    ctx.stroke();
    ctx.fill();
};
watch(waveForm, drawWaveInCanvas);


audioContextStore.audioContextPromise.then(() => {
    myTestSampler.value.output.connect(audioContextStore.audioContext.destination);
    myTestSampler.value.scheduleStart(audioContextStore.audioContext.currentTime);
});

const circleParameters = {
    center: { x: 0, y: 0 },
    radiusPoint: { x: 0, y: 0 },
    thirdPoint: { x: 0, y: 0 },
    radius: 0,
    perimeter: 0,
}

const recalc = throttle(() => {
    const {
        center, radiusPoint, thirdPoint
    } = circleParameters;

    const radius = Math.sqrt(
        Math.pow(center.x - radiusPoint.x, 2) +
        Math.pow(center.y - radiusPoint.y, 2)
    );
    const perimeter = Math.PI * 2 * radius;
    const durationSecs = perimeter / 10000;

    const thirdPointDx = thirdPoint.x - center.x;
    const thirdPointDy = thirdPoint.y - center.y;

    const angle = Math.atan2(thirdPointDy, thirdPointDx);
    const portion = ((1 - (angle / Math.PI)) / 2);
    // console.log(portion);
    try {
        const newSampleOffsetTime = portion;
        //  * (
        //     myTestSampler.value.getDuration()
        // );
        Object.assign(params, {
            sampleOffsetTime: newSampleOffsetTime,
            sustainTime: durationSecs,
        });
        Object.assign(circleParameters, { radius, perimeter });
    } catch (e) {
        // console.error(e);
    }

    myTestSampler.value.updateFragmentBuffer();
    waveForm.value = myTestSampler.value.getWaveShape(circleParameters.perimeter * 2);
}, 10);

const armLeftMoved = (newPos: { x: number, y: number }) => {
    // console.log('armLeftMoved', { x: newPos.x, y: newPos.y });
    circleParameters.thirdPoint = newPos;
    recalc();
};

const armRightMoved = (newPos: { x: number, y: number }) => {
    // console.log('armRightMoved', { x: newPos.x, y: newPos.y });
    circleParameters.radiusPoint = newPos;
    recalc();
};

const chestMoved = (newPos: { x: number, y: number }) => {
    // console.log('chestMoved', { x: newPos.x, y: newPos.y });
    circleParameters.center = newPos;
    recalc();
};


const poseStore = usePoseStore();
setInterval(() => {
    const points = poseStore.getTriangle('left_wrist', 'neck', 'right_wrist');
    if (points) {
        const [lelbowx, lelbowy, neckx, necky, relbowx, relbowy] = points;
        armLeftMoved({ x: lelbowx, y: lelbowy });
        armRightMoved({ x: relbowx, y: relbowy });
        chestMoved({ x: neckx, y: necky });
    }
}, 200);

(() => {
    const { cx, cy, rad } = sizeParameters.value;
    armLeftMoved({ x: cx - rad, y: cy });
    armRightMoved({ x: cx + rad, y: cy });
    chestMoved({ x: cx, y: cy });
})()

onMounted(() => {
});
onBeforeUnmount(() => {
});

const fakeArmD = ({ x, y }: { x: number, y: number }) => {
    const { center, radiusPoint } = circleParameters;
    const distanceVec = { x: x - center.x, y: y - center.y };
    const totalArmDistance = sizeParameters.value.rad * 0.6;

    const q = Math.sqrt(Math.pow(distanceVec.x, 2) + Math.pow(distanceVec.y, 2));
    const y3 = (center.y + y) / 2;
    const x3 = (center.x + x) / 2;

    const tt = Math.sqrt(Math.pow(totalArmDistance, 2) - Math.pow(q / 2, 2))
    const tt2 = -Math.sqrt(Math.pow(totalArmDistance, 2) - Math.pow(q / 2, 2))

    const elbow1 = {
        x: x3 + tt * (center.y - y) / q,
        y: y3 + tt * (x - center.x) / q
    };
    const elbow2 = {
        x: x3 + tt2 * (center.y - y) / q,
        y: y3 + tt2 * (x - center.x) / q
    };
    let elbow = elbow1;
    if (elbow1.y < center.y) {
        elbow = elbow2;
    }
    const d = `M${center.x},${center.y} L${elbow.x},${elbow.y} L${x},${y}`;
    return d;
}


const resizeCanvas = () => {
    if (!canvasElement.value) return;
    canvasElement.value.width = viewport.size.width;
    canvasElement.value.height = viewport.size.height;
}

watch(viewport.size, resizeCanvas);
watch(canvasElement, resizeCanvas);


</script>
<template>
    <canvas ref="canvasElement"></canvas>
    <!-- <svg 
        :width="viewport.size.width" 
        :height="viewport.size.height"
    >
        <circle :cx="circleParameters.center.x" :cy="circleParameters.center.y" :r="circleParameters.radius" fill="none"
            stroke-dasharray="2 2" />
        <path v-if="waveForm" :d="waveD" fill="none" />
        <template v-if="!poseStore.poseEstimator.initialized">
            <path :d="fakeArmD(circleParameters.radiusPoint)" />
            <path :d="fakeArmD(circleParameters.thirdPoint)" />
            <VeryBasicDraggable :onPositionChanged="armLeftMoved" :initial-position="circleParameters.thirdPoint" />
            <VeryBasicDraggable :onPositionChanged="chestMoved" :initial-position="circleParameters.center" />
            <VeryBasicDraggable :onPositionChanged="armRightMoved" :initial-position="circleParameters.radiusPoint" />
        </template>
</svg> -->
</template>
<style>
svg {
    position: absolute;
    top: 0;
    left: 0;
}

svg * {
    stroke: black;
    fill: transparent;
}

@media (prefers-color-scheme: dark) {
    svg * {
        stroke: white;
    }
}
</style>
