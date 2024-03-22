import { assert, assertClose, assertEqual } from "./cheapAssert";
import { isDev } from "./isDev";

export type Vector2d = [number, number];
export type DeltaTimeVector = { dt: number, v: Vector2d };

export interface WidthHeight {
    width: number;
    height: number;
}
export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}


export const direction = (a: Vector2d) => {
    return Math.atan2(a[1], a[0]);
}

export const angleDegs = (a: Vector2d) => {
    return direction(a) * 180 / Math.PI;
}

export const twoVectorsAngle = (center: Vector2d, a: Vector2d, c: Vector2d) => {
    const aCenter = [center[0] - a[0], center[1] - a[1]] as Vector2d;
    const cCenter = [center[0] - c[0], center[1] - c[1]] as Vector2d;

    const dot = aCenter[0] * cCenter[0] + aCenter[1] * cCenter[1];
    const cross = aCenter[0] * cCenter[1] - aCenter[1] * cCenter[0];

    return Math.atan2(cross, dot);
}

export const normalize = (v: Vector2d) => {
    const length = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
    return [v[0] / length, v[1] / length];
}

export const screenToVectorScale = ([x, y]: Vector2d, drawScope: WidthHeight) => {
    return [
        x / drawScope.width,
        y / drawScope.height
    ] as Vector2d;
}

export const vectorToScreenScale = ([x, y]: Vector2d, drawScope: WidthHeight) => {
    return [
        x * drawScope.width,
        y * drawScope.height
    ] as Vector2d;
}


export const sustract = (a: Vector2d, b: Vector2d) => {
    return [a[0] - b[0], a[1] - b[1]] as Vector2d;
}

export const add = (a: Vector2d, b: Vector2d) => {
    return [a[0] + b[0], a[1] + b[1]] as Vector2d;
}

export const size = (a: Vector2d) => {
    return Math.sqrt(a[0] * a[0] + a[1] * a[1]);
}

export const distance = (a: Vector2d, b: Vector2d) => {
    return size(sustract(a, b));
}

if (isDev) {
    assertEqual('measure rect angles ', direction([0, 1]), Math.PI / 2);
    assertEqual('measure 45 degree angles ', direction([1, 1]), Math.PI / 4);
    assertEqual('measure in degrees ', angleDegs([1, 1]), 45);
    assertClose('normalize', normalize([1, 1])[0], Math.sqrt(2) / 2);
    assertClose('normalize', normalize([-10, -10])[0], -1 / Math.sqrt(2));
    // I've no ide what's the typical reference angle and var order, sorry
    assertEqual('twoVectorsAngle 1', twoVectorsAngle([0, 0], [1, 0], [0, 1]), Math.PI / 2);
    assertEqual('twoVectorsAngle 2', twoVectorsAngle([0, 0], [1, 1], [0, 1]), Math.PI / 4);
}