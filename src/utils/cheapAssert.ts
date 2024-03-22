export const assert = (desc: string, condition: boolean) => {
    if (!condition) {
        throw new Error("assertion failed: " + desc);
    }else{
        console.log("assertion passed: " + desc);
    }
}

export const assertEqual = (desc: string, a: any, b: any) => {
    if (a !== b) {
        throw new Error("assertion failed: " + desc + " " + a + " !== " + b);
    }else{
        console.log("assertion passed: " + desc);
    }
}

export const assertClose = (desc: string, a: number, b: number, tolerance: number = 1/1000) => {
    if (Math.abs(a - b) > tolerance) {
        throw new Error("assertion failed: " + desc + " " + a + " !== " + b);
    }else{
        console.log("assertion passed: " + desc);
    }
}