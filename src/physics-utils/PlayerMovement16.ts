import {m4,v3} from 'twgl.js';
import {UP,RIGHT,FORWARD,FORWARDk,SIDEi,UPj,ROLL,PITCH,YAW,
  EPSILON,GRAVITY,FRICTION,EDGE_FRICTION,PLAYER_CORE_HEIGHT,ACCELERATE,AIR_ACCELERATE
} from '../physics-utils/PhysicsConstants';
import {PhysicsProgram} from './PhysicsProgram';

const FRICTION_TRACE_RADIUS = 0.1;
const GROUND_TRACE_RADIUS = PLAYER_CORE_HEIGHT + FRICTION_TRACE_RADIUS;
const FAST_UP_LIMIT = 1;
const DUCKING_SLOWDOWN = 0.35;
const DUCKING_LENGTH = 1000;
const MAX_WISH_SPEED = 4;
const MAX_BUMPS = 4;
const BOUNCE = 2;
const SMALLEST_SPEED = EPSILON;
const STEP_HEIGHT = 0.1;
const JUMP_VELOCITY = 4;

type float = number;

export interface RabbFrame {
  dt: float;
  move: v3;
  viewangle: v3;
  jumpPressed: boolean;
  duckPressed: boolean;
  debug?: any;
}

export interface PlayerState {
  origin: v3;
  velocity: v3;
  friction: float;
  movetype: 'WALK' | 'FLY';

  up: v3;
  right: v3;
  forward: v3;


  animDuck: float;
  wasJumpPressed: boolean;

  baseVelocity?: v3;

  onGround: boolean;
  groundCollision: any;

  noClip: boolean;
}

export function MovePlayer(frame: RabbFrame, state: PlayerState, setState: any, physics: PhysicsProgram) {
  ReduceTimers(frame, state, setState);

  AngleVectors(frame, state, setState);

  // todo unstick?

  CategorizePosition(frame, state, setState, physics);

  switch(state.movetype) {
    case 'FLY':
      if (frame.jumpPressed) {
        MovePlayerJump(frame, state, setState, physics);
      } else {
        setState({wasJumpPressed: false});
      }
      if (state.baseVelocity) {
        setState({velocity: v3.add(state.baseVelocity, state.velocity)});
      }
      MovePlayerFly(frame, state, setState, physics);
      if (state.baseVelocity) {
        setState({velocity: v3.add(state.baseVelocity, state.velocity)});
      }
      break;

    case 'WALK':
      AddCorrectGravity(frame, state, setState, physics);
      if (frame.jumpPressed) {
        MovePlayerJump(frame, state, setState, physics);
      } else {
        setState({wasJumpPressed: false});
      }
      if (state.onGround) {
        state.velocity[UPj] = 0.0;
        MovePlayerFriction(frame, state, setState, physics);
      }
      // check velocity?
      if (state.onGround) {
        MovePlayerWalk(frame, state, setState, physics);
      } else {
        MovePlayerAir(frame, state, setState, physics);
      }
      CategorizePosition(frame, state, setState, physics);
      if (state.baseVelocity) {
        setState({velocity: v3.subtract(state.baseVelocity, state.velocity)});
      }
      // check velocity?
      FixupGravityVelocity(frame, state, setState, physics);
      if (state.onGround) {
        state.velocity[UPj] = 0.0;
      }

      break;
    default: break;
  }
}

