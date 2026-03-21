/**
 * 全局游戏单例 - 持有 PIXI.Application 和核心引用
 * 基于花语小筑 Game.ts，适配搜打撤项目（背景色改为黑色）
 */
import * as PIXI from 'pixi.js';
import { settings, ShaderSystem, BaseTexture, Texture, BaseImageResource } from '@pixi/core';
import { TweenManager } from './TweenManager';

/* ---- @pixi/unsafe-eval 内联 patch ---- */

const GLSL_TO_SINGLE_SETTERS: Record<string, (gl: any, loc: any, cv: any, v: any) => void> = {
  vec3(gl, loc, cv, v) { (cv[0]!==v[0]||cv[1]!==v[1]||cv[2]!==v[2])&&(cv[0]=v[0],cv[1]=v[1],cv[2]=v[2],gl.uniform3f(loc,v[0],v[1],v[2])); },
  int(gl, loc, _c, v) { gl.uniform1i(loc, v); },
  ivec2(gl, loc, _c, v) { gl.uniform2i(loc, v[0], v[1]); },
  ivec3(gl, loc, _c, v) { gl.uniform3i(loc, v[0], v[1], v[2]); },
  ivec4(gl, loc, _c, v) { gl.uniform4i(loc, v[0], v[1], v[2], v[3]); },
  uint(gl, loc, _c, v) { gl.uniform1ui(loc, v); },
  uvec2(gl, loc, _c, v) { gl.uniform2ui(loc, v[0], v[1]); },
  uvec3(gl, loc, _c, v) { gl.uniform3ui(loc, v[0], v[1], v[2]); },
  uvec4(gl, loc, _c, v) { gl.uniform4ui(loc, v[0], v[1], v[2], v[3]); },
  bvec2(gl, loc, _c, v) { gl.uniform2i(loc, v[0], v[1]); },
  bvec3(gl, loc, _c, v) { gl.uniform3i(loc, v[0], v[1], v[2]); },
  bvec4(gl, loc, _c, v) { gl.uniform4i(loc, v[0], v[1], v[2], v[3]); },
  mat2(gl, loc, _c, v) { gl.uniformMatrix2fv(loc, false, v); },
  mat4(gl, loc, _c, v) { gl.uniformMatrix4fv(loc, false, v); },
};
const GLSL_TO_ARRAY_SETTERS: Record<string, (gl: any, loc: any, cv: any, v: any) => void> = {
  float(gl, loc, _c, v) { gl.uniform1fv(loc, v); },
  vec2(gl, loc, _c, v) { gl.uniform2fv(loc, v); },
  vec3(gl, loc, _c, v) { gl.uniform3fv(loc, v); },
  vec4(gl, loc, _c, v) { gl.uniform4fv(loc, v); },
  int(gl, loc, _c, v) { gl.uniform1iv(loc, v); },
  ivec2(gl, loc, _c, v) { gl.uniform2iv(loc, v); },
  ivec3(gl, loc, _c, v) { gl.uniform3iv(loc, v); },
  ivec4(gl, loc, _c, v) { gl.uniform4iv(loc, v); },
  uint(gl, loc, _c, v) { gl.uniform1uiv(loc, v); },
  uvec2(gl, loc, _c, v) { gl.uniform2uiv(loc, v); },
  uvec3(gl, loc, _c, v) { gl.uniform3uiv(loc, v); },
  uvec4(gl, loc, _c, v) { gl.uniform4uiv(loc, v); },
  bool(gl, loc, _c, v) { gl.uniform1iv(loc, v); },
  bvec2(gl, loc, _c, v) { gl.uniform2iv(loc, v); },
  bvec3(gl, loc, _c, v) { gl.uniform3iv(loc, v); },
  bvec4(gl, loc, _c, v) { gl.uniform4iv(loc, v); },
  sampler2D(gl, loc, _c, v) { gl.uniform1iv(loc, v); },
  samplerCube(gl, loc, _c, v) { gl.uniform1iv(loc, v); },
  sampler2DArray(gl, loc, _c, v) { gl.uniform1iv(loc, v); },
};

