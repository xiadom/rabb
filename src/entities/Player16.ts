import {m4,v3} from 'twgl.js';
import {Keys, onMouseMove} from '../browser-utils/InputListeners';
import {UP,FORWARD,PITCH,YAW,YAW_SMALL_LIMIT} from '../physics-utils/PhysicsConstants';
import {MovePlayer, PlayerState} from '../physics-utils/PlayerMovement16';

const NO_CLIP_SPEED =  0.05;

export class Player16 {
  rotateX: number = 0.0;
  rotateY: number = 0.0;

  bottom: v3 = [0, -1, 0];

  position: v3 = [0, 0, 0];
  velocity: v3 = [0, 0, 0];
  lookAt: v3 = [0, 0, 0];

  debugger: any;

  playerState = {
    origin: [0,0,0],
    velocity: [0,0,0],
    up: [0,0,0],
    right: [0,0,0],
    forward: [0,0,0],
    movetype: 'WALK',
    friction: 1,
    animDuck: 0,
    wasJumpPressed: false,
    onGround: false,
    groundCollision: null,
    noClip: false,
  } as PlayerState;

  constructor(private physics: any) {
    onMouseMove(this.handleMouseMove);
  }

  handleMouseMove = (dX, dY) => {
    this.rotateY = this.rotateY - dX / 300.0;
    this.rotateX = Math.min(Math.max(
      this.rotateX - dY / 300.0,
    -(Math.PI / 2) + YAW_SMALL_LIMIT), (Math.PI / 2) - YAW_SMALL_LIMIT);
  }

  setState = (change) => {
    for (let k in change) {
      this.playerState[k] = change[k];
    }
    if (this.debugger) this.debugger.logState(change);
  }

  update = (dt) => {
    // update view angle
    const viewangle = [0,0,0];
    viewangle[YAW] = this.rotateY;
    viewangle[PITCH] = this.rotateX;;
    if (viewangle[YAW] > Math.PI * 2) {
      viewangle[YAW] -= Math.PI * 2;
    }
    if (viewangle[YAW] < -Math.PI * 2) {
      viewangle[YAW] += Math.PI * 2;
    }

    // rotate move vector to player look direction
    const xMove = ((Keys.LEFT || Keys.A) ? -1 : 0) + ((Keys.RIGHT || Keys.D) ? 1 : 0);
    const zMove = ((Keys.UP || Keys.W) ? -1 : 0) + ((Keys.DOWN || Keys.S) ? 1 : 0);
    const walkRotationMatrix = m4.rotationY(viewangle[YAW]);
    const freeRotationMatrix = m4.rotateX(m4.rotationY(viewangle[YAW]), viewangle[PITCH]);
    const move = m4.transformDirection(walkRotationMatrix, [xMove,0,zMove]);

    // create frame object (todo reuse?)
    const frame = {
      dt,
      move,
      viewangle,
      jumpPressed: Keys.SPACE,
      duckPressed: false,
    };

    // get state from world values
    const state = this.playerState;
    state.origin = this.position;
    state.velocity = this.velocity;

    // check noclip toggle
    if (Keys.N) {
      state.noClip = !state.noClip;
    }

    // init debugger frame
    if (this.debugger) {
      (frame as any).debug = {};
      this.debugger.logFrame(frame, state);
      if (Keys.P) this.debugger.pauseLogging();
    }

    // move player
    if (state.noClip) {
      // move noclip
      const scale =  Keys.LEFT_SHIFT ? 0.1 : Keys.SPACE ? 5 : 0.5;
      const freeMove = v3.mulScalar(m4.transformDirection(freeRotationMatrix, move), scale * NO_CLIP_SPEED);
      state.origin = v3.add(state.origin, freeMove);
    } else {
      MovePlayer(frame, state, this.setState, this.physics);
    }

    // update world values from state
    this.position = state.origin;
    this.velocity = state.velocity;
    this.lookAt = v3.add(this.position, m4.transformDirection(freeRotationMatrix, FORWARD))
  }

  getCameraMatrix = () => {
    return m4.lookAt(this.position, this.lookAt, UP);
  }
}
