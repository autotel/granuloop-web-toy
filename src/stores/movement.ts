import newNumberAnalyzer from "@/analyzer/newNumberAnalyzer";
import { defineStore } from "pinia";


export const useMovementStore = defineStore("movement", () => {
    let prevFrameTime = new Date().getTime();
    // const movementAnalyzer = newMovementAnalyzer();
    const angleAnalyzer = newNumberAnalyzer();
    const plot = (canvas: HTMLCanvasElement) => {
        const context = canvas.getContext("2d")
        if (!context) {
            console.error("Canvas context not found");
            return;
        }
        const drawScope = {
            context,
            width: canvas.width,
            height: canvas.height
        }
        const now = new Date().getTime();
        const deltaTime = now - prevFrameTime;
        prevFrameTime = now;
        angleAnalyzer.draw(drawScope, now, deltaTime);
    }
    // TODO: get analyzer to factor DT's in!!
    const addSample = (angle: number, time: number) => {
        angleAnalyzer.addSample(angle, time);
        angleAnalyzer.analyze(time, 0);
        // console.log("angle", angle, time);
    }
    return {
        plot, 
        addSample,
    }
});