function patchedSyncUniforms(group: any, uniformData: any, ud: any, uv: any, renderer: any): void {
  let textureCount = 0, v: any = null, cv: any = null;
  const gl = renderer.gl;
  for (const i in group.uniforms) {
    const data = uniformData[i], uvi = uv[i], udi = ud[i], gu = group.uniforms[i];
    if (!data) { if (gu.group === true) renderer.shader.syncUniformGroup(uvi); continue; }
    if (data.type==='float'&&data.size===1&&!data.isArray) { if(uvi!==udi.value){udi.value=uvi;gl.uniform1f(udi.location,uvi);} }
    else if (data.type==='bool'&&data.size===1&&!data.isArray) { if(uvi!==udi.value){udi.value=uvi;gl.uniform1i(udi.location,Number(uvi));} }
    else if ((data.type==='sampler2D'||data.type==='samplerCube'||data.type==='sampler2DArray')&&data.size===1&&!data.isArray) {
      renderer.texture.bind(uvi,textureCount); if(udi.value!==textureCount){udi.value=textureCount;gl.uniform1i(udi.location,textureCount);} textureCount++;
    } else if (data.type==='mat3'&&data.size===1&&!data.isArray) {
      gu.a!==void 0?gl.uniformMatrix3fv(udi.location,false,uvi.toArray(true)):gl.uniformMatrix3fv(udi.location,false,uvi);
    } else if (data.type==='vec2'&&data.size===1&&!data.isArray) {
      if(gu.x!==void 0){cv=udi.value;v=uvi;(cv[0]!==v.x||cv[1]!==v.y)&&(cv[0]=v.x,cv[1]=v.y,gl.uniform2f(udi.location,v.x,v.y));}
      else{cv=udi.value;v=uvi;(cv[0]!==v[0]||cv[1]!==v[1])&&(cv[0]=v[0],cv[1]=v[1],gl.uniform2f(udi.location,v[0],v[1]));}
    } else if (data.type==='vec4'&&data.size===1&&!data.isArray) {
      if(gu.width!==void 0){cv=udi.value;v=uvi;(cv[0]!==v.x||cv[1]!==v.y||cv[2]!==v.width||cv[3]!==v.height)&&(cv[0]=v.x,cv[1]=v.y,cv[2]=v.width,cv[3]=v.height,gl.uniform4f(udi.location,v.x,v.y,v.width,v.height));}
      else{cv=udi.value;v=uvi;(cv[0]!==v[0]||cv[1]!==v[1]||cv[2]!==v[2]||cv[3]!==v[3])&&(cv[0]=v[0],cv[1]=v[1],cv[2]=v[2],cv[3]=v[3],gl.uniform4f(udi.location,v[0],v[1],v[2],v[3]));}
    } else { (data.size===1&&!data.isArray?GLSL_TO_SINGLE_SETTERS:GLSL_TO_ARRAY_SETTERS)[data.type].call(null,gl,udi.location,udi.value,uvi); }
  }
}

function ensureUnsafeEvalPatch(): void {
  if ((ShaderSystem.prototype as any).__patched) return;
  Object.assign(ShaderSystem.prototype, {
    __patched: true,
    systemCheck() {},
    syncUniforms(group: any, glProgram: any) {
      const self = this as any;
      patchedSyncUniforms(group, self.shader.program.uniformData, glProgram.uniformData, group.uniforms, self.renderer);
    },
  });
  console.log('[Game] unsafe-eval patch 已应用');
}

ensureUnsafeEvalPatch();

/* ---- end unsafe-eval patch ---- */

class GameClass {
  app!: PIXI.Application;
  stage: PIXI.Container;
  ticker: PIXI.Ticker;

  /** 设计分辨率 */
  designWidth = 750;
  designHeight = 1334;

  /** 实际屏幕尺寸（逻辑像素） */
  screenWidth = 375;
  screenHeight = 667;

  /** 缩放比 */
  scale = 1;

  /** 像素密度 */
  dpr = 1;

  /** 安全区顶部偏移（设计坐标） */
  safeTop = 0;

  private _initialized = false;
  readonly _uid = Math.random().toString(36).slice(2, 8);

  constructor() {
    this.stage = new PIXI.Container();
    this.ticker = new PIXI.Ticker();
  }

