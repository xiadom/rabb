import {primitives,v3,m4} from 'twgl.js';
import {mapIndices2d,mapIndices3d} from '../gl-utils/MiscUtils';
import {GlTexture} from '../gl-utils/GlTexture';
import {createGridTexture} from '../resources/SimpleTextures';
import {GlEntity} from '../gl-utils/GlEntity';
import {UP, UPj} from '../physics-utils/PhysicsConstants';
import {PhysicsProgram} from '../physics-utils/PhysicsProgram';

let selectedTexture: any;

export class PhysicsDebugger {
  objects: any[] = [];
  moveArrows: any[] = [];
  traceArrows: any[] = [];
  logs: any[] = [];
  refreshTimeout: number;
  paused = false;
  guiListeners: any[] = [];
  selectedIdx: string = null;

  constructor(private gl: any, private physics: any) {
    this.buildArrows();
  }

  addListener = (l) => {
    this.guiListeners.push(l);
  }
  removeListener = (l) => {
    const idx = this.guiListeners.indexOf(l);
    if (idx > -1) {
      this.guiListeners.splice(idx, 1);
    }
  }

  logFrame = (frame:any,state:any) => {
    if (this.paused) return;
    state = JSON.parse(JSON.stringify(state));
    this.logs.unshift({frame,state,changes:[],traces:[]});
    this.triggerRefresh();
  }

  logState = (change:any) => {
    if (this.paused) return;
    const latestLog = this.logs[0];
    latestLog.changes.unshift(JSON.parse(JSON.stringify(change)));
    this.triggerRefresh();
  }

  logTrace = (debugInfo:any) => {
    if (this.paused) return;
    const latestLog = this.logs[0];
    latestLog.traces.unshift(JSON.parse(JSON.stringify(debugInfo)));
    this.triggerRefresh();
  }

  pauseLogging = () => {
    this.paused = true;
    console.log('paused state', this)
    window.localStorage['last-physics-log'] = JSON.stringify(this.logs);
    this.triggerRefresh();
  }

  selectLog = (idx) => {
    this.paused = true;
    this.selectedIdx = idx;
    this.triggerRefresh();
  }

  triggerRefresh = () => {
    if (this.refreshTimeout) return;
    this.refreshTimeout = setTimeout(() => {
      this.refreshTimeout = null;
      //update gui
      this.refreshGui();
    }, 250);
    this.refreshArrows();
  }

  refreshGui = () => {
    this.guiListeners.forEach((l) => l());
  }

  refreshArrows = () => {
    const sParts = this.selectedIdx && this.selectedIdx.split('-');
    const sLogIdx = sParts && sParts[0] === 'log' && sParts[1] && parseInt(sParts[1], 10);
    const sTraceIdx = sParts && sParts[2] === 'trace' && sParts[3] && parseInt(sParts[2], 10);

    for (let i = 1; i < 20; ++i) {
      if (this.logs[i] && this.logs[i-1] && (!sLogIdx || i !== sLogIdx)) {
        this.moveArrows[i].position = v3.copy(this.logs[i].state.origin);
        this.moveArrows[i].vector =
          v3.subtract(this.logs[i-1].state.origin,this.logs[i].state.origin);
      }
    }

    // selected log arrow

    const li = (sLogIdx > 1) ? sLogIdx : 0;
    const prevLog = this.logs[li - 1];
    const log = this.logs[li];
    if (log && prevLog) {
      this.moveArrows[0].position = v3.copy(log.state.origin);
      this.moveArrows[0].vector =
        v3.subtract(prevLog.state.origin,log.state.origin);
      if (li === sLogIdx && !sTraceIdx) {
        console.log('ts?')
        this.moveArrows[0].originalTexture = this.moveArrows[0].texture;
        this.moveArrows[0].texture = selectedTexture;
      } else {
        if (this.moveArrows[0].originalTexture) {
          this.moveArrows[0].texture = this.moveArrows[0].originalTexture;
        }
      }
    }

    for (let i = 0; i < 10; ++i) {
      if (log && log.traces[i]) {
        const logRay = log.traces[i] && log.traces[i].ray;
        if (logRay && (['cat.pos','pushup.hull'].indexOf(log.traces[i].debugTag) === -1)) {
          this.traceArrows[i].position = logRay.origin;
          this.traceArrows[i].vector = logRay.vector;
          if ((li === sLogIdx) && (i === sTraceIdx)) {
            console.log('ts2?')
            this.traceArrows[i].originalTexture = this.traceArrows[i].texture;
            this.traceArrows[i].texture = selectedTexture;
          } else if (this.traceArrows[i].originalTexture) {
            this.traceArrows[i].texture = this.traceArrows[i].originalTexture;
          }
        }
      }
    }
  }

