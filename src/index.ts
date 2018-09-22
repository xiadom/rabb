import * as twgl from 'twgl.js';
import {GlRenderer} from './gl-utils/GlRenderer';
import {PhysicsProgram} from './physics-utils/PhysicsProgram';
import {requestPointerLock} from './browser-utils/InputListeners';
import {createScene} from './resources/DemoScene';

// call init after load
setTimeout(init,1);

// init
function init() {
  const canvas = createCanvas();

  const gl = canvas.getContext('webgl2') as any;
  if (!gl) {
    console.error("Couldn't get GL context");
    return;
  }

  // pointer lock
  canvas.addEventListener('mousedown', (e) => requestPointerLock(canvas));

  // programs
  const physics = new PhysicsProgram();
  const renderer = new GlRenderer(gl, physics);

  // scene
  const scene = createScene(gl, physics);
  renderer.initScene(scene);

  // render loop
  const drawFrame = (time) => {
    renderer.drawScene(time, scene);
    // if (time > 4000) return;
    requestAnimationFrame(drawFrame);
  };
  requestAnimationFrame(drawFrame);
}

// creates and appends canvas element
function createCanvas() {
  const mountNode = document.body;
  styleFullAbsolute(mountNode);
  mountNode.style.background = '#181818';

  const canvas = document.createElement('canvas');
  styleFullAbsolute(canvas);

  if (mountNode != null) {
    mountNode.appendChild(canvas);
  }

  return canvas;
}

// sets full width/height, absolute position
function styleFullAbsolute(n) {
  n.style.position = 'absolute';
  n.style.margin = '0';
  n.style.padding = '0';
  n.style.top = '0';
  n.style.right = '0';
  n.style.bottom = '0';
  n.style.left = '0';
  n.style.width = '100%';
  n.style.height = '100%';
}