  init(canvas: any): void {
    if (this._initialized) return;
    ensureUnsafeEvalPatch();

    const sysInfo = (typeof wx !== 'undefined' ? wx : typeof tt !== 'undefined' ? tt : null)
      ?.getSystemInfoSync?.();

    if (sysInfo) {
      this.screenWidth = sysInfo.screenWidth;
      this.screenHeight = sysInfo.screenHeight;
      this.dpr = sysInfo.pixelRatio || 2;
    }

    const _api: any = typeof wx !== 'undefined' ? wx : typeof tt !== 'undefined' ? tt : null;
    let safeTopPx = 0;
    try {
      const capsule = _api?.getMenuButtonBoundingClientRect?.();
      if (capsule && capsule.top) {
        safeTopPx = capsule.top;
      } else if (sysInfo?.statusBarHeight) {
        safeTopPx = sysInfo.statusBarHeight + 6;
      }
    } catch (_) {}
    if (safeTopPx <= 0) safeTopPx = 40;
    this.safeTop = Math.round(safeTopPx * (this.designWidth / this.screenWidth));

    this.scale = this.screenWidth / this.designWidth * this.dpr;
    const realWidth = this.screenWidth * this.dpr;
    const realHeight = this.screenHeight * this.dpr;
    canvas.width = realWidth;
    canvas.height = realHeight;

    // 踩坑#13: 真机 canvas 是原生 C++ 对象，完全不可扩展（defineProperty、直接赋值全部失败）
    // 唯一可靠方案：用 Proxy 包裹 canvas，拦截 style 访问，然后把 Proxy 传给 PixiJS
    const viewCanvas = this._wrapCanvasWithStyle(canvas);

    // 踩坑#5: settings.ADAPTER 必须在 new Application 之前配置
    if (_api) {
      settings.ADAPTER = {
        createCanvas: (width?: number, height?: number) => {
          const c = _api.createCanvas();
          if (width !== undefined) c.width = width;
          if (height !== undefined) c.height = height;
          return c;
        },
        getCanvasRenderingContext2D: () => {
          const c = _api.createCanvas();
          const ctx = c.getContext('2d');
          return ctx ? ctx.constructor : Object;
        },
        getWebGLRenderingContext: () => {
          const c = _api.createCanvas();
          const gl = c.getContext('webgl');
          return gl ? gl.constructor : Object;
        },
        getNavigator: () => ({ userAgent: 'wxgame', gpu: null } as any),
        getBaseUrl: () => '',
        getFontFaceSet: () => null as any,
        fetch: ((_url: RequestInfo, _opts?: RequestInit) => Promise.reject(new Error('fetch not available'))) as typeof fetch,
        parseXML: (_xml: string) => new DOMParser().parseFromString(_xml, 'text/xml'),
      } as any;

      // 踩坑#7: Texture.WHITE 用 fromBuffer 重建，避免 gl.texImage2D(canvas) 静默失败
      this._patchTextureWhite();
      // 踩坑#8+#9: Canvas 纹理上传 patch
      this._patchCanvasUpload();
    }

    let renderer: PIXI.IRenderer | null = null;
    let app: PIXI.Application | null = null;
    try {
      app = new PIXI.Application({
        view: viewCanvas,
        width: realWidth,
        height: realHeight,
        backgroundColor: 0x1a1a2e,
        resolution: 1,
        antialias: false,
      });
    } catch (e) {
      console.error('[Game] new PIXI.Application 失败:', e);
    }

    if (app && app.stage && app.ticker && app.renderer) {
      this.app = app;
      this.stage = app.stage;
      this.ticker = app.ticker;
      renderer = app.renderer;
    } else {
      if (app?.renderer) renderer = app.renderer;
      if (!renderer) {
        try {
          renderer = new PIXI.Renderer({ view: viewCanvas, width: realWidth, height: realHeight, backgroundColor: 0x1a1a2e, resolution: 1 });
        } catch (e2) {
          console.error('[Game] new PIXI.Renderer 失败:', e2);
        }
      }
      if (!renderer) {
        try {
          renderer = PIXI.autoDetectRenderer({ view: viewCanvas, width: realWidth, height: realHeight, backgroundColor: 0x1a1a2e, resolution: 1 });
        } catch (e3) {
          console.error('[Game] autoDetectRenderer 失败:', e3);
        }
      }
      this.stage = new PIXI.Container();
      this.ticker = new PIXI.Ticker();
      this.ticker.start();
      if (renderer) {
        this.ticker.add(() => { renderer!.render(this.stage); });
      }
      this.app = { stage: this.stage, ticker: this.ticker, renderer, view: viewCanvas } as any;
    }

    this.stage.scale.set(this.scale, this.scale);

    this.ticker.add(() => {
      const dt = this.ticker.deltaMS / 1000;
      TweenManager.update(dt);
    });

    // 修复微信小游戏 EventSystem 坐标映射
    try {
      const evtSys = (this.app.renderer as any).events;
      if (evtSys?.domElement) {
        const dom = evtSys.domElement;
        evtSys.mapPositionToPoint = (point: any, x: number, y: number) => {
          let rect: any;
          try { rect = dom.getBoundingClientRect(); } catch (_) { rect = null; }
          if (!rect || !rect.width || !rect.height) {
            rect = { left: 0, top: 0, width: this.screenWidth, height: this.screenHeight };
          }
          const resMul = 1.0 / (evtSys.resolution || 1);
          point.x = ((x - (rect.left || 0)) * (dom.width / rect.width)) * resMul;
          point.y = ((y - (rect.top || 0)) * (dom.height / rect.height)) * resMul;
        };
      }
    } catch (_) {}

    this._initialized = true;
    console.log(`[Game] 初始化完成: ${realWidth}x${realHeight}, scale=${this.scale.toFixed(2)}, dpr=${this.dpr}`);
  }

