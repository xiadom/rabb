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
define("physics-utils/PhysicsConstants", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // unit vectors
    exports.UP = [0, 1, 0];
    exports.RIGHT = [1, 0, 0];
    exports.FORWARD = [0, 0, -1];
    // v3 relative names
    exports.FORWARDk = 2;
    exports.SIDEi = 0;
    exports.UPj = 1;
    // angle names
    exports.ROLL = exports.FORWARDk;
    exports.PITCH = exports.SIDEi;
    exports.YAW = exports.UPj;
    // physics
    exports.GRAVITY = 9.8; // 800?
    exports.FRICTION = 4;
    exports.EDGE_FRICTION = 2;
    exports.PLAYER_CORE_HEIGHT = 0.7;
    exports.ACCELERATE = 2;
    exports.AIR_ACCELERATE = 2;
    // misc
    exports.EPSILON = 0.0001;
    exports.YAW_SMALL_LIMIT = exports.EPSILON;
});
define("physics-utils/CollisionDetection", ["require", "exports", "twgl.js"], function (require, exports, twgl_js_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const EPSILON = 1e-323;
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
                return { fraction: t, triangle, triangleNormal };
            }
        }
        return false;
    }
    exports.rayTriangleIntersection = rayTriangleIntersection;
});
define("physics-utils/PhysicsProgram", ["require", "exports", "twgl.js", "physics-utils/PhysicsConstants", "physics-utils/CollisionDetection"], function (require, exports, twgl_js_2, PhysicsConstants_1, CollisionDetection_1) {
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
        checkRayCollisions(ray, debugTag) {
            let nearestCollision = null;
            let closestFraction = 1 + PhysicsConstants_1.EPSILON;
            let falseCollision;
            for (let i = 0; i < this.triangles.length; i += 1) {
                const triangle = this.triangles[i];
                // move startpoint slightly backward to catch entry into solids
                const rayL = Object.assign({}, ray, { origin: twgl_js_2.v3.subtract(ray.origin, twgl_js_2.v3.mulScalar(ray.vector, PhysicsConstants_1.EPSILON)) });
                const collision2 = CollisionDetection_1.rayTriangleIntersection(rayL, triangle);
                if (collision2) {
                    // calculate true fraction
                    const collision = CollisionDetection_1.rayTriangleIntersection(ray, triangle);
                    if (!collision) {
                        falseCollision = collision2;
                    }
                    const collisionDepth = (collision ? collision.fraction : 0.0001);
                    if (collisionDepth < closestFraction) {
                        nearestCollision = collision;
                        closestFraction = collisionDepth;
                    }
                }
            }
            if (!nearestCollision && falseCollision) {
                // console.log('false collision', v3.dot(ray.vector, falseCollision.triangleNormal), falseCollision.fraction)
                if (falseCollision.fraction > PhysicsConstants_1.EPSILON) {
                    nearestCollision = falseCollision;
                }
            }
            if (debugTag && this.debugger) {
                const debugInfo = {
                    ray, debugTag, nearestCollision, closestFraction, falseCollision
                };
                if (this.debugger) {
                    this.debugger.logTrace(debugInfo);
                }
            }
            return nearestCollision;
        }
        getGravityDv(dt) {
            return twgl_js_2.v3.mulScalar(GRAVITY, dt);
        }
        getCollisionReflection(ray, velocity, gravityDv, collision, dt) {
            // estimate collision velocity
            const velocityAtCollision = twgl_js_2.v3.add(velocity, twgl_js_2.v3.mulScalar(gravityDv, collision.fraction));
            const dPositionT = twgl_js_2.v3.mulScalar(ray.vector, collision.fraction);
            const collisionPoint = twgl_js_2.v3.add(ray.origin, dPositionT);
            // reflect velocity relative to collision triangle normal
            const edge1 = twgl_js_2.v3.subtract(collision.triangle.v1, collision.triangle.v0);
            const edge2 = twgl_js_2.v3.subtract(collision.triangle.v2, collision.triangle.v0);
            const reflectedVelocity = twgl_js_2.v3.subtract(velocityAtCollision, twgl_js_2.v3.mulScalar(collision.triangleNormal, 2.0 * twgl_js_2.v3.dot(velocityAtCollision, collision.triangleNormal)));
            // subtract remaining gravity
            const finalVelocity = twgl_js_2.v3.add(reflectedVelocity, twgl_js_2.v3.mulScalar(gravityDv, (1.0 - collision.fraction)));
            // estimate after-bounce position
            const dPosition2 = twgl_js_2.v3.mulScalar(reflectedVelocity, dt * (1.0 - collision.fraction));
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
define("gl-utils/MiscUtils", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function mapIndices2d(object, prop) {
        return Array.prototype.reduce.call(object.indices, (acc, id) => acc.concat([
            object[prop][3 * id],
            object[prop][3 * id + 1],
        ]), []);
    }
    exports.mapIndices2d = mapIndices2d;
    function mapIndices3d(object, prop) {
        return Array.prototype.reduce.call(object.indices, (acc, id) => acc.concat([
            object[prop][3 * id],
            object[prop][3 * id + 1],
            object[prop][3 * id + 2],
        ]), []);
    }
    exports.mapIndices3d = mapIndices3d;
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
define("physics-utils/PhysicsDebugger", ["require", "exports", "twgl.js", "gl-utils/MiscUtils", "gl-utils/GlTexture", "resources/SimpleTextures", "physics-utils/PhysicsConstants"], function (require, exports, twgl_js_3, MiscUtils_1, GlTexture_1, SimpleTextures_1, PhysicsConstants_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    let selectedTexture;
    class PhysicsDebugger {
        constructor(gl, physics) {
            this.gl = gl;
            this.physics = physics;
            this.objects = [];
            this.moveArrows = [];
            this.traceArrows = [];
            this.logs = [];
            this.paused = false;
            this.guiListeners = [];
            this.selectedIdx = null;
            this.addListener = (l) => {
                this.guiListeners.push(l);
            };
            this.removeListener = (l) => {
                const idx = this.guiListeners.indexOf(l);
                if (idx > -1) {
                    this.guiListeners.splice(idx, 1);
                }
            };
            this.logFrame = (frame, state) => {
                if (this.paused)
                    return;
                state = JSON.parse(JSON.stringify(state));
                this.logs.unshift({ frame, state, changes: [], traces: [] });
                this.triggerRefresh();
            };
            this.logState = (change) => {
                if (this.paused)
                    return;
                const latestLog = this.logs[0];
                latestLog.changes.unshift(JSON.parse(JSON.stringify(change)));
                this.triggerRefresh();
            };
            this.logTrace = (debugInfo) => {
                if (this.paused)
                    return;
                const latestLog = this.logs[0];
                latestLog.traces.unshift(JSON.parse(JSON.stringify(debugInfo)));
                this.triggerRefresh();
            };
            this.pauseLogging = () => {
                this.paused = true;
                console.log('paused state', this);
                window.localStorage['last-physics-log'] = JSON.stringify(this.logs);
                this.triggerRefresh();
            };
            this.selectLog = (idx) => {
                this.paused = true;
                this.selectedIdx = idx;
                this.triggerRefresh();
            };
            this.triggerRefresh = () => {
                if (this.refreshTimeout)
                    return;
                this.refreshTimeout = setTimeout(() => {
                    this.refreshTimeout = null;
                    //update gui
                    this.refreshGui();
                }, 250);
                this.refreshArrows();
            };
            this.refreshGui = () => {
                this.guiListeners.forEach((l) => l());
            };
            this.refreshArrows = () => {
                const sParts = this.selectedIdx && this.selectedIdx.split('-');
                const sLogIdx = sParts && sParts[0] === 'log' && sParts[1] && parseInt(sParts[1], 10);
                const sTraceIdx = sParts && sParts[2] === 'trace' && sParts[3] && parseInt(sParts[2], 10);
                for (let i = 1; i < 20; ++i) {
                    if (this.logs[i] && this.logs[i - 1] && (!sLogIdx || i !== sLogIdx)) {
                        this.moveArrows[i].position = twgl_js_3.v3.copy(this.logs[i].state.origin);
                        this.moveArrows[i].vector =
                            twgl_js_3.v3.subtract(this.logs[i - 1].state.origin, this.logs[i].state.origin);
                    }
                }
                // selected log arrow
                const li = (sLogIdx > 1) ? sLogIdx : 0;
                const prevLog = this.logs[li - 1];
                const log = this.logs[li];
                if (log && prevLog) {
                    this.moveArrows[0].position = twgl_js_3.v3.copy(log.state.origin);
                    this.moveArrows[0].vector =
                        twgl_js_3.v3.subtract(prevLog.state.origin, log.state.origin);
                    if (li === sLogIdx && !sTraceIdx) {
                        console.log('ts?');
                        this.moveArrows[0].originalTexture = this.moveArrows[0].texture;
                        this.moveArrows[0].texture = selectedTexture;
                    }
                    else {
                        if (this.moveArrows[0].originalTexture) {
                            this.moveArrows[0].texture = this.moveArrows[0].originalTexture;
                        }
                    }
                }
                for (let i = 0; i < 10; ++i) {
                    if (log && log.traces[i]) {
                        const logRay = log.traces[i] && log.traces[i].ray;
                        if (logRay && (['cat.pos', 'pushup.hull'].indexOf(log.traces[i].debugTag) === -1)) {
                            this.traceArrows[i].position = logRay.origin;
                            this.traceArrows[i].vector = logRay.vector;
                            if ((li === sLogIdx) && (i === sTraceIdx)) {
                                console.log('ts2?');
                                this.traceArrows[i].originalTexture = this.traceArrows[i].texture;
                                this.traceArrows[i].texture = selectedTexture;
                            }
                            else if (this.traceArrows[i].originalTexture) {
                                this.traceArrows[i].texture = this.traceArrows[i].originalTexture;
                            }
                        }
                    }
                }
            };
            this.buildArrows = () => {
                let position = 10;
                for (let i = 0; i < 20; ++i) {
                    const arrow2 = new PhysicsDebugArrow();
                    const r = Math.floor(256 * Math.random());
                    const g = Math.floor(256 * Math.random());
                    const b = Math.floor(256 * Math.random());
                    arrow2.texture = new GlTexture_1.GlTexture(this.gl, SimpleTextures_1.createGridTexture(64, `rgb(${128},${g},${b})`));
                    arrow2.position[PhysicsConstants_2.UPj] = (position -= 1);
                    this.moveArrows.push(arrow2);
                    this.objects.push(arrow2);
                }
                for (let i = 0; i < 10; ++i) {
                    const arrow2 = new PhysicsDebugArrow();
                    const r = Math.floor(256 * Math.random());
                    const g = Math.floor(256 * Math.random());
                    const b = Math.floor(256 * Math.random());
                    arrow2.texture = new GlTexture_1.GlTexture(this.gl, SimpleTextures_1.createGridTexture(64, `rgb(${128},${g},${b})`));
                    arrow2.position[PhysicsConstants_2.UPj] = (position -= 1);
                    this.traceArrows.push(arrow2);
                    this.objects.push(arrow2);
                }
                selectedTexture = new GlTexture_1.GlTexture(this.gl, SimpleTextures_1.createGridTexture(64, `rgb(${255},${0},${0})`));
            };
            this.buildArrows();
        }
    }
    exports.PhysicsDebugger = PhysicsDebugger;
    class PhysicsDebugArrow {
        constructor(size = 1) {
            this.size = size;
            this.position = [0, 0, 0];
            this.vector = [0, 1, 0];
            this.update = (dt) => {
            };
            const CONE_HEIGHT = 0.1 * this.size;
            const HEIGHT = 1;
            const HEIGHT_SHIFT = 0.02;
            this.cone = twgl_js_3.primitives.createTruncatedConeVertices(0.05 * this.size, 0.000005 * this.size, CONE_HEIGHT, 10, 10);
            this.stem = twgl_js_3.primitives.createCylinderVertices(0.01 * this.size, HEIGHT - HEIGHT_SHIFT, 10, 1);
            // translate index list to vertex array
            const allGrouped = [this.cone, this.stem]
                .reduce((all, obj) => {
                return {
                    vertexes: all.vertexes.concat(MiscUtils_1.mapIndices3d(obj, 'position')
                        .map((v, i) => 1 === (i % 3) ?
                        (obj === this.cone) ? v + HEIGHT - CONE_HEIGHT / 2 :
                            v + HEIGHT / 2 - HEIGHT_SHIFT / 2 :
                        v)),
                    texcoords: all.texcoords.concat(MiscUtils_1.mapIndices2d(obj, 'texcoord')
                        .map((v, i) => v)),
                };
            }, { vertexes: [], texcoords: [] });
            this.vertexes = new Float32Array(allGrouped.vertexes);
            this.texcoords = new Float32Array(allGrouped.texcoords);
        }
        getVertexes() {
            return this.vertexes;
        }
        getTexcoords() {
            return this.texcoords;
        }
        getWorldMatrix() {
            const y = twgl_js_3.v3.normalize(this.vector);
            const x = twgl_js_3.v3.normalize(twgl_js_3.v3.cross([0, 0, 1], y));
            const z = twgl_js_3.v3.cross(x, y);
            let am = twgl_js_3.m4.identity();
            am[0] = x[0];
            am[1] = x[1];
            am[2] = x[2];
            am[4 + 0] = y[0];
            am[4 + 1] = y[1];
            am[4 + 2] = y[2];
            am[8 + 0] = z[0];
            am[8 + 1] = z[1];
            am[8 + 2] = z[2];
            const l = twgl_js_3.v3.length(this.vector);
            return twgl_js_3.m4.scale(twgl_js_3.m4.setTranslation(am, this.position), [l, l, l]);
        }
        getBufferRange() {
            return this.bufferRange;
        }
        setBufferRange(start, len) {
            this.bufferRange = { start, len };
        }
    }
    exports.PhysicsDebugArrow = PhysicsDebugArrow;
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
define("entities/WorldPrimitives", ["require", "exports", "twgl.js"], function (require, exports, twgl_js_4) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class WorldPlane {
        constructor(width, height) {
            this.width = width;
            this.height = height;
            this.position = [0, 0, 0];
            this.rotation = twgl_js_4.m4.identity();
        }
        update(time) { }
        getWorldMatrix() {
            const { width, height } = this;
            var matrix = twgl_js_4.m4.translate(twgl_js_4.m4.identity(), this.position);
            matrix = twgl_js_4.m4.multiply(matrix, this.rotation);
            matrix = twgl_js_4.m4.scale(matrix, [width, 1, height]);
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
            this.rotation = twgl_js_4.m4.identity();
        }
        update(time) { }
        getWorldMatrix() {
            const { width, height, depth } = this;
            var matrix = twgl_js_4.m4.translate(twgl_js_4.m4.identity(), this.position);
            matrix = twgl_js_4.m4.multiply(matrix, this.rotation);
            matrix = twgl_js_4.m4.scale(matrix, [width, height, depth]);
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
    class SurfPrism {
        constructor(width, height, depth) {
            this.width = width;
            this.height = height;
            this.depth = depth;
            this.position = [0, 0, 0];
            this.rotation = twgl_js_4.m4.identity();
        }
        update(time) { }
        getWorldMatrix() {
            const { width, height, depth } = this;
            var matrix = twgl_js_4.m4.translate(twgl_js_4.m4.identity(), this.position);
            matrix = twgl_js_4.m4.multiply(matrix, this.rotation);
            matrix = twgl_js_4.m4.scale(matrix, [width, height, depth]);
            return matrix;
        }
        getVertexes() {
            return new Float32Array([
                0, 0.5, -0.5,
                0, 0.5, 0.5,
                0.5, -0.5, -0.5,
                0.5, -0.5, -0.5,
                0, 0.5, 0.5,
                0.5, -0.5, 0.5,
                0, 0.5, 0.5,
                0, 0.5, -0.5,
                -0.5, -0.5, -0.5,
                -0.5, -0.5, 0.5,
                0, 0.5, 0.5,
                -0.5, -0.5, -0.5,
                -0.5, -0.5, 0.5,
                0.5, -0.5, 0.5,
                0, 0.5, 0.5,
                -0.5, -0.5, -0.5,
                0, 0.5, -0.5,
                0.5, -0.5, -0.5,
            ]);
        }
        getTexcoords() {
            const { width, height, depth } = this;
            return new Float32Array([
                depth, 0,
                0, 0,
                depth, height,
                depth, height,
                0, 0,
                0, height,
                depth, 0,
                0, 0,
                0, height,
                depth, height,
                depth, 0,
                0, height,
                0, height,
                width, height,
                0.5 * width, 0,
                width, height,
                0.5 * width, 0,
                0, height,
            ]);
        }
        getBufferRange() {
            return this.bufferRange;
        }
        setBufferRange(start, len) {
            this.bufferRange = { start, len };
        }
    }
    exports.SurfPrism = SurfPrism;
});
define("entities/PhysicsPrimitives", ["require", "exports", "twgl.js", "gl-utils/MiscUtils"], function (require, exports, twgl_js_5, MiscUtils_2) {
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
                const newVelocity = twgl_js_5.v3.add(this.velocity, gravityDv);
                // check collisions
                const dPosition = twgl_js_5.v3.mulScalar(newVelocity, dt);
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
                    this.position = twgl_js_5.v3.add(this.position, dPosition);
                    this.velocity = newVelocity;
                }
            };
            this.sphere = twgl_js_5.primitives.createSphereVertices(RADIUS, subdivisionsAxis, subdivisionsHeight);
            // translate index list to vertex array
            this.vertexes = new Float32Array(MiscUtils_2.mapIndices3d(this.sphere, 'position'));
            this.texcoords = new Float32Array(MiscUtils_2.mapIndices2d(this.sphere, 'texcoord'));
        }
        getWorldMatrix() {
            return twgl_js_5.m4.translate(twgl_js_5.m4.identity(), this.position);
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
define("entities/Player", ["require", "exports", "twgl.js", "browser-utils/InputListeners", "physics-utils/PhysicsConstants"], function (require, exports, twgl_js_6, InputListeners_1, PhysicsConstants_3) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // unit vectors
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
                const rotationMatrix = twgl_js_6.m4.rotateX(twgl_js_6.m4.rotationY(this.rotateY), this.rotateX);
                // translate camera relative to view rotation
                const strafeAccelDir = twgl_js_6.v3.normalize(twgl_js_6.m4.transformDirection(rotationMatrix, [accelDir[0], 0, 0]));
                const walkAccelDir = twgl_js_6.v3.normalize(twgl_js_6.m4.transformDirection(rotationMatrix, accelDir));
                // calculate estimated velocity
                const gravityDv = this.physics.getGravityDv(dt);
                const velWithGravity = twgl_js_6.v3.add(this.velocity, gravityDv);
                // check collisions
                const collisionRadius = twgl_js_6.v3.mulScalar(twgl_js_6.v3.normalize(gravityDv), PLAYER_COLLISION_RADIUS);
                const dFallPosition = twgl_js_6.v3.mulScalar(velWithGravity, dt);
                const rayVector = twgl_js_6.v3.add(collisionRadius, dFallPosition);
                const ray = { origin: twgl_js_6.v3.add(this.position, this.bottom), vector: rayVector };
                const collision = this.physics.checkRayCollisions(ray);
                if (collision) {
                    const groundAngle = twgl_js_6.v3.dot(collision.triangleNormal, PhysicsConstants_3.UP);
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
                            const collisionVelocity = twgl_js_6.v3.dot(this.velocity, collision.triangleNormal);
                            this.velocity = twgl_js_6.v3.subtract(this.velocity, twgl_js_6.v3.mulScalar(collision.triangleNormal, collisionVelocity));
                        }
                    }
                    else {
                        // surf
                        const cd = this.physics.getCollisionReflection(ray, this.velocity, gravityDv, collision, dt);
                        this.velocity = this.physics.moveAir(twgl_js_6.v3.mulScalar(strafeAccelDir, 4), cd.velocity, dt);
                        const collisionVelocity = twgl_js_6.v3.dot(this.velocity, collision.triangleNormal);
                        this.velocity = twgl_js_6.v3.subtract(this.velocity, twgl_js_6.v3.mulScalar(collision.triangleNormal, collisionVelocity));
                    }
                    // set position from collision
                    this.position = twgl_js_6.v3.add(this.position, twgl_js_6.v3.mulScalar(rayVector, collision.fraction - 0.0001));
                    // check for second collision
                    const dFallPosition2 = twgl_js_6.v3.mulScalar(this.velocity, dt);
                    const ray2 = { origin: twgl_js_6.v3.add(this.position, this.bottom), vector: dFallPosition2 };
                    const collision2 = this.physics.checkRayCollisions(ray2);
                    if (collision2) {
                        // set position to second collision
                        this.position = twgl_js_6.v3.add(this.position, twgl_js_6.v3.mulScalar(ray2.vector, collision2.fraction - 0.0001));
                    }
                    else {
                        // no second collision
                        this.position = twgl_js_6.v3.add(this.position, twgl_js_6.v3.mulScalar(this.velocity, dt));
                    }
                }
                else {
                    // air
                    this.velocity = this.physics.moveAir(strafeAccelDir, velWithGravity, dt);
                    this.position = twgl_js_6.v3.add(this.position, twgl_js_6.v3.mulScalar(this.velocity, dt));
                }
                this.lookAt = twgl_js_6.v3.add(this.position, twgl_js_6.m4.transformDirection(rotationMatrix, PhysicsConstants_3.FORWARD));
            };
            this.getCameraMatrix = () => {
                return twgl_js_6.m4.lookAt(this.position, this.lookAt, PhysicsConstants_3.UP);
            };
            InputListeners_1.onMouseMove(this.handleMouseMove);
        }
    }
    exports.Player = Player;
});
define("physics-utils/PlayerMovement16", ["require", "exports", "twgl.js", "physics-utils/PhysicsConstants"], function (require, exports, twgl_js_7, PhysicsConstants_4) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const FRICTION_TRACE_RADIUS = 0.1;
    const GROUND_TRACE_RADIUS = PhysicsConstants_4.PLAYER_CORE_HEIGHT + FRICTION_TRACE_RADIUS;
    const FAST_UP_LIMIT = 1;
    const DUCKING_SLOWDOWN = 0.35;
    const DUCKING_LENGTH = 1000;
    const MAX_WISH_SPEED = 4;
    const MAX_BUMPS = 4;
    const BOUNCE = 2;
    const SMALLEST_SPEED = PhysicsConstants_4.EPSILON;
    const STEP_HEIGHT = 0.1;
    const JUMP_VELOCITY = 4;
    function MovePlayer(frame, state, setState, physics) {
        ReduceTimers(frame, state, setState);
        AngleVectors(frame, state, setState);
        // todo unstick?
        CategorizePosition(frame, state, setState, physics);
        switch (state.movetype) {
            case 'FLY':
                if (frame.jumpPressed) {
                    MovePlayerJump(frame, state, setState, physics);
                }
                else {
                    setState({ wasJumpPressed: false });
                }
                if (state.baseVelocity) {
                    setState({ velocity: twgl_js_7.v3.add(state.baseVelocity, state.velocity) });
                }
                MovePlayerFly(frame, state, setState, physics);
                if (state.baseVelocity) {
                    setState({ velocity: twgl_js_7.v3.add(state.baseVelocity, state.velocity) });
                }
                break;
            case 'WALK':
                AddCorrectGravity(frame, state, setState, physics);
                if (frame.jumpPressed) {
                    MovePlayerJump(frame, state, setState, physics);
                }
                else {
                    setState({ wasJumpPressed: false });
                }
                if (state.onGround) {
                    state.velocity[PhysicsConstants_4.UPj] = 0.0;
                    MovePlayerFriction(frame, state, setState, physics);
                }
                // check velocity?
                if (state.onGround) {
                    MovePlayerWalk(frame, state, setState, physics);
                }
                else {
                    MovePlayerAir(frame, state, setState, physics);
                }
                CategorizePosition(frame, state, setState, physics);
                if (state.baseVelocity) {
                    setState({ velocity: twgl_js_7.v3.subtract(state.baseVelocity, state.velocity) });
                }
                // check velocity?
                FixupGravityVelocity(frame, state, setState, physics);
                if (state.onGround) {
                    state.velocity[PhysicsConstants_4.UPj] = 0.0;
                }
                break;
            default: break;
        }
    }
    exports.MovePlayer = MovePlayer;
    function MovePlayerFly(frame, state, setState, physics) {
        let originalVelocity = twgl_js_7.v3.copy(state.velocity);
        const primalVelocity = twgl_js_7.v3.copy(state.velocity);
        let allFraction = 0;
        let numPlanes = 0;
        let timeLeft = frame.dt;
        let blockingPlanes = [];
        let newVelocity = [0, 0, 0];
        for (let bc = 0; bc < MAX_BUMPS; ++bc) {
            if (twgl_js_7.v3.length(state.velocity) < PhysicsConstants_4.EPSILON)
                break;
            const ray = {
                origin: twgl_js_7.v3.subtract(state.origin, [0, PhysicsConstants_4.PLAYER_CORE_HEIGHT, 0]),
                vector: twgl_js_7.v3.mulScalar(state.velocity, timeLeft)
            };
            const trace = physics.checkRayCollisions(ray, 'flymove1');
            allFraction += (trace ? trace.fraction : 1);
            if (!trace || (trace.fraction > 0)) {
                let newOrigin = twgl_js_7.v3.add(state.origin, twgl_js_7.v3.mulScalar(ray.vector, trace ? trace.fraction : 1));
                // check if new origin is player collision
                let pcTrace;
                do {
                    const playerRay = {
                        origin: twgl_js_7.v3.copy(newOrigin),
                        vector: [0, -PhysicsConstants_4.PLAYER_CORE_HEIGHT, 0],
                    };
                    pcTrace = physics.checkRayCollisions(playerRay, 'allSolid');
                    if (pcTrace) {
                        newOrigin[PhysicsConstants_4.UPj] += PhysicsConstants_4.PLAYER_CORE_HEIGHT * (1 - pcTrace.fraction);
                    }
                } while (pcTrace);
                // set new origin
                if (frame.debug)
                    frame.debug.originFromTraceOrEmpty = trace;
                setState({ origin: newOrigin });
                originalVelocity = twgl_js_7.v3.copy(state.velocity);
                numPlanes = 0;
            }
            if (!trace)
                break;
            timeLeft -= timeLeft * trace.fraction;
            blockingPlanes.push(trace);
            numPlanes++;
            if ((state.movetype === 'WALK') && (!state.onGround || (state.friction != 1))) {
                let i = 0;
                for (; i < numPlanes; ++i) {
                    if (blockingPlanes[i].triangleNormal[PhysicsConstants_4.UPj] > 0.7) {
                        ClipPlayerVelocity(originalVelocity, blockingPlanes[i].triangleNormal, newVelocity, 1);
                        originalVelocity = twgl_js_7.v3.copy(newVelocity);
                    }
                    else {
                        ClipPlayerVelocity(originalVelocity, blockingPlanes[i].triangleNormal, newVelocity, 1.1);
                    }
                }
                setState({ velocity: newVelocity });
                originalVelocity = twgl_js_7.v3.copy(newVelocity);
            }
            else {
                let i = 0;
                for (; i < numPlanes; ++i) {
                    ClipPlayerVelocity(originalVelocity, blockingPlanes[i].triangleNormal, state.velocity, 1);
                    let j = 0;
                    for (; j < numPlanes; ++j) {
                        if (j !== i) {
                            if (twgl_js_7.v3.dot(state.velocity, blockingPlanes[j].triangleNormal) < 0) {
                                break;
                            }
                        }
                    }
                    if (j === numPlanes) {
                        break;
                    }
                }
                if (i === numPlanes) {
                    if (numPlanes !== 2) {
                        // only works for creases
                        setState({ velocity: [0, 0, 0] });
                        break;
                    }
                    const dir = twgl_js_7.v3.cross(blockingPlanes[0].triangleNormal, blockingPlanes[1].triangleNormal);
                    const d = twgl_js_7.v3.dot(dir, state.velocity);
                    setState({ velocity: twgl_js_7.v3.mulScalar(dir, d) });
                }
                if (twgl_js_7.v3.dot(state.velocity, primalVelocity) <= 0) {
                    // stop if oscillating
                    setState({ velocity: [0, 0, 0] });
                    break;
                }
            }
        }
        // couldnt find a moveable direction
        if (allFraction === 0) {
            setState({ velocity: [0, 0, 0] });
        }
        if (state.wasCollision) {
            // console.log('was collision', state, frame)
            if (numPlanes === 0)
                setState({ wasCollision: false });
        }
        if (numPlanes > 0) {
            // console.log('collision', numPlanes, state.velocity)
            setState({ wasCollision: true });
        }
    }
    exports.MovePlayerFly = MovePlayerFly;
    function MovePlayerWalk(frame, state, setState, physics) {
        const zForward = twgl_js_7.v3.normalize([state.forward[0], 0.0, state.forward[2]]);
        let wishVel = twgl_js_7.v3.copy(frame.move);
        wishVel[PhysicsConstants_4.UPj] = 0;
        const wishDir = twgl_js_7.v3.normalize(wishVel);
        const wishSpeed = twgl_js_7.v3.length(wishVel) * MAX_WISH_SPEED;
        if (wishSpeed > MAX_WISH_SPEED) {
            wishVel = twgl_js_7.v3.mulScalar(wishVel, MAX_WISH_SPEED / wishSpeed);
        }
        MovePlayerAccelerate(frame, state, setState, wishDir, wishSpeed, PhysicsConstants_4.ACCELERATE);
        if (state.baseVelocity) {
            setState({ velocity: twgl_js_7.v3.add(state.baseVelocity, state.velocity) });
        }
        const spd = twgl_js_7.v3.length(state.velocity);
        if (spd < SMALLEST_SPEED) {
            setState({ velocity: [0, 0, 0] });
        }
        const oldOnGround = state.onGround;
        // trace expected movement
        const ray = {
            origin: twgl_js_7.v3.subtract(state.origin, [0, PhysicsConstants_4.PLAYER_CORE_HEIGHT, 0]),
            vector: twgl_js_7.v3.mulScalar(state.velocity, frame.dt)
        };
        const trace = physics.checkRayCollisions(ray, 'walkmove1');
        if (!trace) {
            let newOrigin = twgl_js_7.v3.add(state.origin, ray.vector);
            // check player capsule collision
            newOrigin = FixPlayerOrigin(state, physics, newOrigin);
            // no collision, so follow velocity
            if (frame.debug)
                frame.debug.originFromNoCollision = newOrigin;
            setState({ origin: newOrigin });
            return;
        }
        if (!oldOnGround) {
            return;
        }
        // try sliding forward or up stairs
        const original = twgl_js_7.v3.copy(state.origin);
        const originalVel = twgl_js_7.v3.copy(state.velocity);
        // get normal try results
        MovePlayerFly(frame, state, setState, physics);
        const down = twgl_js_7.v3.copy(state.origin);
        const downVel = twgl_js_7.v3.copy(state.velocity);
        // reset state
        if (frame.debug)
            frame.debug.originFromReset = twgl_js_7.v3.copy(original);
        setState({ origin: twgl_js_7.v3.copy(original) });
        setState({ velocity: twgl_js_7.v3.copy(originalVel) });
        // try step up
        ray.vector = [0, 0, 0];
        ray.vector[PhysicsConstants_4.UPj] += STEP_HEIGHT;
        const traceUp = physics.checkRayCollisions(ray, 'walkmove up');
        const traceUpEnd = twgl_js_7.v3.add(twgl_js_7.v3.add(ray.origin, [0, PhysicsConstants_4.PLAYER_CORE_HEIGHT, 0]), ray.vector);
        if (!traceUp) {
            if (frame.debug)
                frame.debug.originFromTraceUpEnd = twgl_js_7.v3.copy(traceUpEnd);
            setState({ origin: traceUpEnd });
        }
        MovePlayerFly(frame, state, setState, physics);
        // try going back down
        ray.vector = [0, 0, 0];
        ray.vector[PhysicsConstants_4.UPj] -= STEP_HEIGHT;
        const traceDown = physics.checkRayCollisions(ray, 'walkmove down');
        const traceDownEnd = twgl_js_7.v3.add(twgl_js_7.v3.add(ray.origin, [0, PhysicsConstants_4.PLAYER_CORE_HEIGHT, 0]), ray.vector);
        let useDown;
        if (trace && trace.triangleNormal[PhysicsConstants_4.UPj] < 0.7) {
            // not on floor, use original
            useDown = true;
        }
        else {
            // check if new origin is player collision
            const playerRay = {
                origin: twgl_js_7.v3.copy(traceDownEnd),
                vector: [0, -PhysicsConstants_4.PLAYER_CORE_HEIGHT, 0],
            };
            const pcTrace = physics.checkRayCollisions(playerRay, 'allSolid');
            if (pcTrace) {
                traceDownEnd[PhysicsConstants_4.UPj] += PhysicsConstants_4.PLAYER_CORE_HEIGHT * (1 - pcTrace.fraction);
                // console.log('newOrigin3',traceDownEnd)
            }
            if (!traceDown) {
                if (frame.debug)
                    frame.debug.originFromtraceDownEnd = twgl_js_7.v3.copy(traceDownEnd);
                setState({ origin: traceDownEnd });
            }
            // copy to up
            setState({ up: twgl_js_7.v3.copy(state.origin) });
            // calc which went farther
            const downDist = twgl_js_7.v3.length(twgl_js_7.v3.subtract(traceDownEnd, original));
            const upDist = twgl_js_7.v3.length(twgl_js_7.v3.subtract(traceUpEnd, original));
            if (downDist > upDist) {
                useDown = true;
            }
        }
        if (useDown) {
            // check if new origin is player collision
            const playerRay = {
                origin: twgl_js_7.v3.copy(down),
                vector: [0, -PhysicsConstants_4.PLAYER_CORE_HEIGHT, 0],
            };
            const pcTrace = physics.checkRayCollisions(playerRay, 'allSolid');
            if (pcTrace) {
                down[PhysicsConstants_4.UPj] += PhysicsConstants_4.PLAYER_CORE_HEIGHT * (1 - pcTrace.fraction);
                // console.log('newOrigin4',down)
            }
            if (frame.debug)
                frame.debug.originFromtraceDownEnd = twgl_js_7.v3.copy(traceDownEnd);
            setState({ origin: down });
            setState({ velocity: downVel });
        }
        else {
            // copy z from slide move??
            state.velocity[PhysicsConstants_4.UPj] = downVel[PhysicsConstants_4.UPj];
        }
    }
    exports.MovePlayerWalk = MovePlayerWalk;
    function FixPlayerOrigin(state, physics, newOrigin) {
        // check if new origin is player feet (lower semisphere of capsule) collision
        const feetVector = twgl_js_7.v3.mulScalar(twgl_js_7.v3.normalize(state.velocity), 0.1);
        const playerRay1 = {
            origin: twgl_js_7.v3.subtract(newOrigin, [0, PhysicsConstants_4.PLAYER_CORE_HEIGHT, 0]),
            vector: feetVector
        };
        const pcTrace1 = physics.checkRayCollisions(playerRay1, 'feetSolid');
        if (pcTrace1) {
            newOrigin = twgl_js_7.v3.subtract(newOrigin, twgl_js_7.v3.mulScalar(feetVector, (1 - pcTrace1.fraction)));
        }
        // check if new origin is player core collision
        const playerRay = {
            origin: twgl_js_7.v3.copy(newOrigin),
            vector: [0, -PhysicsConstants_4.PLAYER_CORE_HEIGHT, 0],
        };
        const pcTrace = physics.checkRayCollisions(playerRay, 'allSolid');
        if (pcTrace) {
            newOrigin[PhysicsConstants_4.UPj] += PhysicsConstants_4.PLAYER_CORE_HEIGHT * (1 - pcTrace.fraction);
        }
        return newOrigin;
    }
    exports.FixPlayerOrigin = FixPlayerOrigin;
    function ReduceTimers(frame, state, setState) {
        setState({ animDuck: state ? state.animDuck - frame.dt : 0 });
        if (state.anim < 0)
            state.animDuck = 0;
    }
    exports.ReduceTimers = ReduceTimers;
    function CategorizePosition(frame, state, setState, physics) {
        const ray = { origin: state.origin, vector: [0, -GROUND_TRACE_RADIUS, 0] };
        if (state.velocity && state.velocity[PhysicsConstants_4.UPj] > FAST_UP_LIMIT) {
            setState({ onGround: false });
        }
        else {
            const trace = physics.checkRayCollisions(ray, 'cat.pos');
            if (trace && (trace.triangleNormal[PhysicsConstants_4.UPj] >= 0.71)) {
                setState({ onGround: true });
                setState({ groundCollision: trace });
            }
            else {
                setState({ onGround: false }); // too steep
                setState({ groundCollision: null });
            }
        }
    }
    exports.CategorizePosition = CategorizePosition;
    function MovePlayerFriction(frame, state, setState, physics) {
        const v = state.velocity;
        const speed = twgl_js_7.v3.length(v);
        if (speed < PhysicsConstants_4.EPSILON)
            return;
        let drop = 0;
        if (state.onGround) {
            const start = twgl_js_7.v3.add(state.origin, [v[0] / speed * 16, -PhysicsConstants_4.PLAYER_CORE_HEIGHT, v[1] / speed * 16]);
            const ray = { origin: start, vector: [0, -FRICTION_TRACE_RADIUS, 0] };
            const trace = physics.checkRayCollisions(ray, 'friction');
            let friction = 0;
            if (!trace) {
                friction = PhysicsConstants_4.FRICTION * PhysicsConstants_4.EDGE_FRICTION;
            }
            else if (trace) {
                friction = PhysicsConstants_4.FRICTION;
            }
            friction *= state.friction; // player friction?
            const control = (speed < PhysicsConstants_4.EPSILON) ? PhysicsConstants_4.EPSILON : speed;
            drop += control * friction * frame.dt;
        }
        let newSpeed = speed - drop;
        if (newSpeed < 0)
            newSpeed = 0;
        newSpeed /= speed;
        setState({ velocity: twgl_js_7.v3.mulScalar(state.velocity, newSpeed) });
    }
    exports.MovePlayerFriction = MovePlayerFriction;
    function MovePlayerAccelerate(frame, state, setState, wishDir, wishSpeed, accel) {
        const currentSpeed = twgl_js_7.v3.dot(state.velocity, wishDir);
        const addSpeed = wishSpeed - currentSpeed;
        if (addSpeed <= 0)
            return;
        let accelSpeed = accel * frame.dt * wishSpeed * state.friction;
        if (accelSpeed < addSpeed) {
            accelSpeed = addSpeed;
        }
        setState({ velocity: twgl_js_7.v3.mulScalar(wishDir, accelSpeed) });
    }
    exports.MovePlayerAccelerate = MovePlayerAccelerate;
    function MovePlayerAirAccelerate(frame, state, setState, wishDir, wishSpeed, accel) {
        if (wishSpeed > MAX_WISH_SPEED) {
            wishSpeed = MAX_WISH_SPEED;
        }
        const currentSpeed = twgl_js_7.v3.dot(state.velocity, wishDir);
        const addSpeed = wishSpeed - currentSpeed;
        if (addSpeed <= 0)
            return;
        let accelSpeed = accel * wishSpeed * frame.dt * state.friction;
        if (accelSpeed > addSpeed)
            accelSpeed = addSpeed;
        setState({ velocity: twgl_js_7.v3.add(state.velocity, twgl_js_7.v3.mulScalar(wishDir, accelSpeed)) });
    }
    exports.MovePlayerAirAccelerate = MovePlayerAirAccelerate;
    function MovePlayerAir(frame, state, setState, physics) {
        const wishVel = twgl_js_7.v3.copy(frame.move);
        const wishSpeed = twgl_js_7.v3.length(wishVel) * MAX_WISH_SPEED;
        MovePlayerAirAccelerate(frame, state, setState, twgl_js_7.v3.normalize(wishVel), wishSpeed, PhysicsConstants_4.AIR_ACCELERATE);
        if (state.baseVelocity) {
            setState({ velocity: twgl_js_7.v3.add(state.baseVelocity, state.velocity) });
        }
        MovePlayerFly(frame, state, setState, physics);
    }
    exports.MovePlayerAir = MovePlayerAir;
    function ClipPlayerVelocity(inVel, normal, outVel, overbounce) {
        const angle = normal[PhysicsConstants_4.UPj];
        let blocked = null;
        if (angle === 1.0) {
            blocked = { floor: true };
        }
        else if (angle > 0) {
            blocked = { slope: true };
        }
        else if (!angle) {
            blocked = { wall: true };
        }
        const backoff = twgl_js_7.v3.dot(inVel, normal) * overbounce;
        let change;
        for (let i = 0; i < 3; ++i) {
            change = normal[i] * backoff;
            outVel[i] = inVel[i] - change;
            if (outVel[i] > -PhysicsConstants_4.EPSILON && outVel[i] < PhysicsConstants_4.EPSILON) {
                outVel[i] = 0;
            }
        }
        return blocked;
    }
    exports.ClipPlayerVelocity = ClipPlayerVelocity;
    function AddCorrectGravity(frame, state, setState, physics) {
        const entGravity = (state.gravity) || 1.0;
        state.velocity[PhysicsConstants_4.UPj] -= (entGravity * PhysicsConstants_4.GRAVITY * 0.5 * frame.dt);
        if (state.baseVelocity) {
            state.velocity[PhysicsConstants_4.UPj] += (state.baseVelocity[PhysicsConstants_4.UPj] * frame.dt);
            state.baseVelocity[PhysicsConstants_4.UPj] = 0;
        }
    }
    exports.AddCorrectGravity = AddCorrectGravity;
    function FixupGravityVelocity(frame, state, setState, physics) {
        const entGravity = (state.gravity) || 1.0;
        state.velocity[PhysicsConstants_4.UPj] -= (entGravity * PhysicsConstants_4.GRAVITY * 0.5 * frame.dt);
    }
    exports.FixupGravityVelocity = FixupGravityVelocity;
    function MovePlayerJump(frame, state, setState, physics) {
        if (!state.onGround || state.wasJumpPressed) {
            return;
        }
        setState({ onGround: false });
        state.velocity[PhysicsConstants_4.UPj] = JUMP_VELOCITY;
        FixupGravityVelocity(frame, state, setState, physics);
        setState({ wasJumpPressed: true });
    }
    exports.MovePlayerJump = MovePlayerJump;
    function AngleVectors(frame, state, setState) {
        const rotationMatrix = twgl_js_7.m4.rotateX(twgl_js_7.m4.rotationY(frame.viewangle[PhysicsConstants_4.YAW]), frame.viewangle[PhysicsConstants_4.PITCH]);
        setState({ forward: twgl_js_7.m4.transformDirection(rotationMatrix, PhysicsConstants_4.FORWARD) });
        setState({ right: twgl_js_7.m4.transformDirection(rotationMatrix, PhysicsConstants_4.RIGHT) });
        setState({ up: twgl_js_7.m4.transformDirection(rotationMatrix, PhysicsConstants_4.UP) });
    }
    exports.AngleVectors = AngleVectors;
});
define("entities/Player16", ["require", "exports", "twgl.js", "browser-utils/InputListeners", "physics-utils/PhysicsConstants", "physics-utils/PlayerMovement16"], function (require, exports, twgl_js_8, InputListeners_2, PhysicsConstants_5, PlayerMovement16_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const NO_CLIP_SPEED = 0.05;
    class Player16 {
        constructor(physics) {
            this.physics = physics;
            this.rotateX = 0.0;
            this.rotateY = 0.0;
            this.bottom = [0, -1, 0];
            this.position = [0, 0, 0];
            this.velocity = [0, 0, 0];
            this.lookAt = [0, 0, 0];
            this.playerState = {
                origin: [0, 0, 0],
                velocity: [0, 0, 0],
                up: [0, 0, 0],
                right: [0, 0, 0],
                forward: [0, 0, 0],
                movetype: 'WALK',
                friction: 1,
                animDuck: 0,
                wasJumpPressed: false,
                onGround: false,
                groundCollision: null,
                noClip: false,
            };
            this.handleMouseMove = (dX, dY) => {
                this.rotateY = this.rotateY - dX / 300.0;
                this.rotateX = Math.min(Math.max(this.rotateX - dY / 300.0, -(Math.PI / 2) + PhysicsConstants_5.YAW_SMALL_LIMIT), (Math.PI / 2) - PhysicsConstants_5.YAW_SMALL_LIMIT);
            };
            this.setState = (change) => {
                for (let k in change) {
                    this.playerState[k] = change[k];
                }
                if (this.debugger)
                    this.debugger.logState(change);
            };
            this.update = (dt) => {
                // update view angle
                const viewangle = [0, 0, 0];
                viewangle[PhysicsConstants_5.YAW] = this.rotateY;
                viewangle[PhysicsConstants_5.PITCH] = this.rotateX;
                ;
                if (viewangle[PhysicsConstants_5.YAW] > Math.PI * 2) {
                    viewangle[PhysicsConstants_5.YAW] -= Math.PI * 2;
                }
                if (viewangle[PhysicsConstants_5.YAW] < -Math.PI * 2) {
                    viewangle[PhysicsConstants_5.YAW] += Math.PI * 2;
                }
                // rotate move vector to player look direction
                const xMove = ((InputListeners_2.Keys.LEFT || InputListeners_2.Keys.A) ? -1 : 0) + ((InputListeners_2.Keys.RIGHT || InputListeners_2.Keys.D) ? 1 : 0);
                const zMove = ((InputListeners_2.Keys.UP || InputListeners_2.Keys.W) ? -1 : 0) + ((InputListeners_2.Keys.DOWN || InputListeners_2.Keys.S) ? 1 : 0);
                const walkRotationMatrix = twgl_js_8.m4.rotationY(viewangle[PhysicsConstants_5.YAW]);
                const freeRotationMatrix = twgl_js_8.m4.rotateX(twgl_js_8.m4.rotationY(viewangle[PhysicsConstants_5.YAW]), viewangle[PhysicsConstants_5.PITCH]);
                const move = twgl_js_8.m4.transformDirection(walkRotationMatrix, [xMove, 0, zMove]);
                // create frame object (todo reuse?)
                const frame = {
                    dt,
                    move,
                    viewangle,
                    jumpPressed: InputListeners_2.Keys.SPACE,
                    duckPressed: false,
                };
                // get state from world values
                const state = this.playerState;
                state.origin = this.position;
                state.velocity = this.velocity;
                // check noclip toggle
                if (InputListeners_2.Keys.N) {
                    state.noClip = !state.noClip;
                }
                // init debugger frame
                if (this.debugger) {
                    frame.debug = {};
                    this.debugger.logFrame(frame, state);
                    if (InputListeners_2.Keys.P)
                        this.debugger.pauseLogging();
                }
                // move player
                if (state.noClip) {
                    // move noclip
                    const scale = InputListeners_2.Keys.LEFT_SHIFT ? 0.1 : InputListeners_2.Keys.SPACE ? 5 : 0.5;
                    const freeMove = twgl_js_8.v3.mulScalar(twgl_js_8.m4.transformDirection(freeRotationMatrix, move), scale * NO_CLIP_SPEED);
                    state.origin = twgl_js_8.v3.add(state.origin, freeMove);
                }
                else {
                    PlayerMovement16_1.MovePlayer(frame, state, this.setState, this.physics);
                }
                // update world values from state
                this.position = state.origin;
                this.velocity = state.velocity;
                this.lookAt = twgl_js_8.v3.add(this.position, twgl_js_8.m4.transformDirection(freeRotationMatrix, PhysicsConstants_5.FORWARD));
            };
            this.getCameraMatrix = () => {
                return twgl_js_8.m4.lookAt(this.position, this.lookAt, PhysicsConstants_5.UP);
            };
            InputListeners_2.onMouseMove(this.handleMouseMove);
        }
    }
    exports.Player16 = Player16;
});
define("resources/DemoScene", ["require", "exports", "gl-utils/GlTexture", "resources/SimpleTextures", "entities/WorldPrimitives", "entities/PhysicsPrimitives", "entities/Player16"], function (require, exports, GlTexture_2, SimpleTextures_2, WorldPrimitives_1, PhysicsPrimitives_1, Player16_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const floorWidth = 50;
    const floorDepth = 500;
    function createScene(gl, physics) {
        // init textures
        const image = SimpleTextures_2.createGridTexture(64, '#777');
        const texture = new GlTexture_2.GlTexture(gl, image);
        const image2 = SimpleTextures_2.createGridTexture(128, '#fff');
        const texture2 = new GlTexture_2.GlTexture(gl, image2);
        const image3 = SimpleTextures_2.createGridTexture(96, '#ccc');
        const texture3 = new GlTexture_2.GlTexture(gl, image3);
        const image4 = SimpleTextures_2.createGridTexture(128, '#aaa');
        const texture4 = new GlTexture_2.GlTexture(gl, image4);
        // world objects
        const floor = new WorldPrimitives_1.WorldPlane(floorWidth, floorDepth);
        floor.texture = texture2;
        floor.position = [0, -1, 0];
        const ramp1 = new WorldPrimitives_1.SurfPrism(2, 2, 10);
        ramp1.texture = texture;
        ramp1.position = [-2, 0, -4];
        const ramp2 = new WorldPrimitives_1.SurfPrism(2, 2, 10);
        ramp2.texture = texture;
        ramp2.position = [2, 0, -4];
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
        ball.texture = new GlTexture_2.GlTexture(gl, SimpleTextures_2.createGridTexture(64, '#009cff'));
        ball.position[2] = -10;
        const objects = world.concat([
            ball
        ]);
        if (physics.debugger) {
            physics.debugger.objects.forEach((o) => objects.push(o));
        }
        // create player entity
        const player = new Player16_1.Player16(physics);
        player.position = [0, 2, -3];
        player.rotateX = -Math.PI / 12;
        player.debugger = physics.debugger;
        return {
            objects,
            world,
            player,
        };
    }
    exports.createScene = createScene;
});
define("index", ["require", "exports", "gl-utils/GlRenderer", "physics-utils/PhysicsProgram", "browser-utils/InputListeners", "resources/DemoScene"], function (require, exports, GlRenderer_1, PhysicsProgram_1, InputListeners_3, DemoScene_1) {
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
        canvas.addEventListener('mousedown', (e) => InputListeners_3.requestPointerLock(canvas));
        // programs
        const physics = new PhysicsProgram_1.PhysicsProgram();
        // physics.debugger = new PhysicsDebugger(gl, physics);
        const renderer = new GlRenderer_1.GlRenderer(gl, physics);
        // scene
        const scene = DemoScene_1.createScene(gl, physics);
        renderer.initScene(scene);
        // render loop
        const drawFrame = (time) => {
            renderer.drawScene(time, scene);
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
