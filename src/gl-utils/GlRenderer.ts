import * as twgl from 'twgl.js';
import {TextureShaderProgram} from './TextureShaderProgram';
import {GlEntity} from './GlEntity';
import {PhysicsProgram} from '../physics-utils/PhysicsProgram';
import {resizeCanvas,clearCanvas} from './GlCanvas';

const fieldOfViewRadians = 60 * Math.PI / 180;
const zNear = 0.01;
const zFar = 200;

let lastTime = 0;

export class GlRenderer {
  program: TextureShaderProgram;

  constructor(
    private gl: WebGLRenderingContext,
    private physics: PhysicsProgram
  ) {
  }

  // init scene
  initScene(scene) {
    const {gl} = this;

    // create and init mips program
    this.program = new TextureShaderProgram(gl);

    // vertex and texcoord buffers from all objects
    this.program.setBuffersFromObjects(scene.objects);

    // init physics collision detector objects
    this.physics.setBuffersFromWorldObjects(scene.world);
  }

  // draw the scene
  drawScene(time, scene) {
    const {gl} = this;

    const dt = (time - lastTime) / 1000.0;
    lastTime = time;
    // update
    scene.objects.forEach((object: any) => {
      object.update(dt);
    })
    scene.player.update(dt);

    if (scene.player.position[1] < -10.0) throw new Error('player fell');

    // init viewport
    resizeCanvas(gl);
    clearCanvas(gl);

    // turn on depth testing
    gl.enable(gl.DEPTH_TEST);

    // tell webgl to cull faces
    gl.enable(gl.CULL_FACE);


    // bind texture shader program
    this.program.bindProgram();

    // projection matrix based on canvas size
    var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    var projectionMatrix = twgl.m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

    // Make a view projection matrix from the camera matrix.
    var cameraMatrix = scene.player.getCameraMatrix();
    var viewMatrix = twgl.m4.inverse(cameraMatrix);
    var viewProjectionMatrix = twgl.m4.multiply(projectionMatrix, viewMatrix);

    // Draw objects
    scene.objects.forEach((object) => {
      this.program.drawObject(object, viewProjectionMatrix)
    });
  }
}
