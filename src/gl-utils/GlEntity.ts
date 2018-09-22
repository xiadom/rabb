export interface GlEntity {
  texture: any;
  getVertexes(): Float32Array;
  getTexcoords(): Float32Array;
  getIndexes?(): Uint16Array;
  getWorldMatrix(): Float32Array;
  getBufferRange(): {start: number, len: number};
  setBufferRange(start: number, len: number): void;
}
