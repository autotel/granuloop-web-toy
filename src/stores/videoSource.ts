import { defineStore } from "pinia";
import { ref } from "vue";



export const useVideoSourceStore = defineStore("videoSource", () => {

    const stream = ref<MediaStream | false>(false);
    const startCapture = async () => {
        try {
            stream.value =
                await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'user',
                        width: 480,
                        height: 480,

                    },
                    audio: false,
                });


        } catch (err) {
            console.error(`Error: ${err}`);
        }
    }
    return {
        stream,
        startCapture
    }
});

