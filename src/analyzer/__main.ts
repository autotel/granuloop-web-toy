
// @ts-check
import { screenToVectorScale, type Vector2d } from '@/utils/vector.js';
import getAudioAnalyzer from './getAudioAnalyzer.js';
import newMovementAnalyzer from './newMovementAnalyzer.js';
import type DrawScope from './DrawScope.js';
const canvas = document.createElement('canvas');
const container = document.getElementById('code-target')
const restartButton = document.createElement('button');

if (!container) {
  throw new Error('Container not found');
}
container.appendChild(canvas);
container.appendChild(restartButton);
restartButton.style.position = 'fixed';
restartButton.style.bottom = '0';
restartButton.style.right = '0';
restartButton.style.zIndex = '1';
restartButton.innerText = 'Restart';
restartButton.onclick = () => {
  window.location.reload();
}

const context = canvas.getContext('2d');
if (!context) {
  throw new Error('Canvas context not found');
}

/**
 * @typedef {Object} DrawScope
 * @property {CanvasRenderingContext2D} context - canvas context
 * @property {number} width - 
 * @property {number} height - 
 */


/** 
 * @type {DrawScope}
 */
const drawScope = {
  context,
  width: 0,
  height: 0
}
drawScope.width = canvas.width;
drawScope.height = canvas.height;


const movementAnalyzer = newMovementAnalyzer(drawScope);

let lastTime = new Date().getTime();


const mousePosition:Vector2d= [0,0]



const audioAnalyzer = getAudioAnalyzer();

const draw = (time: number, {
  context,
}: DrawScope) => {
  const deltaTime = time - lastTime;
  context.strokeStyle = 'white';

  let newPosition = [...mousePosition] as Vector2d;

  if (audioAnalyzer.started) {
    newPosition = audioAnalyzer.getBassAndHiLevelsAsCoords();
  }
  movementAnalyzer.addMouseHistoryPoint(newPosition, time, deltaTime);
  // movementAnalyzer.addMouseHistoryPoint({
  //   x: Math.sin(time / 1000) / 2 + 0.5,
  //   y: Math.cos(time / 1000) / 2 + 0.5
  // }, time, deltaTime);
  movementAnalyzer.analyze(time, deltaTime);
  movementAnalyzer.draw(time, deltaTime);
  lastTime = time;
}

const windowResizedListener = () => {
  const containerRect = container.getBoundingClientRect();
  canvas.width = containerRect.width;
  canvas.height = containerRect.height;
  drawScope.width = canvas.width;
  drawScope.height = canvas.height;
}

const frame = () => {
  const time = new Date().getTime();
  draw(time, drawScope);
  requestAnimationFrame(frame);
}

window.addEventListener('resize', windowResizedListener);

window.addEventListener('load', () => {
  windowResizedListener();
});

canvas.addEventListener('mousemove', (event) => {
  Object.assign(
    mousePosition, screenToVectorScale(
      [event.clientX, event.clientY], drawScope
    )
  );
});


frame();


