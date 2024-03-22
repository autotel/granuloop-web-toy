import { defineStore } from "pinia";
import { computed, ref, watchEffect } from "vue";
import { videoSize } from "./videoSource";

export const useViewportStore = defineStore("viewport", () => {
    const size = ref(videoSize);
    const resolution = ref(videoSize);
    const resizeHandler = () => {
        if(!resolution.value.width || !resolution.value.height){
            return
        }
        const targetProportions = resolution.value.width / resolution.value.height;
        const clientProportions = window.innerWidth / window.innerHeight;
        if(clientProportions > targetProportions){
            size.value.width = window.innerHeight * targetProportions;
            size.value.height = window.innerHeight;
        }else{
            size.value.width = window.innerWidth;
            size.value.height = window.innerWidth / targetProportions;
        }
    };
    addEventListener("resize", resizeHandler);
    addEventListener("load", resizeHandler);
    const sizeStyle = computed(() => {
        return {
            width: size.value.width+ 'px',
            height: size.value.height+ 'px'
        }
    });

    return {
        size, sizeStyle,
        resolution,
    }
})