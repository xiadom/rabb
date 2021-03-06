import {v3,m4} from 'twgl.js';
import {EPSILON} from './PhysicsConstants';
import {rayTriangleIntersection, Triangle} from './CollisionDetection';

const GRAVITY = [0, -9.8, 0];
const GROUND_ACCELERATE = 20;
const MAX_VELOCITY_GROUND = 10;
const AIR_ACCELERATE = 2;
const MAX_VELOCITY_AIR = Number.MAX_SAFE_INTEGER;
const FRICTION = 4;

export class PhysicsProgram {
  triangles: Triangle[];
  debugger: any;

  constructor() {
  }

  setBuffersFromWorldObjects(worldObjects) {
    this.triangles = []
    worldObjects.forEach((worldObject) => {
      const matrix = worldObject.getWorldMatrix();
      const vertexes = worldObject.getVertexes();
      for (let i = 0; i < vertexes.length; i += 9) {
        this.triangles.push({
          v0: m4.transformPoint(matrix, [vertexes[i + 0], vertexes[i + 0 + 1], vertexes[i + 0 + 2]]),
          v1: m4.transformPoint(matrix, [vertexes[i + 3], vertexes[i + 3 + 1], vertexes[i + 3 + 2]]),
          v2: m4.transformPoint(matrix, [vertexes[i + 6], vertexes[i + 6 + 1], vertexes[i + 6 + 2]]),
        })
      }
    });
  }

  checkRayCollisions(ray, debugTag?) {
    let nearestCollision = null;
    let closestFraction = 1 + EPSILON;
    let falseCollision;
    for (let i = 0; i < this.triangles.length; i += 1) {
      const triangle = this.triangles[i];

      // move startpoint slightly backward to catch entry into solids
      const rayL = {...ray, origin: v3.subtract(ray.origin, v3.mulScalar(ray.vector, EPSILON))}
      const collision2 = rayTriangleIntersection(rayL, triangle);
      if (collision2) {
        // calculate true fraction
        const collision = rayTriangleIntersection(ray, triangle);
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
      if (falseCollision.fraction > EPSILON) {
        nearestCollision = falseCollision;
      }
    }

    if (debugTag && this.debugger) {
      const debugInfo = {
        ray, debugTag, nearestCollision, closestFraction, falseCollision
      } as any;

      if (this.debugger) {
        this.debugger.logTrace(debugInfo);
      }
    }

    return nearestCollision;
  }

  getGravityDv(dt) {
    return v3.mulScalar(GRAVITY, dt);
  }

  getCollisionReflection(ray, velocity, gravityDv, collision, dt) {

    // estimate collision velocity
    const velocityAtCollision = v3.add(velocity, v3.mulScalar(gravityDv, collision.fraction));
    const dPositionT = v3.mulScalar(ray.vector, collision.fraction);
    const collisionPoint = v3.add(ray.origin, dPositionT);

    // reflect velocity relative to collision triangle normal
    const edge1: v3 = v3.subtract(collision.triangle.v1, collision.triangle.v0);
    const edge2: v3 = v3.subtract(collision.triangle.v2, collision.triangle.v0);
    const reflectedVelocity = v3.subtract(velocityAtCollision,
      v3.mulScalar(collision.triangleNormal,
        2.0 * v3.dot(velocityAtCollision, collision.triangleNormal)));

    // subtract remaining gravity
    const finalVelocity = v3.add(reflectedVelocity, v3.mulScalar(gravityDv, (1.0 - collision.fraction)));

    // estimate after-bounce position
    const dPosition2 = v3.mulScalar(reflectedVelocity, dt * (1.0 - collision.fraction));


    return {
      velocity: finalVelocity,
      position: v3.add(collisionPoint, dPosition2)
    };
  }

  accelerate(accelDir: v3, velocity: v3, accelerate: number, maxVelocity: number, dt: number) {
    const projVel = v3.dot(velocity, accelDir); //
    let accelVel = accelerate * dt;
    if (projVel + accelVel > maxVelocity) {
      accelVel = maxVelocity - projVel;
    }
    return v3.add(velocity, v3.mulScalar(accelDir, accelVel));
  }

  moveGround(accelDir: v3, velocity: v3, dt: number) {
    const speed = v3.length(velocity);
    if (speed !== 0) {
      const drop = speed * FRICTION * dt;
      velocity = v3.mulScalar(velocity, Math.max(speed - drop, 0) / speed);
    }
    return this.accelerate(accelDir, velocity, GROUND_ACCELERATE, MAX_VELOCITY_GROUND, dt);
  }

  moveAir(accelDir: v3, velocity: v3, dt: number) {
    return this.accelerate(accelDir, velocity, AIR_ACCELERATE, MAX_VELOCITY_AIR, dt);
  }
}
