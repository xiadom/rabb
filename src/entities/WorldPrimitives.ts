import {primitives,v3,m4} from 'twgl.js';
import {GlEntity} from '../gl-utils/GlEntity';

export class WorldPlane implements GlEntity {
  texture: any;
  bufferRange: any;

  position: v3 = [0,0,0];
  rotation: m4 = m4.identity();

  constructor(private width: number, private height: number) {

  }

  update(time?) { }

  getWorldMatrix() {
    const {width, height} = this;
    var matrix = m4.translate(m4.identity(), this.position);
    matrix = m4.multiply(matrix, this.rotation);
    matrix = m4.scale(matrix, [width, 1, height]);
    return matrix;
  }

  getVertexes() {
    return new Float32Array([
      -0.5, 0.0, -0.5,
      -0.5, 0.0,  0.5,
       0.5, 0.0, -0.5,
       0.5, 0.0, -0.5,
      -0.5, 0.0,  0.5,
       0.5, 0.0,  0.5,
    ]);
  }

  getTexcoords() {
    const {width, height} = this;
    return new Float32Array([
      0, 0,
      0, height,
      width, 0,
      width, 0,
      0, height,
      width, height,
    ]);
  }

  getBufferRange() {
    return this.bufferRange;
  }
  setBufferRange(start, len) {
    this.bufferRange = {start, len};
  }
}

export class WorldCube implements GlEntity {
  texture: any;
  bufferRange: any;

  position: v3 = [0,0,0];
  rotation: m4 = m4.identity();

  constructor(private width: number, private height: number, private depth: number) {

  }

  update(time?) { }

  getWorldMatrix() {
    const {width, height, depth} = this;
    var matrix = m4.translate(m4.identity(), this.position);
    matrix = m4.multiply(matrix, this.rotation);
    matrix = m4.scale(matrix, [width, height, depth]);
    return matrix;
  }

  getVertexes() {
    return new Float32Array([
      // top
      -0.5, 0.5, -0.5,
      -0.5, 0.5,  0.5,
       0.5, 0.5, -0.5,
       0.5, 0.5, -0.5,
      -0.5, 0.5,  0.5,
       0.5, 0.5,  0.5,

      // bottom
      -0.5, -0.5, -0.5,
       0.5, -0.5, -0.5,
      -0.5, -0.5,  0.5,
      -0.5, -0.5,  0.5,
       0.5, -0.5, -0.5,
       0.5, -0.5,  0.5,

      // left
      -0.5, -0.5, -0.5,
      -0.5, -0.5,  0.5,
      -0.5,  0.5, -0.5,
      -0.5,  0.5, -0.5,
      -0.5, -0.5,  0.5,
      -0.5,  0.5,  0.5,

      // right
      0.5, -0.5, -0.5,
      0.5,  0.5, -0.5,
      0.5, -0.5,  0.5,
      0.5, -0.5,  0.5,
      0.5,  0.5, -0.5,
      0.5,  0.5,  0.5,

      // front
      -0.5, -0.5, -0.5,
      -0.5,  0.5, -0.5,
       0.5, -0.5, -0.5,
       0.5, -0.5, -0.5,
      -0.5,  0.5, -0.5,
       0.5,  0.5, -0.5,

      // back
      -0.5, -0.5, 0.5,
       0.5, -0.5, 0.5,
      -0.5,  0.5, 0.5,
      -0.5,  0.5, 0.5,
       0.5, -0.5, 0.5,
       0.5,  0.5, 0.5,
    ]);
  }

  getTexcoords() {
    const {width, height} = this;
    return new Float32Array([
      0, 0,
      0, height,
      width, 0,
      width, 0,
      0, height,
      width, height,
      0, 0,
      width, 0,
      0, height,
      0, height,
      width, 0,
      width, height,
      0, 0,
      0, height,
      width, 0,
      width, 0,
      0, height,
      width, height,
      0, 0,
      width, 0,
      0, height,
      0, height,
      width, 0,
      width, height,
      0, 0,
      0, height,
      width, 0,
      width, 0,
      0, height,
      width, height,
      0, 0,
      width, 0,
      0, height,
      0, height,
      width, 0,
      width, height,
    ]);
  }

  getBufferRange() {
    return this.bufferRange;
  }
  setBufferRange(start, len) {
    this.bufferRange = {start, len};
  }
}
