type MiscIndexObject = {
  indices: number[];
  position: number[];
  texcoord: number[]
}

export function mapIndices2d(object: MiscIndexObject, prop: string) {
  return Array.prototype.reduce.call(object.indices, (acc, id) =>
    acc.concat([
      object[prop][3 * id],
      object[prop][3 * id + 1],
    ])
  , [])
}
export function mapIndices3d(object: MiscIndexObject, prop: string) {
  return Array.prototype.reduce.call(object.indices, (acc, id) =>
      acc.concat([
        object[prop][3 * id],
        object[prop][3 * id + 1],
        object[prop][3 * id + 2],
      ])
  , [])
}