  /**
   * 踩坑#13: 用 Proxy 包裹 canvas，拦截 style 访问
   * 真机 native canvas 是 C++ 对象，defineProperty / 直接赋值全部静默失败
   * Proxy 是唯一能可靠拦截属性访问的方案（iOS JSC 和 Android V8 都支持 ES2015 Proxy）
   */
  private _wrapCanvasWithStyle(c: any): any {
    // 如果 adapter 层已经成功挂了 style，直接返回原始 canvas
    if (c.style && typeof c.style === 'object') {
      console.log('[Game] canvas.style 已存在，无需 Proxy');
      return c;
    }

    // 尝试直接赋值（可能在某些环境下成功）
    try { c.style = { width: '', height: '', cursor: '', touchAction: 'none', position: '', top: '', left: '' }; } catch (_) {}
    if (c.style && typeof c.style === 'object') {
      console.log('[Game] canvas.style 直接赋值成功');
      return c;
    }

    // 直接赋值失败 → 用 Proxy 包裹
    console.log('[Game] canvas.style 不可写，使用 Proxy 包裹');
    const _style: any = { width: '', height: '', cursor: '', touchAction: 'none', position: '', top: '', left: '' };
    // 缓存函数绑定结果，避免每次 get 都 bind
    const _fnCache = new Map<string | symbol, any>();

    return new Proxy(c, {
      get(target: any, prop: string | symbol, _receiver: any) {
        if (prop === 'style') return _style;
        const val = target[prop];
        if (typeof val === 'function') {
          let bound = _fnCache.get(prop);
          if (!bound) { bound = val.bind(target); _fnCache.set(prop, bound); }
          return bound;
        }
        return val;
      },
      set(target: any, prop: string | symbol, value: any) {
        if (prop === 'style') return true;
        target[prop] = value;
        return true;
      },
      getPrototypeOf(target: any) {
        return Object.getPrototypeOf(target);
      },
    });
  }

  // 踩坑#7: Texture.WHITE 用像素 buffer 直接创建
  private _patchTextureWhite(): void {
    try {
      const whitePixels = new Uint8Array(16 * 16 * 4);
      whitePixels.fill(255);
      const whiteBT = BaseTexture.fromBuffer(whitePixels, 16, 16);
      const whiteTex = new Texture(whiteBT);
      (whiteTex as any).destroy = () => {};
      Object.defineProperty(Texture, '_WHITE', { value: whiteTex, writable: true, configurable: true });
      Object.defineProperty(Texture, 'WHITE', { get: () => whiteTex, configurable: true });
      console.log('[Game] Texture.WHITE patch 已应用');
    } catch (e) {
      console.warn('[Game] Texture.WHITE patch 失败:', e);
    }
  }

  // 踩坑#8+#9: Canvas 纹理上传 patch（getImageData → gl.texImage2D）
  private _patchCanvasUpload(): void {
    const _origUpload = BaseImageResource.prototype.upload;
    if ((BaseImageResource.prototype as any).__sdcPatched) return;
    let _inUpload = false;
    BaseImageResource.prototype.upload = function(renderer: any, baseTexture: any, glTexture: any, source?: any) {
      if (_inUpload) return _origUpload.call(this, renderer, baseTexture, glTexture, source);
      _inUpload = true;
      try {
        source = source || this.source;
        const result = _origUpload.call(this, renderer, baseTexture, glTexture, source);
        // 仅对 Canvas 源做像素补救（用 toTempFilePathSync 区分 Canvas 和 Image）
        if (source && source.width > 0 && source.height > 0
            && typeof source.getContext === 'function'
            && typeof source.toTempFilePathSync === 'function') {
          const ctx = source.getContext('2d');
          if (ctx && typeof ctx.getImageData === 'function') {
            const w = source.width, h = source.height;
            const imageData = ctx.getImageData(0, 0, w, h);
            const pixels = new Uint8Array(imageData.data.buffer);
            const gl = renderer.gl;
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, baseTexture.alphaMode > 0 ? 1 : 0);
            gl.texImage2D(gl.TEXTURE_2D, 0, glTexture.internalFormat, w, h, 0, baseTexture.format, glTexture.type, pixels);
          }
        }
        return result;
      } finally { _inUpload = false; }
    };
    (BaseImageResource.prototype as any).__sdcPatched = true;
    console.log('[Game] Canvas upload patch 已应用');
  }

  toReal(v: number): number { return v * this.scale; }
  get logicWidth(): number { return this.designWidth; }
  get logicHeight(): number { return this.screenHeight / this.screenWidth * this.designWidth; }
}

declare const GameGlobal: any;
const _global: any = typeof GameGlobal !== 'undefined' ? GameGlobal
  : typeof window !== 'undefined' ? window
  : typeof globalThis !== 'undefined' ? globalThis : {};

if (!_global.__gameInstance) {
  _global.__gameInstance = new GameClass();
}
export const Game: GameClass = _global.__gameInstance;
