import {m4,v3} from 'twgl.js';
import {Keys, onMouseMove} from '../browser-utils/InputListeners';
import {UP,RIGHT,FORWARD} from '../physics-utils/PhysicsConstants';

// unit vectors
const PLAYER_COLLISION_RADIUS = 0.1;

const YAW_SMALL_LIMIT = 0.0001;
const MOVE_SPEED = 5.0;
const JUMP_ACCELERATION = 40.0;
const MOVE_ACCELERATION = 1.0;

export class Player {
  rotateX: number = 0.0;
  rotateY: number = 0.0;

  bottom: v3 = [0, -1, 0];

  position: v3 = [0, 0, 0];
  velocity: v3 = [0, 0, 0];
  lookAt: v3 = [0, 0, 0];

  debugger: any;

  constructor(private physics: any) {
    onMouseMove(this.handleMouseMove);
  }

  handleMouseMove = (dX, dY) => {
    this.rotateY = this.rotateY - dX / 300.0;
    this.rotateX = Math.min(Math.max(
      this.rotateX - dY / 300.0,
    -(Math.PI / 2) + YAW_SMALL_LIMIT), (Math.PI / 2) - YAW_SMALL_LIMIT);
  }

  update = (dt) => {
    // movement
    const xAccel = ((Keys.LEFT || Keys.A) ? -1 : 0) + ((Keys.RIGHT || Keys.D) ? 1 : 0);
    const zAccel = ((Keys.UP || Keys.W) ? -1 : 0) + ((Keys.DOWN || Keys.S) ? 1 : 0);
    const accelDir = [
      xAccel * (zAccel ? 0.7 : 1) * MOVE_ACCELERATION,
      0,
      zAccel * (xAccel ? 0.7 : 1) * MOVE_ACCELERATION,
    ];

    // rotation
    const rotationMatrix = m4.rotateX(m4.rotationY(this.rotateY), this.rotateX);

    // translate camera relative to view rotation
    const strafeAccelDir = v3.normalize(m4.transformDirection(rotationMatrix, [accelDir[0], 0, 0]));
    const walkAccelDir = v3.normalize(m4.transformDirection(rotationMatrix, accelDir));

    // calculate estimated velocity
    const gravityDv = this.physics.getGravityDv(dt);
    const velWithGravity = v3.add(this.velocity, gravityDv);

    // check collisions
    const collisionRadius = v3.mulScalar(v3.normalize(gravityDv), PLAYER_COLLISION_RADIUS);
    const dFallPosition = v3.mulScalar(velWithGravity, dt);
    const rayVector = v3.add(collisionRadius, dFallPosition);
    const ray = {origin: v3.add(this.position, this.bottom), vector: rayVector};
    const collision = this.physics.checkRayCollisions(ray);
    if (collision) {
      const groundAngle = v3.dot(collision.triangleNormal, UP)
      if (groundAngle > 0.7) {
        // ground
        if (Keys.SPACE) {
          // console.log('BOUNCE', (Date.now() - start)/ 1000.0)
          // start = Date.now();
          strafeAccelDir[1] = JUMP_ACCELERATION;
          this.velocity = this.physics.moveAir(strafeAccelDir, this.velocity, dt);
        } else {
          // walk
          this.velocity = this.physics.moveGround(walkAccelDir, this.velocity, dt);
          const collisionVelocity = v3.dot(this.velocity, collision.triangleNormal);
          this.velocity = v3.subtract(this.velocity, v3.mulScalar(collision.triangleNormal, collisionVelocity))
        }
      } else {
        // surf
        const cd = this.physics.getCollisionReflection(ray, this.velocity, gravityDv, collision, dt);
        this.velocity = this.physics.moveAir(v3.mulScalar(strafeAccelDir, 4), cd.velocity, dt);
        const collisionVelocity = v3.dot(this.velocity, collision.triangleNormal);
        this.velocity = v3.subtract(this.velocity, v3.mulScalar(collision.triangleNormal, collisionVelocity));
      }

      // set position from collision
      this.position = v3.add(this.position, v3.mulScalar(rayVector, collision.fraction - 0.0001));

      // check for second collision
      const dFallPosition2 = v3.mulScalar(this.velocity, dt);
      const ray2 = {origin: v3.add(this.position, this.bottom), vector: dFallPosition2};
      const collision2 = this.physics.checkRayCollisions(ray2);
      if (collision2) {
        // set position to second collision
        this.position = v3.add(this.position, v3.mulScalar(ray2.vector, collision2.fraction - 0.0001));
      } else {
        // no second collision
        this.position = v3.add(this.position, v3.mulScalar(this.velocity, dt));
      }
    } else {
      // air
      this.velocity = this.physics.moveAir(strafeAccelDir, velWithGravity, dt);
      this.position = v3.add(this.position, v3.mulScalar(this.velocity, dt));
    }

    this.lookAt = v3.add(this.position, m4.transformDirection(rotationMatrix, FORWARD))
  }

  getCameraMatrix = () => {
    return m4.lookAt(this.position, this.lookAt, UP);
  }
}
