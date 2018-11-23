import {primitives,v3,m4} from 'twgl.js';
import {mapIndices2d,mapIndices3d} from '../gl-utils/MiscUtils';
import {GlEntity} from '../gl-utils/GlEntity';
import {PhysicsProgram} from '../physics-utils/PhysicsProgram';

const RADIUS = 0.2;
const subdivisionsAxis = 10;
const subdivisionsHeight = subdivisionsAxis;
let start = Date.now();

export class BouncingBall implements GlEntity {
  sphere: any;
  texture: any;
  vertexes: any;
  texcoords: any;
  bufferRange: any;
  position: v3 = [0, 4.9 - 1.0, -4];
  velocity: v3 = [0, 0, 0];

  constructor(private physics: PhysicsProgram) {
    this.sphere = primitives.createSphereVertices(RADIUS, subdivisionsAxis, subdivisionsHeight);

    // translate index list to vertex array
    this.vertexes = new Float32Array(mapIndices3d(this.sphere, 'position'));
    this.texcoords = new Float32Array(mapIndices2d(this.sphere, 'texcoord'));
  }

  update = (dt) => {
    // velocity change from gravity
    const gravityDv = this.physics.getGravityDv(dt);
    const newVelocity = v3.add(this.velocity, gravityDv);

    // check collisions
    const dPosition = v3.mulScalar(newVelocity, dt);
    const ray = {origin:this.position,vector:dPosition};
    const collision = this.physics.checkRayCollisions(ray);
    if (collision) {
      // console.log('BOUNCE', (Date.now() - start)/ 1000.0)
      // start = Date.now();
      const cd = this.physics.getCollisionReflection(ray, this.velocity, gravityDv, collision, dt);
      this.velocity = cd.velocity;
      this.position = cd.position;

    } else {
      this.position = v3.add(this.position, dPosition);
      this.velocity = newVelocity;
    }
  }

  getWorldMatrix() {
    return m4.translate(m4.identity(), this.position);
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
    this.bufferRange = {start, len};
  }
}
