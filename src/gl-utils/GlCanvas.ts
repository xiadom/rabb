import * as twgl from 'twgl.js';

export function resizeCanvas(gl) {
  twgl.resizeCanvasToDisplaySize(gl.canvas, window.devicePixelRatio);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
}
export function clearCanvas(gl) {
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}
