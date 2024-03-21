<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';

const pos = ref({ x: 0, y: 0 });
const dragging = ref(false);
const dragEl = ref<HTMLElement | null>(null);

const props = defineProps<{
    onPositionChanged: (newPos: { x: number, y: number }) => void;
}>();

watch(pos, (newPos) => {
    props.onPositionChanged(newPos);
});

const handleMouseDown = (e: MouseEvent) => {
    dragging.value = true;
    pos.value = { x: e.clientX, y: e.clientY };
};

const handleMouseMove = (e: MouseEvent) => {
    if (dragging.value) {
        pos.value = { x: e.clientX, y: e.clientY };
    }
};

const handleMouseUp = () => {
    dragging.value = false;
};

onMounted(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    if(dragEl.value) {
        dragEl.value.addEventListener('mousedown', handleMouseDown);
    }
});
onBeforeUnmount(() => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    if(dragEl.value) {
        dragEl.value.removeEventListener('mousedown', handleMouseDown);
    }
});
</script>
<template>
    <svg width="100%" height="100%">
        <circle ref="dragEl" :cx="pos.x" :cy="pos.y" r="20" fill="rgba(0,0,0,0.3)" />
    </svg>
</template>