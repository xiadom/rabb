import {m4,v3} from 'twgl.js';

const EPSILON = 1e-323;
const CULLING = false;

export interface Ray {
  origin: v3;
  vector: v3;
}

export interface Triangle {
  v0: v3;
  v1: v3;
  v2: v3;
}

export interface Intersection {
  fraction: number;
  triangle: Triangle;
  triangleNormal: v3;
}

export function rayTriangleIntersection(ray: Ray, triangle: Triangle): Intersection | false {
  // https://en.wikipedia.org/wiki/M%C3%B6ller%E2%80%93Trumbore_intersection_algorithm

  const edge1: v3 = v3.subtract(triangle.v1, triangle.v0);
  const edge2: v3 = v3.subtract(triangle.v2, triangle.v0);

  const h: v3 = v3.cross(ray.vector, edge2);
  const a = v3.dot(edge1, h);

  if (CULLING) {
    // if the determinant is negative the triangle is backfacing
    // if the determinant is close to 0, the ray misses the triangle
    if (a < EPSILON) {
      return false;
    }
  } else {
    if (a > -EPSILON && a < EPSILON) {
      // ray and triangle are parallel if det is close to 0
      return false;
    }
  }

  // compute and check barycentric coordinates u,v
  const f = 1 / a;
  const s: v3 = v3.subtract(ray.origin, triangle.v0);
  const u = f * v3.dot(s, h);


  const q: v3 = v3.cross(s, edge1);
  const v = f * v3.dot(ray.vector, q);

  if (u < 0.0 || u > 1.0) {
    return false;
  }
  // const q: v3 = v3.cross(s, edge1);
  // const v = f * v3.dot(ray.vector, q);
  if (v < 0.0 || u + v > 1.0) {
    return false;
  }

  // position of intersection on ray
  const t = f * v3.dot(edge2, q);
  if (t > EPSILON) {
    // intersects on ray
    if (t <= 1.0) {
      // intersects in segment
      const triangleNormal = v3.normalize(v3.cross(edge1, edge2));
      return {fraction: t, triangle, triangleNormal};
    }
  }

  return false;
}
