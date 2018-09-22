define("gl-utils/GlEntity", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});
define("gl-utils/TextureShaderProgram", ["require", "exports", "twgl.js"], function (require, exports, twgl) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // WebGL2 - Textures - Mips - Depth
    // from https://webgl2fundamentals.org/webgl/webgl-3d-textures-mips-tri-linear.html
    exports.vertexShaderSource = `#version 300 es

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
    exports.fragmentShaderSource = `#version 300 es

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
    class TextureShaderProgram {
        constructor(gl) {
            this.gl = gl;
            this.glAttributes = {};
            this.glUniforms = {};
            this.program = twgl.createProgramFromSources(gl, [exports.vertexShaderSource, exports.fragmentShaderSource]);
            this.glAttributes.a_position = gl.getAttribLocation(this.program, "a_position");
            this.glAttributes.a_texcoord = gl.getAttribLocation(this.program, "a_texcoord");
            this.glUniforms.u_matrix = gl.getUniformLocation(this.program, "u_matrix");
        }
        bindProgram() {
            const { gl } = this;
            gl.useProgram(this.program);
            if (this.vao) {
                // Bind the attribute/buffer set we want.
                gl.bindVertexArray(this.vao);
            }
        }
        setGeometry(positions) {
            const { gl } = this;
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
            var size = 3; // 3 components per iteration
            var type = gl.FLOAT; // the data is 32bit floats
            var normalize = false; // don't normalize the data
            var stride = 0; // 0 = move forward size * sizeof(type) each iteration to get the next position
            var offset = 0; // start at the beginning of the buffer
            gl.vertexAttribPointer(this.glAttributes.a_position, size, type, normalize, stride, offset);
        }
        setTexCoords(texCoords) {
            const { gl } = this;
            // create the texcoord buffer, make it the current ARRAY_BUFFER
            // and copy in the texcoord values
            var texcoordBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
            // Set Texture Coordinates
            gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
            // Turn on the attribute
            gl.enableVertexAttribArray(this.glAttributes.a_texcoord);
            // Tell the attribute how to get data out of colorBuffer (ARRAY_BUFFER)
            var size = 2; // 2 components per iteration
            var type = gl.FLOAT; // the data is 32bit floating point values
            var normalize = true; // convert from 0-255 to 0.0-1.0
            var stride = 0; // 0 = move forward size * sizeof(type) each iteration to get the next color
            var offset = 0; // start at the beginning of the buffer
            gl.vertexAttribPointer(this.glAttributes.a_texcoord, size, type, normalize, stride, offset);
        }
        setBuffersFromObjects(objects) {
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
                object.setBufferRange(vertexAcc, objectVertexCount);
                vertexAcc += objectVertexCount;
            });
            // concat vertex buffers
            const geometryArrayBuffer = new Float32Array(vertexAcc * 3);
            const texcoordArrayBuffer = new Float32Array(vertexAcc * 2);
            objects.forEach((object, idx) => {
                const br = object.getBufferRange();
                geometryArrayBuffer.set(geometryBuffers[idx], br.start * 3);
                texcoordArrayBuffer.set(texcoordBuffers[idx], br.start * 2);
            });
            // set buffers
            this.setGeometry(geometryArrayBuffer);
            this.setTexCoords(texcoordArrayBuffer);
        }
        setViewProjectionMatrix(matrix) {
            const { gl } = this;
            gl.uniformMatrix4fv(this.glUniforms.u_matrix, false, matrix);
        }
        drawObject(object, viewProjectionMatrix) {
            const { gl } = this;
            // bind texture
            object.texture.bindTexture();
            // set world view projection matrix
            const wvpm = twgl.m4.multiply(viewProjectionMatrix, object.getWorldMatrix());
            this.setViewProjectionMatrix(wvpm);
            // Draw the geometry.
            gl.drawArrays(gl.TRIANGLES, object.bufferRange.start, object.bufferRange.len);
        }
    }
    exports.TextureShaderProgram = TextureShaderProgram;
});
define("physics-utils/CollisionDetection", ["require", "exports", "twgl.js"], function (require, exports, twgl_js_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const EPSILON = 0.000001;
    const CULLING = false;
    function rayTriangleIntersection(ray, triangle) {
        // https://en.wikipedia.org/wiki/M%C3%B6ller%E2%80%93Trumbore_intersection_algorithm
        const edge1 = twgl_js_1.v3.subtract(triangle.v1, triangle.v0);
        const edge2 = twgl_js_1.v3.subtract(triangle.v2, triangle.v0);
        const h = twgl_js_1.v3.cross(ray.vector, edge2);
        const a = twgl_js_1.v3.dot(edge1, h);
        if (CULLING) {
            // if the determinant is negative the triangle is backfacing
            // if the determinant is close to 0, the ray misses the triangle
            if (a < EPSILON) {
                return false;
            }
        }
        else {
            if (a > -EPSILON && a < EPSILON) {
                // ray and triangle are parallel if det is close to 0
                return false;
            }
        }
        // compute and check barycentric coordinates u,v
        const f = 1 / a;
        const s = twgl_js_1.v3.subtract(ray.origin, triangle.v0);
        const u = f * twgl_js_1.v3.dot(s, h);
        const q = twgl_js_1.v3.cross(s, edge1);
        const v = f * twgl_js_1.v3.dot(ray.vector, q);
        if (u < 0.0 || u > 1.0) {
            return false;
        }
        // const q: v3 = v3.cross(s, edge1);
        // const v = f * v3.dot(ray.vector, q);
        if (v < 0.0 || u + v > 1.0) {
            return false;
        }
        // position of intersection on ray
        const t = f * twgl_js_1.v3.dot(edge2, q);
        if (t > EPSILON) {
            // intersects on ray
            if (t <= 1.0) {
                // intersects in segment
                const triangleNormal = twgl_js_1.v3.normalize(twgl_js_1.v3.cross(edge1, edge2));
                return { t, triangle, triangleNormal };
            }
        }
        return false;
    }
    exports.rayTriangleIntersection = rayTriangleIntersection;
});
define("physics-utils/PhysicsProgram", ["require", "exports", "twgl.js", "physics-utils/CollisionDetection"], function (require, exports, twgl_js_2, CollisionDetection_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const GRAVITY = [0, -9.8, 0];
    const GROUND_ACCELERATE = 20;
    const MAX_VELOCITY_GROUND = 10;
    const AIR_ACCELERATE = 2;
    const MAX_VELOCITY_AIR = Number.MAX_SAFE_INTEGER;
    const FRICTION = 4;
    class PhysicsProgram {
        constructor() {
        }
        setBuffersFromWorldObjects(worldObjects) {
            this.triangles = [];
            worldObjects.forEach((worldObject) => {
                const matrix = worldObject.getWorldMatrix();
                const vertexes = worldObject.getVertexes();
                for (let i = 0; i < vertexes.length; i += 9) {
                    this.triangles.push({
                        v0: twgl_js_2.m4.transformPoint(matrix, [vertexes[i + 0], vertexes[i + 0 + 1], vertexes[i + 0 + 2]]),
                        v1: twgl_js_2.m4.transformPoint(matrix, [vertexes[i + 3], vertexes[i + 3 + 1], vertexes[i + 3 + 2]]),
                        v2: twgl_js_2.m4.transformPoint(matrix, [vertexes[i + 6], vertexes[i + 6 + 1], vertexes[i + 6 + 2]]),
                    });
                }
            });
        }
        checkRayCollisions(ray) {
            let nearestCollision = null;
            let nearestT = 1.00001;
            for (let i = 0; i < this.triangles.length; i += 1) {
                const triangle = this.triangles[i];
                const collision = CollisionDetection_1.rayTriangleIntersection(ray, triangle);
                if (collision) {
                    if (collision.t < nearestT) {
                        nearestCollision = collision;
                        nearestT = collision.t;
                    }
                }
            }
            return nearestCollision;
        }
        getGravityDv(dt) {
            return twgl_js_2.v3.mulScalar(GRAVITY, dt);
        }
        getCollisionReflection(ray, velocity, gravityDv, collision, dt) {
            // estimate collision velocity
            const velocityAtCollision = twgl_js_2.v3.add(velocity, twgl_js_2.v3.mulScalar(gravityDv, collision.t));
            const dPositionT = twgl_js_2.v3.mulScalar(ray.vector, collision.t);
            const collisionPoint = twgl_js_2.v3.add(ray.origin, dPositionT);
            // reflect velocity relative to collision triangle normal
            const edge1 = twgl_js_2.v3.subtract(collision.triangle.v1, collision.triangle.v0);
            const edge2 = twgl_js_2.v3.subtract(collision.triangle.v2, collision.triangle.v0);
            const reflectedVelocity = twgl_js_2.v3.subtract(velocityAtCollision, twgl_js_2.v3.mulScalar(collision.triangleNormal, 2.0 * twgl_js_2.v3.dot(velocityAtCollision, collision.triangleNormal)));
            // subtract remaining gravity
            const finalVelocity = twgl_js_2.v3.add(reflectedVelocity, twgl_js_2.v3.mulScalar(gravityDv, (1.0 - collision.t)));
            // estimate after-bounce position
            const dPosition2 = twgl_js_2.v3.mulScalar(reflectedVelocity, dt * (1.0 - collision.t));
            return {
                velocity: finalVelocity,
                position: twgl_js_2.v3.add(collisionPoint, dPosition2)
            };
        }
        accelerate(accelDir, velocity, accelerate, maxVelocity, dt) {
            const projVel = twgl_js_2.v3.dot(velocity, accelDir); //
            let accelVel = accelerate * dt;
            if (projVel + accelVel > maxVelocity) {
                accelVel = maxVelocity - projVel;
            }
            return twgl_js_2.v3.add(velocity, twgl_js_2.v3.mulScalar(accelDir, accelVel));
        }
        moveGround(accelDir, velocity, dt) {
            const speed = twgl_js_2.v3.length(velocity);
            if (speed !== 0) {
                const drop = speed * FRICTION * dt;
                velocity = twgl_js_2.v3.mulScalar(velocity, Math.max(speed - drop, 0) / speed);
            }
            return this.accelerate(accelDir, velocity, GROUND_ACCELERATE, MAX_VELOCITY_GROUND, dt);
        }
        moveAir(accelDir, velocity, dt) {
            return this.accelerate(accelDir, velocity, AIR_ACCELERATE, MAX_VELOCITY_AIR, dt);
        }
    }
    exports.PhysicsProgram = PhysicsProgram;
});
define("gl-utils/GlCanvas", ["require", "exports", "twgl.js"], function (require, exports, twgl) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function resizeCanvas(gl) {
        twgl.resizeCanvasToDisplaySize(gl.canvas, window.devicePixelRatio);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }
    exports.resizeCanvas = resizeCanvas;
    function clearCanvas(gl) {
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
    exports.clearCanvas = clearCanvas;
});
define("gl-utils/GlRenderer", ["require", "exports", "twgl.js", "gl-utils/TextureShaderProgram", "gl-utils/GlCanvas"], function (require, exports, twgl, TextureShaderProgram_1, GlCanvas_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const fieldOfViewRadians = 60 * Math.PI / 180;
    const zNear = 0.01;
    const zFar = 200;
    let lastTime = 0;
    class GlRenderer {
        constructor(gl, physics) {
            this.gl = gl;
            this.physics = physics;
        }
        // init scene
        initScene(scene) {
            const { gl } = this;
            // create and init mips program
            this.program = new TextureShaderProgram_1.TextureShaderProgram(gl);
            // vertex and texcoord buffers from all objects
            this.program.setBuffersFromObjects(scene.objects);
            // init physics collision detector objects
            this.physics.setBuffersFromWorldObjects(scene.world);
        }
        // draw the scene
        drawScene(time, scene) {
            const { gl } = this;
            const dt = (time - lastTime) / 1000.0;
            lastTime = time;
            // update
            scene.objects.forEach((object) => {
                object.update(dt);
            });
            scene.player.update(dt);
            if (scene.player.position[1] < -10.0)
                throw new Error('player fell');
            // init viewport
            GlCanvas_1.resizeCanvas(gl);
            GlCanvas_1.clearCanvas(gl);
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
                this.program.drawObject(object, viewProjectionMatrix);
            });
        }
    }
    exports.GlRenderer = GlRenderer;
});
define("browser-utils/InputListeners", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
    function onMouseMove(l) {
        mouseMoveListeners.push(l);
    }
    exports.onMouseMove = onMouseMove;
    // handle keyboard events
    exports.Keys = {};
    exports.KeyCodes = {
        13: 'ENTER',
        87: 'W',
        65: 'A',
        83: 'S',
        68: 'D',
        38: 'UP',
        37: 'LEFT',
        40: 'DOWN',
        39: 'RIGHT',
        32: 'SPACE',
    };
    window.addEventListener('keydown', (e) => { exports.Keys[exports.KeyCodes[e.keyCode]] = true; }, false);
    window.addEventListener('keyup', (e) => { exports.Keys[exports.KeyCodes[e.keyCode]] = false; }, false);
    // pointer lock
    if ("onpointerlockchange" in document) {
        document.addEventListener('pointerlockchange', lockChangeAlert, false);
    }
    let canvas;
    function requestPointerLock(reqCanvas) {
        canvas = reqCanvas;
        canvas.requestPointerLock();
    }
    exports.requestPointerLock = requestPointerLock;
    function lockChangeAlert() {
        if (document.pointerLockElement === canvas) {
            isPointerLocked = true;
        }
        else {
            isPointerLocked = false;
        }
    }
    document.addEventListener('pointerlockerror', lockError, false);
    document.addEventListener('mozpointerlockerror', lockError, false);
    function lockError(e) {
        console.log("Pointer lock failed");
    }
});
define("gl-utils/GlTexture", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class GlTexture {
        constructor(gl, image) {
            this.gl = gl;
            this.image = image;
            this.texParameters = [];
            // Create a texture.
            this.texture = gl.createTexture();
            // use texture unit 0
            gl.activeTexture(gl.TEXTURE0 + 0);
            // bind to the TEXTURE_2D bind point of texture unit 0
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            // Fill the texture with a 1x1 blue pixel.
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));
            // Now that the image has loaded make copy it to the texture.
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            gl.generateMipmap(gl.TEXTURE_2D);
            // set mips parameters
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        }
        bindTexture() {
            const { gl } = this;
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
        }
    }
    exports.GlTexture = GlTexture;
});
define("resources/SimpleTextures", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function createGridTexture(spacing, color) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        for (let i = 0; i < 256; i += spacing) {
            ctx.fillRect(i, 0, 1, 256);
        }
        for (let j = 0; j < 256; j += spacing) {
            ctx.fillRect(0, j, 256, 1);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.font = `10px monospace`;
        for (let i = 0; i < 256; i += spacing) {
            for (let j = 0; j < 256; j += spacing) {
                ctx.fillText(`${spacing}px`, i + Math.min(7, spacing), j + Math.min(16, spacing));
            }
        }
        return canvas;
    }
    exports.createGridTexture = createGridTexture;
});
define("entities/WorldPrimitives", ["require", "exports", "twgl.js"], function (require, exports, twgl_js_3) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class WorldPlane {
        constructor(width, height) {
            this.width = width;
            this.height = height;
            this.position = [0, 0, 0];
            this.rotation = twgl_js_3.m4.identity();
        }
        update(time) { }
        getWorldMatrix() {
            const { width, height } = this;
            var matrix = twgl_js_3.m4.translate(twgl_js_3.m4.identity(), this.position);
            matrix = twgl_js_3.m4.multiply(matrix, this.rotation);
            matrix = twgl_js_3.m4.scale(matrix, [width, 1, height]);
            return matrix;
        }
        getVertexes() {
            return new Float32Array([
                -0.5, 0.0, -0.5,
                -0.5, 0.0, 0.5,
                0.5, 0.0, -0.5,
                0.5, 0.0, -0.5,
                -0.5, 0.0, 0.5,
                0.5, 0.0, 0.5,
            ]);
        }
        getTexcoords() {
            const { width, height } = this;
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
            this.bufferRange = { start, len };
        }
    }
    exports.WorldPlane = WorldPlane;
    class WorldCube {
        constructor(width, height, depth) {
            this.width = width;
            this.height = height;
            this.depth = depth;
            this.position = [0, 0, 0];
            this.rotation = twgl_js_3.m4.identity();
        }
        update(time) { }
        getWorldMatrix() {
            const { width, height, depth } = this;
            var matrix = twgl_js_3.m4.translate(twgl_js_3.m4.identity(), this.position);
            matrix = twgl_js_3.m4.multiply(matrix, this.rotation);
            matrix = twgl_js_3.m4.scale(matrix, [width, height, depth]);
            return matrix;
        }
        getVertexes() {
            return new Float32Array([
                // top
                -0.5, 0.5, -0.5,
                -0.5, 0.5, 0.5,
                0.5, 0.5, -0.5,
                0.5, 0.5, -0.5,
                -0.5, 0.5, 0.5,
                0.5, 0.5, 0.5,
                // bottom
                -0.5, -0.5, -0.5,
                0.5, -0.5, -0.5,
                -0.5, -0.5, 0.5,
                -0.5, -0.5, 0.5,
                0.5, -0.5, -0.5,
                0.5, -0.5, 0.5,
                // left
                -0.5, -0.5, -0.5,
                -0.5, -0.5, 0.5,
                -0.5, 0.5, -0.5,
                -0.5, 0.5, -0.5,
                -0.5, -0.5, 0.5,
                -0.5, 0.5, 0.5,
                // right
                0.5, -0.5, -0.5,
                0.5, 0.5, -0.5,
                0.5, -0.5, 0.5,
                0.5, -0.5, 0.5,
                0.5, 0.5, -0.5,
                0.5, 0.5, 0.5,
                // front
                -0.5, -0.5, -0.5,
                -0.5, 0.5, -0.5,
                0.5, -0.5, -0.5,
                0.5, -0.5, -0.5,
                -0.5, 0.5, -0.5,
                0.5, 0.5, -0.5,
                // back
                -0.5, -0.5, 0.5,
                0.5, -0.5, 0.5,
                -0.5, 0.5, 0.5,
                -0.5, 0.5, 0.5,
                0.5, -0.5, 0.5,
                0.5, 0.5, 0.5,
            ]);
        }
        getTexcoords() {
            const { width, height } = this;
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
            this.bufferRange = { start, len };
        }
    }
    exports.WorldCube = WorldCube;
});
define("entities/PhysicsPrimitives", ["require", "exports", "twgl.js"], function (require, exports, twgl_js_4) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const RADIUS = 0.2;
    const subdivisionsAxis = 10;
    const subdivisionsHeight = subdivisionsAxis;
    let start = Date.now();
    class BouncingBall {
        constructor(physics) {
            this.physics = physics;
            this.position = [0, 4.9 - 1.0, -4];
            this.velocity = [0, 0, 0];
            this.update = (dt) => {
                // velocity change from gravity
                const gravityDv = this.physics.getGravityDv(dt);
                const newVelocity = twgl_js_4.v3.add(this.velocity, gravityDv);
                // check collisions
                const dPosition = twgl_js_4.v3.mulScalar(newVelocity, dt);
                const ray = { origin: this.position, vector: dPosition };
                const collision = this.physics.checkRayCollisions(ray);
                if (collision) {
                    // console.log('BOUNCE', (Date.now() - start)/ 1000.0)
                    // start = Date.now();
                    const cd = this.physics.getCollisionReflection(ray, this.velocity, gravityDv, collision, dt);
                    this.velocity = cd.velocity;
                    this.position = cd.position;
                }
                else {
                    this.position = twgl_js_4.v3.add(this.position, dPosition);
                    this.velocity = newVelocity;
                }
            };
            this.sphere = twgl_js_4.primitives.createSphereVertices(RADIUS, subdivisionsAxis, subdivisionsHeight);
            // translate index list to vertex array
            this.vertexes = (() => new Float32Array(Array.prototype.reduce.call(this.sphere.indices, (acc, id) => acc.concat([
                this.sphere.position[3 * id],
                this.sphere.position[3 * id + 1],
                this.sphere.position[3 * id + 2],
            ]), [])))();
            this.texcoords = (() => new Float32Array(Array.prototype.reduce.call(this.sphere.indices, (acc, id) => acc.concat([
                this.sphere.texcoord[3 * id],
                this.sphere.texcoord[3 * id + 1],
            ]), [])))();
        }
        getWorldMatrix() {
            return twgl_js_4.m4.translate(twgl_js_4.m4.identity(), this.position);
        }
        getVertexes() {
            return this.vertexes;
        }
        getTexcoords() {
            return this.texcoords;
        }
        getBufferRange() {
            return this.bufferRange;
        }
        setBufferRange(start, len) {
            this.bufferRange = { start, len };
        }
    }
    exports.BouncingBall = BouncingBall;
});
define("entities/Player", ["require", "exports", "twgl.js", "browser-utils/InputListeners"], function (require, exports, twgl_js_5, InputListeners_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // unit vectors
    const UP = [0, 1, 0];
    const RIGHT = [1, 0, 0];
    const FORWARD = [0, 0, -1];
    const PLAYER_COLLISION_RADIUS = 0.1;
    const YAW_SMALL_LIMIT = 0.0001;
    const MOVE_SPEED = 5.0;
    const JUMP_ACCELERATION = 40.0;
    const MOVE_ACCELERATION = 1.0;
    class Player {
        constructor(physics) {
            this.physics = physics;
            this.rotateX = 0.0;
            this.rotateY = 0.0;
            this.bottom = [0, -1, 0];
            this.position = [0, 0, 0];
            this.velocity = [0, 0, 0];
            this.lookAt = [0, 0, 0];
            this.handleMouseMove = (dX, dY) => {
                this.rotateY = this.rotateY - dX / 300.0;
                this.rotateX = Math.min(Math.max(this.rotateX - dY / 300.0, -(Math.PI / 2) + YAW_SMALL_LIMIT), (Math.PI / 2) - YAW_SMALL_LIMIT);
            };
            this.update = (dt) => {
                // movement
                const xAccel = ((InputListeners_1.Keys.LEFT || InputListeners_1.Keys.A) ? -1 : 0) + ((InputListeners_1.Keys.RIGHT || InputListeners_1.Keys.D) ? 1 : 0);
                const zAccel = ((InputListeners_1.Keys.UP || InputListeners_1.Keys.W) ? -1 : 0) + ((InputListeners_1.Keys.DOWN || InputListeners_1.Keys.S) ? 1 : 0);
                const accelDir = [
                    xAccel * (zAccel ? 0.7 : 1) * MOVE_ACCELERATION,
                    0,
                    zAccel * (xAccel ? 0.7 : 1) * MOVE_ACCELERATION,
                ];
                // rotation
                const rotationMatrix = twgl_js_5.m4.rotateX(twgl_js_5.m4.rotationY(this.rotateY), this.rotateX);
                // translate camera relative to view rotation
                const strafeAccelDir = twgl_js_5.v3.normalize(twgl_js_5.m4.transformDirection(rotationMatrix, [accelDir[0], 0, 0]));
                const walkAccelDir = twgl_js_5.v3.normalize(twgl_js_5.m4.transformDirection(rotationMatrix, accelDir));
                // calculate estimated velocity
                const gravityDv = this.physics.getGravityDv(dt);
                const velWithGravity = twgl_js_5.v3.add(this.velocity, gravityDv);
                // check collisions
                const collisionRadius = twgl_js_5.v3.mulScalar(twgl_js_5.v3.normalize(gravityDv), PLAYER_COLLISION_RADIUS);
                const dFallPosition = twgl_js_5.v3.mulScalar(velWithGravity, dt);
                const rayVector = twgl_js_5.v3.add(collisionRadius, dFallPosition);
                const ray = { origin: twgl_js_5.v3.add(this.position, this.bottom), vector: rayVector };
                const collision = this.physics.checkRayCollisions(ray);
                if (collision) {
                    const groundAngle = twgl_js_5.v3.dot(collision.triangleNormal, UP);
                    if (groundAngle > 0.7) {
                        // ground
                        if (InputListeners_1.Keys.SPACE) {
                            // console.log('BOUNCE', (Date.now() - start)/ 1000.0)
                            // start = Date.now();
                            strafeAccelDir[1] = JUMP_ACCELERATION;
                            this.velocity = this.physics.moveAir(strafeAccelDir, this.velocity, dt);
                        }
                        else {
                            // walk
                            this.velocity = this.physics.moveGround(walkAccelDir, this.velocity, dt);
                            const collisionVelocity = twgl_js_5.v3.dot(this.velocity, collision.triangleNormal);
                            this.velocity = twgl_js_5.v3.subtract(this.velocity, twgl_js_5.v3.mulScalar(collision.triangleNormal, collisionVelocity));
                        }
                    }
                    else {
                        // surf
                        const cd = this.physics.getCollisionReflection(ray, this.velocity, gravityDv, collision, dt);
                        this.velocity = this.physics.moveAir(twgl_js_5.v3.mulScalar(strafeAccelDir, 4), cd.velocity, dt);
                        const collisionVelocity = twgl_js_5.v3.dot(this.velocity, collision.triangleNormal);
                        this.velocity = twgl_js_5.v3.subtract(this.velocity, twgl_js_5.v3.mulScalar(collision.triangleNormal, collisionVelocity));
                    }
                    // set position from collision
                    this.position = twgl_js_5.v3.add(this.position, twgl_js_5.v3.mulScalar(rayVector, collision.t - 0.0001));
                    // check for second collision
                    const dFallPosition2 = twgl_js_5.v3.mulScalar(this.velocity, dt);
                    const ray2 = { origin: twgl_js_5.v3.add(this.position, this.bottom), vector: dFallPosition2 };
                    const collision2 = this.physics.checkRayCollisions(ray2);
                    if (collision2) {
                        // set position to second collision
                        this.position = twgl_js_5.v3.add(this.position, twgl_js_5.v3.mulScalar(ray2.vector, collision2.t - 0.0001));
                    }
                    else {
                        // no second collision
                        this.position = twgl_js_5.v3.add(this.position, twgl_js_5.v3.mulScalar(this.velocity, dt));
                    }
                }
                else {
                    // air
                    this.velocity = this.physics.moveAir(strafeAccelDir, velWithGravity, dt);
                    this.position = twgl_js_5.v3.add(this.position, twgl_js_5.v3.mulScalar(this.velocity, dt));
                }
                this.lookAt = twgl_js_5.v3.add(this.position, twgl_js_5.m4.transformDirection(rotationMatrix, FORWARD));
            };
            this.getCameraMatrix = () => {
                return twgl_js_5.m4.lookAt(this.position, this.lookAt, UP);
            };
            InputListeners_1.onMouseMove(this.handleMouseMove);
        }
    }
    exports.Player = Player;
});
define("resources/DemoScene", ["require", "exports", "twgl.js", "gl-utils/GlTexture", "resources/SimpleTextures", "entities/WorldPrimitives", "entities/PhysicsPrimitives", "entities/Player"], function (require, exports, twgl, GlTexture_1, SimpleTextures_1, WorldPrimitives_1, PhysicsPrimitives_1, Player_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const floorWidth = 50;
    const floorDepth = 500;
    function createScene(gl, physics) {
        // init textures
        const image = SimpleTextures_1.createGridTexture(64, '#777');
        const texture = new GlTexture_1.GlTexture(gl, image);
        const image2 = SimpleTextures_1.createGridTexture(128, '#fff');
        const texture2 = new GlTexture_1.GlTexture(gl, image2);
        const image3 = SimpleTextures_1.createGridTexture(96, '#ccc');
        const texture3 = new GlTexture_1.GlTexture(gl, image3);
        const image4 = SimpleTextures_1.createGridTexture(128, '#aaa');
        const texture4 = new GlTexture_1.GlTexture(gl, image4);
        // world objects
        const floor = new WorldPrimitives_1.WorldPlane(floorWidth, floorDepth);
        floor.texture = texture2;
        floor.position = [0, -1, 0];
        const ramp1 = new WorldPrimitives_1.WorldPlane(3, 10);
        ramp1.texture = texture;
        ramp1.position = [-2, 0, -4];
        ramp1.rotation = twgl.m4.rotationZ(-Math.PI * (4 / 15));
        const ramp2 = new WorldPrimitives_1.WorldPlane(3, 10);
        ramp2.texture = texture;
        ramp2.position = [2, 0, -4];
        ramp2.rotation = twgl.m4.rotationZ(Math.PI * (4 / 15));
        const box = new WorldPrimitives_1.WorldCube(1, 1, 1);
        box.texture = texture3;
        box.position = [2, -0.5, 2.5];
        const box2 = new WorldPrimitives_1.WorldCube(1, 0.5, 1);
        box2.texture = texture3;
        box2.position = [2, -0.75, 3.5];
        const box3 = new WorldPrimitives_1.WorldCube(1, 1.5, 1);
        box3.texture = texture3;
        box3.position = [2, -0.25, 1.5];
        const box4 = new WorldPrimitives_1.WorldCube(1, 2, 3);
        box4.texture = texture4;
        box4.position = [3, 0, 2.5];
        const world = [ramp1, ramp2, floor, box, box2, box3, box4];
        // other objects
        const ball = new PhysicsPrimitives_1.BouncingBall(physics);
        ball.texture = new GlTexture_1.GlTexture(gl, SimpleTextures_1.createGridTexture(64, '#009cff'));
        ball.position[2] = -10;
        const objects = world.concat([
            ball
        ]);
        // create player entity
        const player = new Player_1.Player(physics);
        player.position = [0, 2, 3];
        player.rotateX = -Math.PI / 12;
        return {
            objects,
            world,
            player,
        };
    }
    exports.createScene = createScene;
});
define("index", ["require", "exports", "gl-utils/GlRenderer", "physics-utils/PhysicsProgram", "browser-utils/InputListeners", "resources/DemoScene"], function (require, exports, GlRenderer_1, PhysicsProgram_1, InputListeners_2, DemoScene_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // call init after load
    setTimeout(init, 1);
    // init
    function init() {
        const canvas = createCanvas();
        const gl = canvas.getContext('webgl2');
        if (!gl) {
            console.error("Couldn't get GL context");
            return;
        }
        // pointer lock
        canvas.addEventListener('mousedown', (e) => InputListeners_2.requestPointerLock(canvas));
        // programs
        const physics = new PhysicsProgram_1.PhysicsProgram();
        const renderer = new GlRenderer_1.GlRenderer(gl, physics);
        // scene
        const scene = DemoScene_1.createScene(gl, physics);
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
});
