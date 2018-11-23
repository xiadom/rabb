// handle mouse move events
// var isMouseDown = false;
var isPointerLocked = false;
// var lastMouseX = 0, lastMouseY = 0;
// var mouseDiffX = 0, mouseDiffY = 0;
var mouseMoveListeners = [];
// window.addEventListener('mousedown', () => { isMouseDown = true; }, false);
// window.addEventListener('mouseup', () => {
//   isMouseDown = false;
//   lastMouseX = 0; lastMouseY = 0;
// }, false);
window.addEventListener('mousemove', (e) => {
  if (isPointerLocked) {
    if (mouseMoveListeners.length > 0) {
      mouseMoveListeners.forEach((listener) => listener(e.movementX, e.movementY));
    }
  }
}, false);

export function onMouseMove(l) {
  mouseMoveListeners.push(l);
}

// handle keyboard events
export const Keys = {} as any;
export const KeyCodes = {
  38: 'UP',
  37: 'LEFT',
  40: 'DOWN',
  39: 'RIGHT',
  13: 'ENTER',
  32: 'SPACE',
  16: 'LEFT_SHIFT',
  87: 'W',
  65: 'A',
  83: 'S',
  68: 'D',
  69: 'E',
  78: 'N',
  80: 'P',
};
window.addEventListener('keydown', (e) => { Keys[KeyCodes[e.keyCode]] = true; }, false);
window.addEventListener('keyup', (e) => { Keys[KeyCodes[e.keyCode]] = false; }, false);


// pointer lock
if ("onpointerlockchange" in document) {
  document.addEventListener('pointerlockchange', lockChangeAlert, false);
}

let canvas;
export function requestPointerLock(reqCanvas) {
  canvas = reqCanvas;
  canvas.requestPointerLock();
}
function lockChangeAlert() {
  if(document.pointerLockElement === canvas) {
    isPointerLocked = true;
  } else {
    isPointerLocked = false;
  }
}

document.addEventListener('pointerlockerror', lockError, false);
document.addEventListener('mozpointerlockerror', lockError, false);

function lockError(e) {
  console.log("Pointer lock failed");
}