  buildArrows = () => {
    let position = 10;
    for (let i = 0; i < 20; ++i) {
      const arrow2 = new PhysicsDebugArrow();
      const r = Math.floor(256 * Math.random());
      const g = Math.floor(256 * Math.random());
      const b = Math.floor(256 * Math.random());
      arrow2.texture = new GlTexture(this.gl,
        createGridTexture(64, `rgb(${128},${g},${b})`));
      arrow2.position[UPj] = (position -= 1);
      this.moveArrows.push(arrow2);
      this.objects.push(arrow2);
    }
    for (let i = 0; i < 10; ++i) {
      const arrow2 = new PhysicsDebugArrow();
      const r = Math.floor(256 * Math.random());
      const g = Math.floor(256 * Math.random());
      const b = Math.floor(256 * Math.random());
      arrow2.texture = new GlTexture(this.gl,
        createGridTexture(64, `rgb(${128},${g},${b})`));
      arrow2.position[UPj] = (position -= 1);
      this.traceArrows.push(arrow2);
      this.objects.push(arrow2);
    }

    selectedTexture = new GlTexture(this.gl,
        createGridTexture(64, `rgb(${255},${0},${0})`));
  }

}


export class PhysicsDebugArrow implements GlEntity {
  position: v3 = [0, 0, 0];
  vector: v3 = [0, 1, 0];

  cone: any;
  stem: any;

  texture: any;
  originalTexture: any;
  vertexes: any;
  texcoords: any;
  bufferRange: any;

  constructor(private size: number = 1) {
    const CONE_HEIGHT = 0.1*this.size;
    const HEIGHT = 1;
    const HEIGHT_SHIFT = 0.02;
    this.cone = primitives.createTruncatedConeVertices(0.05*this.size, 0.000005*this.size, CONE_HEIGHT, 10, 10);
    this.stem = primitives.createCylinderVertices(0.01*this.size, HEIGHT - HEIGHT_SHIFT, 10, 1);

    // translate index list to vertex array
    const allGrouped = [this.cone,this.stem]
      .reduce((all,obj) => {
        return {
          vertexes: all.vertexes.concat(mapIndices3d(obj, 'position')
            .map((v,i) =>
              1 === (i % 3) ?
                (obj === this.cone) ? v + HEIGHT - CONE_HEIGHT / 2 :
                  v + HEIGHT / 2 - HEIGHT_SHIFT / 2 :
                  v)),
          texcoords: all.texcoords.concat(mapIndices2d(obj, 'texcoord')
            .map((v,i) => v)),
        };
      },{vertexes:[],texcoords:[]});
    this.vertexes = new Float32Array(allGrouped.vertexes);
    this.texcoords = new Float32Array(allGrouped.texcoords);
  }

  update = (dt) => {
  }

  getVertexes() {
    return this.vertexes;
  }
  getTexcoords() {
    return this.texcoords;
  }
  getWorldMatrix() {
    const y = v3.normalize(this.vector);
    const x = v3.normalize(v3.cross([0,0,1],y));
    const z = v3.cross(x,y);
    let am = m4.identity();
    am[0] = x[0];
    am[1] = x[1];
    am[2] = x[2];
    am[4+0] = y[0];
    am[4+1] = y[1];
    am[4+2] = y[2];
    am[8+0] = z[0];
    am[8+1] = z[1];
    am[8+2] = z[2];
    const l = v3.length(this.vector);
    return m4.scale(m4.setTranslation(am, this.position), [l,l,l]);
  }
  getBufferRange() {
    return this.bufferRange;
  }
  setBufferRange(start, len) {
    this.bufferRange = {start, len};
  }
}
