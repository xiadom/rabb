import * as twgl from 'twgl.js';
import {GlEntity} from '../gl-utils/GlEntity';

// WebGL2 - Textures - Mips - Depth
// from https://webgl2fundamentals.org/webgl/webgl-3d-textures-mips-tri-linear.html

export const vertexShaderSource = `#version 300 es

// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec4 a_position;
in vec2 a_texcoord;

// A matrix to transform the positions by
uniform mat4 u_matrix;

// a varying to pass the texture coordinates to the fragment shader
out vec2 v_texcoord;

// all shaders have a main function
void main() {
  // Multiply the position by the matrix.
  gl_Position = u_matrix * a_position;

  // Pass the texcoord to the fragment shader.
  v_texcoord = a_texcoord;
}
`;

export const fragmentShaderSource = `#version 300 es

precision mediump float;

// Passed in from the vertex shader.
in vec2 v_texcoord;

// The texture.
uniform sampler2D u_texture;

// we need to declare an output for the fragment shader
out vec4 outColor;

void main() {
  outColor = texture(u_texture, v_texcoord);
}
`;


export class TextureShaderProgram {
  program: any;
  vao: any;
  glAttributes: any = {};
  glUniforms: any = {};

  constructor(private gl) {
    this.program = twgl.createProgramFromSources(gl,
      [vertexShaderSource, fragmentShaderSource]);

    this.glAttributes.a_position = gl.getAttribLocation(this.program, "a_position");
    this.glAttributes.a_texcoord = gl.getAttribLocation(this.program, "a_texcoord");
    this.glUniforms.u_matrix = gl.getUniformLocation(this.program, "u_matrix");

  }

  bindProgram() {
    const {gl} = this;

    gl.useProgram(this.program);

    if (this.vao) {
      // Bind the attribute/buffer set we want.
      gl.bindVertexArray(this.vao);
    }
  }

  setGeometry(positions) {
    const {gl} = this;

    // Create a buffer
    var positionBuffer = gl.createBuffer();

    // Create a vertex array object (attribute state)
    this.vao = gl.createVertexArray();

    // and make it the one we're currently working with
    gl.bindVertexArray(this.vao);

    // Turn on the attribute
    gl.enableVertexAttribArray(this.glAttributes.a_position);

    // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Set Geometry
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 3;          // 3 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        this.glAttributes.a_position, size, type, normalize, stride, offset);
  }

  setTexCoords(texCoords) {
    const {gl} = this;

    // create the texcoord buffer, make it the current ARRAY_BUFFER
    // and copy in the texcoord values
    var texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);

    // Set Texture Coordinates
    gl.bufferData(
        gl.ARRAY_BUFFER,
        texCoords,
        gl.STATIC_DRAW);

    // Turn on the attribute
    gl.enableVertexAttribArray(this.glAttributes.a_texcoord);

    // Tell the attribute how to get data out of colorBuffer (ARRAY_BUFFER)
    var size = 2;          // 2 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floating point values
    var normalize = true;  // convert from 0-255 to 0.0-1.0
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next color
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        this.glAttributes.a_texcoord, size, type, normalize, stride, offset);
  }

  setBuffersFromObjects(objects: GlEntity[]) {
    let vertexAcc = 0;
    let geometryBuffers = [], texcoordBuffers = [];

    // get vertex buffers and total count
    objects.forEach((object, idx) => {
      const gb = object.getVertexes();
      if (gb.length % 3)
        console.error('object geometry not % 3', object);
      const objectVertexCount = (gb.length / 3);

      const tb = object.getTexcoords();
      if ((gb.length / 3) !== (tb.length / 2))
        console.error('texcoords not proportional to object geometry', object);

      geometryBuffers[idx] = gb;
      texcoordBuffers[idx] = tb;

      object.setBufferRange(vertexAcc, objectVertexCount)
      vertexAcc += objectVertexCount;
    });

    // concat vertex buffers
    const geometryArrayBuffer = new Float32Array(vertexAcc * 3);
    const texcoordArrayBuffer = new Float32Array(vertexAcc * 2);
    objects.forEach((object, idx) => {
      const br = object.getBufferRange();
      geometryArrayBuffer.set(geometryBuffers[idx], br.start * 3)
      texcoordArrayBuffer.set(texcoordBuffers[idx], br.start * 2)
    });

    // set buffers
    this.setGeometry(geometryArrayBuffer);
    this.setTexCoords(texcoordArrayBuffer);
  }

  setViewProjectionMatrix(matrix) {
    const {gl} = this;
    gl.uniformMatrix4fv(this.glUniforms.u_matrix, false, matrix);
  }

  drawObject(object, viewProjectionMatrix) {
    const {gl} = this;

    // bind texture
    object.texture.bindTexture();

    // set world view projection matrix
    const wvpm = twgl.m4.multiply(viewProjectionMatrix, object.getWorldMatrix());
    this.setViewProjectionMatrix(wvpm);

    // Draw the geometry.
    gl.drawArrays(gl.TRIANGLES, object.bufferRange.start, object.bufferRange.len);
  }
}
