import * as twgl from 'twgl.js';
import {GlTexture} from '../gl-utils/GlTexture';
import {createGridTexture} from '../resources/SimpleTextures';
import {WorldPlane,WorldCube} from '../entities/WorldPrimitives';
import {BouncingBall} from '../entities/PhysicsPrimitives';
import {Player} from '../entities/Player';

const floorWidth = 50;
const floorDepth = 500;

export function createScene(gl, physics) {

  // init textures
  const image = createGridTexture(64, '#777');
  const texture = new GlTexture(gl, image);

  const image2 = createGridTexture(128, '#fff');
  const texture2 = new GlTexture(gl, image2);
  const image3 = createGridTexture(96, '#ccc');
  const texture3 = new GlTexture(gl, image3);
  const image4 = createGridTexture(128, '#aaa');
  const texture4 = new GlTexture(gl, image4);

  // world objects
  const floor = new WorldPlane(floorWidth, floorDepth);
  floor.texture = texture2;
  floor.position = [0,-1,0];
  const ramp1 = new WorldPlane(3, 10);
  ramp1.texture = texture;
  ramp1.position = [-2,0,-4];
  ramp1.rotation = twgl.m4.rotationZ(-Math.PI * (4 / 15));
  const ramp2 = new WorldPlane(3, 10);
  ramp2.texture = texture;
  ramp2.position = [2,0,-4];
  ramp2.rotation = twgl.m4.rotationZ(Math.PI * (4 / 15));
  const box = new WorldCube(1, 1, 1);
  box.texture = texture3;
  box.position = [2,-0.5,2.5];
  const box2 = new WorldCube(1, 0.5, 1);
  box2.texture = texture3;
  box2.position = [2,-0.75,3.5];
  const box3 = new WorldCube(1, 1.5, 1);
  box3.texture = texture3;
  box3.position = [2,-0.25,1.5];
  const box4 = new WorldCube(1, 2, 3);
  box4.texture = texture4;
  box4.position = [3,0,2.5];

  const world = [ramp1,ramp2,floor,box,box2,box3,box4];

  // other objects
  const ball = new BouncingBall(physics);
  ball.texture = new GlTexture(gl, createGridTexture(64, '#009cff'));
  ball.position[2] = -10;

  const objects = world.concat([
    ball
  ] as any);

  // create player entity
  const player = new Player(physics);
  player.position = [0, 2, 3];
  player.rotateX = -Math.PI / 12;

  return {
    objects,
    world,
    player,
  }
}