import { defineStore } from "pinia";
import { ref } from "vue";


export const videoSize = {
    width: 640,
    height: 480
}

// export const videoSize = {
//     width: 176,
//     height: 144
// }

// const videoConstraint = {

//     width: { min: 176, ideal: videoSize.width, max: videoSize.width * 2 },
//     height: { min: 144, ideal: videoSize.height, max:  videoSize.height * 2 },
// }
export const useVideoSourceStore = defineStore("videoSource", () => {
    
    const stream = ref<MediaStream | false>(false);
    const startCapture = async () => {
        try {
            stream.value =
                await navigator.mediaDevices.getUserMedia({
                    // browser is not taking the size into account for whatever reason
                    video: {
                        facingMode: 'user',
                        ...videoSize

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