export function MovePlayerFly(frame, state, setState, physics) {
  let originalVelocity = v3.copy(state.velocity);
  const primalVelocity = v3.copy(state.velocity);

  let allFraction = 0;
  let numPlanes = 0;
  let timeLeft = frame.dt;

  let blockingPlanes = [];
  let newVelocity = [0,0,0];

  for (let bc = 0; bc < MAX_BUMPS; ++bc) {
    if (v3.length(state.velocity) < EPSILON) break;

    const ray = {
      origin: v3.subtract(state.origin, [0,PLAYER_CORE_HEIGHT,0]),
      vector: v3.mulScalar(state.velocity, timeLeft)
    };
    const trace = physics.checkRayCollisions(ray, 'flymove1');
    allFraction += (trace ? trace.fraction : 1);

    if (!trace || (trace.fraction > 0)) {
      let newOrigin = v3.add(state.origin,
        v3.mulScalar(ray.vector, trace ? trace.fraction : 1));

      // check if new origin is player collision
      let pcTrace;
      do {
        const playerRay = {
          origin: v3.copy(newOrigin),
          vector: [0,-PLAYER_CORE_HEIGHT,0],
        };
        pcTrace = physics.checkRayCollisions(playerRay, 'allSolid');

        if (pcTrace) {
          newOrigin[UPj] += PLAYER_CORE_HEIGHT * (1 - pcTrace.fraction);
        }

      } while (pcTrace)

      // set new origin
      if (frame.debug) frame.debug.originFromTraceOrEmpty = trace;
      setState({origin: newOrigin});

      originalVelocity = v3.copy(state.velocity);
      numPlanes = 0;
    }

    if (!trace) break;
    timeLeft -= timeLeft * trace.fraction;

    blockingPlanes.push(trace);
    numPlanes++;

    if ((state.movetype === 'WALK') && (!state.onGround || (state.friction != 1))) {
      let i = 0;
      for (; i < numPlanes; ++i) {
        if (blockingPlanes[i].triangleNormal[UPj] > 0.7) {
          ClipPlayerVelocity(originalVelocity, blockingPlanes[i].triangleNormal, newVelocity, 1);
          originalVelocity = v3.copy(newVelocity);
        } else {
          ClipPlayerVelocity(originalVelocity, blockingPlanes[i].triangleNormal, newVelocity, 1.1);
        }
      }
      setState({velocity: newVelocity});
      originalVelocity = v3.copy(newVelocity);
    } else {
      let i = 0;
      for (; i < numPlanes; ++i) {
        ClipPlayerVelocity(originalVelocity, blockingPlanes[i].triangleNormal, state.velocity, 1);
        let j = 0;
        for (; j < numPlanes; ++j) {
          if (j !== i) {
            if (v3.dot(state.velocity, blockingPlanes[j].triangleNormal) < 0) {
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
          setState({velocity: [0,0,0]});
          break;
        }
        const dir = v3.cross(blockingPlanes[0].triangleNormal, blockingPlanes[1].triangleNormal);
        const d = v3.dot(dir, state.velocity);
        setState({velocity: v3.mulScalar(dir, d)});
      }

      if (v3.dot(state.velocity, primalVelocity) <= 0) {
        // stop if oscillating
        setState({velocity: [0,0,0]});
        break;
      }
    }
  }

  // couldnt find a moveable direction
  if (allFraction === 0) {
    setState({velocity: [0,0,0]});
  }

  if (state.wasCollision) {
    // console.log('was collision', state, frame)
    if (numPlanes === 0) setState({wasCollision: false});
  }
  if (numPlanes > 0) {
    // console.log('collision', numPlanes, state.velocity)
    setState({wasCollision: true});
  }
}

export function MovePlayerWalk(frame: RabbFrame, state: PlayerState, setState: any, physics) {
  const zForward = v3.normalize([state.forward[0],0.0,state.forward[2]]);

  let wishVel = v3.copy(frame.move);
  wishVel[UPj] = 0;

  const wishDir = v3.normalize(wishVel);
  const wishSpeed = v3.length(wishVel) * MAX_WISH_SPEED;

  if (wishSpeed > MAX_WISH_SPEED) {
    wishVel = v3.mulScalar(wishVel, MAX_WISH_SPEED / wishSpeed);
  }

  MovePlayerAccelerate(frame, state, setState, wishDir, wishSpeed, ACCELERATE);

  if (state.baseVelocity) {
    setState({velocity: v3.add(state.baseVelocity, state.velocity)});
  }

  const spd = v3.length(state.velocity);

  if (spd < SMALLEST_SPEED) {
    setState({velocity: [0,0,0]});
  }

  const oldOnGround = state.onGround;

  // trace expected movement
  const ray = {
    origin: v3.subtract(state.origin, [0,PLAYER_CORE_HEIGHT,0]),
    vector: v3.mulScalar(state.velocity, frame.dt)};
  const trace = physics.checkRayCollisions(ray, 'walkmove1');
  if (!trace) {
    let newOrigin =  v3.add(state.origin, ray.vector);

    // check player capsule collision
    newOrigin = FixPlayerOrigin(state, physics, newOrigin);

    // no collision, so follow velocity
    if (frame.debug) frame.debug.originFromNoCollision = newOrigin;
    setState({origin: newOrigin});
    return;
  }

  if (!oldOnGround) {
    return;
  }

  // try sliding forward or up stairs
  const original = v3.copy(state.origin);
  const originalVel = v3.copy(state.velocity);

  // get normal try results
  MovePlayerFly(frame, state, setState, physics);
  const down = v3.copy(state.origin);
  const downVel = v3.copy(state.velocity);

  // reset state
  if (frame.debug) frame.debug.originFromReset = v3.copy(original);
  setState({origin: v3.copy(original)});
  setState({velocity: v3.copy(originalVel)});

  // try step up
  ray.vector = [0,0,0];
  ray.vector[UPj] += STEP_HEIGHT;
  const traceUp = physics.checkRayCollisions(ray, 'walkmove up');
  const traceUpEnd = v3.add(v3.add(ray.origin,[0,PLAYER_CORE_HEIGHT,0]), ray.vector)
  if (!traceUp) {
    if (frame.debug) frame.debug.originFromTraceUpEnd = v3.copy(traceUpEnd);
    setState({origin: traceUpEnd});
  }

  MovePlayerFly(frame, state, setState, physics);

  // try going back down
  ray.vector = [0,0,0];
  ray.vector[UPj] -= STEP_HEIGHT;
  const traceDown = physics.checkRayCollisions(ray, 'walkmove down');
  const traceDownEnd = v3.add(v3.add(ray.origin,[0,PLAYER_CORE_HEIGHT,0]), ray.vector);
  let useDown;
  if (trace && trace.triangleNormal[UPj] < 0.7) {
    // not on floor, use original
    useDown = true;
  } else {
    // check if new origin is player collision
    const playerRay = {
      origin: v3.copy(traceDownEnd),
      vector: [0,-PLAYER_CORE_HEIGHT,0],
    };
    const pcTrace = physics.checkRayCollisions(playerRay, 'allSolid');
    if (pcTrace) {
      traceDownEnd[UPj] += PLAYER_CORE_HEIGHT * (1 - pcTrace.fraction);
      // console.log('newOrigin3',traceDownEnd)
    }

    if (!traceDown) {
      if (frame.debug) frame.debug.originFromtraceDownEnd = v3.copy(traceDownEnd);
      setState({origin: traceDownEnd});
    }
    // copy to up
    setState({up: v3.copy(state.origin)});

    // calc which went farther
    const downDist = v3.length(v3.subtract(traceDownEnd, original));
    const upDist = v3.length(v3.subtract(traceUpEnd, original));
    if (downDist > upDist) {
      useDown = true;
    }
  }

  if (useDown) {
    // check if new origin is player collision
    const playerRay = {
      origin: v3.copy(down),
      vector: [0,-PLAYER_CORE_HEIGHT,0],
    };
    const pcTrace = physics.checkRayCollisions(playerRay, 'allSolid');
    if (pcTrace) {
      down[UPj] += PLAYER_CORE_HEIGHT * (1 - pcTrace.fraction);
      // console.log('newOrigin4',down)
    }

    if (frame.debug) frame.debug.originFromtraceDownEnd = v3.copy(traceDownEnd);
    setState({origin: down});
    setState({velocity: downVel});
  } else {
    // copy z from slide move??
    state.velocity[UPj] = downVel[UPj];
  }
}

export function FixPlayerOrigin(state, physics, newOrigin) {
  // check if new origin is player feet (lower semisphere of capsule) collision
  const feetVector = v3.mulScalar(v3.normalize(state.velocity), 0.1);
  const playerRay1 = {
    origin: v3.subtract(newOrigin, [0,PLAYER_CORE_HEIGHT,0]),
    vector: feetVector
  };
  const pcTrace1 = physics.checkRayCollisions(playerRay1, 'feetSolid');
  if (pcTrace1) {
    newOrigin = v3.subtract(newOrigin, v3.mulScalar(feetVector, (1 - pcTrace1.fraction)));
  }
  // check if new origin is player core collision
  const playerRay = {
    origin: v3.copy(newOrigin),
    vector: [0,-PLAYER_CORE_HEIGHT,0],
  };
  const pcTrace = physics.checkRayCollisions(playerRay, 'allSolid');
  if (pcTrace) {
    newOrigin[UPj] += PLAYER_CORE_HEIGHT * (1 - pcTrace.fraction);
  }

  return newOrigin;
}

export function ReduceTimers(frame, state, setState) {
  setState({animDuck: state ? state.animDuck - frame.dt : 0});
  if (state.anim < 0) state.animDuck = 0;
}

export function CategorizePosition(frame, state, setState, physics: PhysicsProgram) {
  const ray = {origin: state.origin, vector: [0,-GROUND_TRACE_RADIUS,0]};
  if (state.velocity && state.velocity[UPj] > FAST_UP_LIMIT) {
    setState({onGround: false});
  } else {
    const trace = physics.checkRayCollisions(ray, 'cat.pos');
    if (trace && (trace.triangleNormal[UPj] >= 0.71)) {
      setState({onGround: true});
      setState({groundCollision: trace});
    } else {
      setState({onGround: false}); // too steep
      setState({groundCollision: null});
    }
  }
}

export function MovePlayerFriction(frame, state, setState, physics) {
  const v = state.velocity;
  const speed = v3.length(v);
  if (speed < EPSILON) return;

  let drop = 0;
  if (state.onGround) {
    const start = v3.add(state.origin, [ v[0]/speed*16, -PLAYER_CORE_HEIGHT, v[1]/speed*16 ])
    const ray = {origin:start,vector:[0,-FRICTION_TRACE_RADIUS,0]};
    const trace = physics.checkRayCollisions(ray, 'friction');
    let friction = 0;
    if (!trace) {
      friction = FRICTION * EDGE_FRICTION;
    } else if (trace) {
      friction = FRICTION;
    }

    friction *= state.friction;  // player friction?

    const control = (speed < EPSILON) ? EPSILON : speed;
    drop += control * friction * frame.dt;
  }

  let newSpeed = speed - drop;
  if (newSpeed < 0) newSpeed = 0;
  newSpeed /= speed;
  setState({velocity: v3.mulScalar(state.velocity, newSpeed)});
}

export function MovePlayerAccelerate(frame, state, setState, wishDir: v3, wishSpeed: float, accel: float) {
  const currentSpeed = v3.dot(state.velocity, wishDir);
  const addSpeed = wishSpeed - currentSpeed;
  if (addSpeed <= 0) return;

  let accelSpeed = accel * frame.dt * wishSpeed * state.friction;
  if (accelSpeed < addSpeed) {
    accelSpeed = addSpeed;
  }

  setState({velocity: v3.mulScalar(wishDir, accelSpeed)});
}

export function MovePlayerAirAccelerate(frame, state, setState, wishDir: v3, wishSpeed: float, accel: float) {
  if (wishSpeed > MAX_WISH_SPEED) {
    wishSpeed = MAX_WISH_SPEED;
  }
  const currentSpeed = v3.dot(state.velocity, wishDir);
  const addSpeed = wishSpeed - currentSpeed;
  if (addSpeed <= 0) return;

  let accelSpeed = accel * wishSpeed * frame.dt * state.friction;
  if (accelSpeed > addSpeed) accelSpeed = addSpeed;

  setState({velocity: v3.add(state.velocity, v3.mulScalar(wishDir, accelSpeed))});
}

export function MovePlayerAir(frame, state, setState, physics) {
  const wishVel = v3.copy(frame.move)
  const wishSpeed = v3.length(wishVel) * MAX_WISH_SPEED;

  MovePlayerAirAccelerate(frame, state, setState, v3.normalize(wishVel), wishSpeed, AIR_ACCELERATE);

  if (state.baseVelocity) {
    setState({velocity: v3.add(state.baseVelocity, state.velocity)});
  }

  MovePlayerFly(frame, state, setState, physics);
}

export function ClipPlayerVelocity(inVel, normal, outVel, overbounce) {
  const angle = normal[UPj];
  let blocked = null;
  if (angle === 1.0) {
    blocked = {floor: true};
  } else if (angle > 0) {
    blocked = {slope: true};
  } else if (!angle) {
    blocked = {wall: true};
  }


  const backoff = v3.dot(inVel, normal) * overbounce;

  let change: float;
  for (let i = 0; i < 3; ++i) {
    change = normal[i] * backoff;
    outVel[i] = inVel[i] - change;
    if (outVel[i] > -EPSILON && outVel[i] < EPSILON) {
      outVel[i] = 0;
    }
  }

  return blocked;
}

export function AddCorrectGravity(frame, state, setState, physics) {
  const entGravity = (state.gravity) || 1.0;
  state.velocity[UPj] -= (entGravity * GRAVITY * 0.5 * frame.dt);
  if (state.baseVelocity) {
    state.velocity[UPj] += (state.baseVelocity[UPj] * frame.dt);
    state.baseVelocity[UPj] = 0;
  }
}
export function FixupGravityVelocity(frame, state, setState, physics) {
  const entGravity = (state.gravity) || 1.0;
  state.velocity[UPj] -= (entGravity * GRAVITY * 0.5 * frame.dt);
}

export function MovePlayerJump(frame, state, setState, physics) {
  if (!state.onGround || state.wasJumpPressed) {
    return;
  }

  setState({onGround: false});

  state.velocity[UPj] = JUMP_VELOCITY;

  FixupGravityVelocity(frame, state, setState, physics);

  setState({wasJumpPressed: true});
}

export function AngleVectors(frame, state, setState) {
  const rotationMatrix = m4.rotateX(m4.rotationY(frame.viewangle[YAW]), frame.viewangle[PITCH]);
  setState({forward: m4.transformDirection(rotationMatrix, FORWARD)});
  setState({right: m4.transformDirection(rotationMatrix, RIGHT)});
  setState({up: m4.transformDirection(rotationMatrix, UP)});
}
