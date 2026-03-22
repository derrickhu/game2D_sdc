/**
 * 微信小游戏入口 + DOM 适配器
 * 按照 PixiJS 微信小游戏真机适配踩坑记录 逐条修复
 */

// ═══════════════ 0. 获取真正的 JS 全局对象 ═══════════════
var _realGlobal = (typeof globalThis !== 'undefined' && globalThis)
  || (typeof global !== 'undefined' && global)
  || GameGlobal;

// ═══════════════ 0.1 URL 构造器安全补丁 ═══════════════
// ★ 踩坑#20: PixiJS determineCrossOrigin 内部执行 new URL(...)
// 模拟器有 URL 但 base 缺失会 Invalid URL；真机 URL 完全不存在 → ReferenceError
// 统一提供一个永不抛异常的 URL polyfill
;(function _patchURL() {
  var _OrigURL = (typeof URL === 'function') ? URL : null;

  // 简易 URL 解析（仅满足 PixiJS crossOrigin 判断：hostname / port / protocol）
  function _parseURL(url, base) {
    var href = (typeof url === 'string') ? url : '';
    // 绝对 URL
    var m = href.match(/^(https?:)\/\/([^/:]+)(:\d+)?(\/.*)?$/);
    if (m) {
      return {
        href: href, origin: m[1] + '//' + m[2] + (m[3] || ''),
        protocol: m[1], host: m[2] + (m[3] || ''), hostname: m[2],
        port: m[3] ? m[3].slice(1) : '', pathname: m[4] || '/',
        search: '', hash: '',
        searchParams: { get: function(){ return null; } },
        toString: function() { return href; },
      };
    }
    // 相对 URL → 拼到 base 上
    var b = (typeof base === 'string' && base) ? base : 'https://localhost/';
    var bm = b.match(/^(https?:)\/\/([^/:]+)(:\d+)?/);
    var bp = bm ? bm[1] : 'https:';
    var bh = bm ? bm[2] : 'localhost';
    var bport = (bm && bm[3]) ? bm[3].slice(1) : '';
    var full = b.replace(/[?#].*$/, '').replace(/\/[^/]*$/, '/') + href;
    return {
      href: full, origin: bp + '//' + bh + (bport ? ':' + bport : ''),
      protocol: bp, host: bh + (bport ? ':' + bport : ''), hostname: bh,
      port: bport, pathname: '/' + href,
      search: '', hash: '',
      searchParams: { get: function(){ return null; } },
      toString: function() { return full; },
    };
  }

  function SafeURL(url, base) {
    // 优先用原生 URL（模拟器可用）
    if (_OrigURL) {
      try { return new _OrigURL(url, base); } catch(_) {}
      try { return new _OrigURL(url, 'https://localhost/'); } catch(_2) {}
    }
    return _parseURL(url, base);
  }

  // 保留静态方法
  if (_OrigURL && _OrigURL.createObjectURL) SafeURL.createObjectURL = _OrigURL.createObjectURL.bind(_OrigURL);
  if (_OrigURL && _OrigURL.revokeObjectURL) SafeURL.revokeObjectURL = _OrigURL.revokeObjectURL.bind(_OrigURL);

  _realGlobal.URL = SafeURL;
  try { GameGlobal.URL = SafeURL; } catch(_) {}
})();

// ═══════════════ 0.5 定时器 polyfill（必须在所有代码之前） ═══════════════
// 踩坑#2: setTimeout 等在真机 bundle/框架中可能不可用
// 必须最早执行，否则 LifeCycle.load 等框架代码找不到 setTimeout
;(function _patchTimersFirst() {
  // 从任何可用来源收集定时器函数
  var sources = [
    typeof GameGlobal !== 'undefined' ? GameGlobal : null,
    _realGlobal,
    typeof global !== 'undefined' ? global : null,
  ];
  var timerNames = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
    'requestAnimationFrame', 'cancelAnimationFrame'];

  for (var ti = 0; ti < timerNames.length; ti++) {
    var name = timerNames[ti];
    var fn = null;
    // 先检查模块作用域
    try { fn = eval(name); } catch(_) {}
    // 再从各来源查找
    if (!fn) {
      for (var si = 0; si < sources.length; si++) {
        if (sources[si] && typeof sources[si][name] === 'function') { fn = sources[si][name]; break; }
      }
    }
    if (fn) {
      try { if (typeof _realGlobal[name] !== 'function') _realGlobal[name] = fn; } catch(_) {}
      try { if (typeof GameGlobal[name] !== 'function') GameGlobal[name] = fn; } catch(_) {}
    }
  }
})();

// ═══════════════ 0.6 performance polyfill ═══════════════
// 踩坑#16: PixiJS 内部用 performance.now() 计时，微信小游戏没有 performance 全局变量
;(function _patchPerformance() {
  if (typeof _realGlobal.performance === 'undefined') {
    var _startTime = Date.now();
    _realGlobal.performance = {
      now: function() { return Date.now() - _startTime; },
      timeOrigin: _startTime,
    };
  }
  try { if (typeof GameGlobal.performance === 'undefined') GameGlobal.performance = _realGlobal.performance; } catch(_) {}
})();

// ═══════════════ 1. Object.defineProperty 安全 patch ═══════════════
// 踩坑#4: PixiJS 大量 defineProperty，真机遇不可配置属性会中断
// ★ 关键：在 patch 之前保存原始引用，供后续 canvas 属性设置使用
var _origDefineProperty = Object.defineProperty;
var _origDefineProperties = Object.defineProperties;

;(function _patchDefineProperty() {
  Object.defineProperty = function safeDefineProperty(obj, prop, desc) {
    try { return _origDefineProperty.call(Object, obj, prop, desc); }
    catch (e) { if (e instanceof TypeError) return obj; throw e; }
  };
  Object.defineProperties = function safeDefineProperties(obj, props) {
    try { return _origDefineProperties.call(Object, obj, props); }
    catch (e) { if (e instanceof TypeError) return obj; throw e; }
  };
})();

// ═══════════════ 2. 主 canvas ═══════════════
var _api = typeof wx !== 'undefined' ? wx : (typeof tt !== 'undefined' ? tt : null);
var mainCanvas = (typeof canvas !== 'undefined') ? canvas : (_api ? _api.createCanvas() : null);

// 踩坑#3: 模拟器中 window.canvas 是只读属性
try { _realGlobal.canvas = mainCanvas; } catch (_) {}
try { GameGlobal.canvas = mainCanvas; } catch (_) {}

// ═══════════════ 3. document 适配 ═══════════════
// 踩坑#5: PixiJS 内部 createCanvas 依赖 document.createElement
// 踩坑#15: AccessibilityManager 会 createElement('div'/'button')，然后访问 style
//          返回空对象 {} 会导致 style.width 崩溃，必须返回带 style 的完整 DOM 桩
;(function _patchDocument() {
  if (typeof _realGlobal.document !== 'undefined' && typeof _realGlobal.document.createElement === 'function') return;

  // 创建带完整 DOM 接口的桩对象（满足 PixiJS AccessibilityManager / EventSystem 等插件）
  function _makeDOMStub() {
    return {
      style: {},
      classList: { add: function(){}, remove: function(){} },
      appendChild: function(c) { return c; },
      removeChild: function(c) { return c; },
      insertBefore: function(c) { return c; },
      contains: function() { return false; },
      setAttribute: function() {},
      getAttribute: function() { return null; },
      removeAttribute: function() {},
      addEventListener: function() {},
      removeEventListener: function() {},
      dispatchEvent: function() { return true; },
      getBoundingClientRect: function() { return { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0 }; },
      cloneNode: function() { return _makeDOMStub(); },
      parentNode: null,
      parentElement: null,
      children: [],
      childNodes: [],
      innerHTML: '',
      innerText: '',
      textContent: '',
      tagName: 'DIV',
      id: '',
      className: '',
      tabIndex: -1,
      focus: function() {},
      blur: function() {},
    };
  }

  var _bodyStub = _makeDOMStub();
  _bodyStub.tagName = 'BODY';

  // document 自身也需要 addEventListener（PixiJS EventSystem 在 document 上监听 mousemove 等）
  var _docListeners = {};

  var _doc = {
    createElement: function(tag) {
      var t = (tag || '').toLowerCase();
      if (t === 'canvas') {
        var c = _api.createCanvas();
        _ensureCanvasStyle(c);
        return c;
      }
      if (t === 'img' || t === 'image') return _api.createImage();
      var stub = _makeDOMStub();
      stub.tagName = tag.toUpperCase();
      return stub;
    },
    createElementNS: function(_ns, tag) { return this.createElement(tag); },
    getElementById: function() { return null; },
    getElementsByTagName: function() { return []; },
    addEventListener: function(type, fn, opts) {
      _docListeners[type] = _docListeners[type] || [];
      if (_docListeners[type].indexOf(fn) === -1) _docListeners[type].push(fn);
    },
    removeEventListener: function(type, fn, opts) {
      var arr = _docListeners[type];
      if (arr) { var idx = arr.indexOf(fn); if (idx >= 0) arr.splice(idx, 1); }
    },
    dispatchEvent: function() { return true; },
    // ★ 踩坑#19: PixiJS determineCrossOrigin 用 document.baseURI 做 new URL 的 base
    baseURI: 'https://localhost/',
    body: _bodyStub,
    documentElement: _makeDOMStub(),
  };
  _realGlobal.document = _doc;
  GameGlobal.document = _doc;
})();

// ═══════════════ 4. window / navigator / self / PointerEvent ═══════════════
try { if (typeof _realGlobal.window === 'undefined') _realGlobal.window = _realGlobal; } catch (_) {}
try { GameGlobal.window = _realGlobal; } catch (_) {}
try { if (typeof _realGlobal.self === 'undefined') _realGlobal.self = _realGlobal; } catch (_) {}
try { if (typeof _realGlobal.navigator === 'undefined') _realGlobal.navigator = { userAgent: 'wxgame', platform: 'wxgame', maxTouchPoints: 10 }; } catch (_) {}

// ★ 踩坑#18: PixiJS determineCrossOrigin 内部执行 new URL(src, location.href)
// 微信小游戏没有 location，base 为 undefined → Invalid URL
// 提供一个合法的虚拟 location 让 URL 构造器不崩
;(function _patchLocation() {
  if (typeof _realGlobal.location === 'undefined') {
    var _loc = {
      href: 'https://localhost/',
      origin: 'https://localhost',
      protocol: 'https:',
      host: 'localhost',
      hostname: 'localhost',
      port: '',
      pathname: '/',
      search: '',
      hash: '',
    };
    try { _realGlobal.location = _loc; } catch(_) {}
    try { GameGlobal.location = _loc; } catch(_) {}
  }
})();

// 踩坑#17: PixiJS EventSystem 用 globalThis.PointerEvent 决定事件模式
// 如果不存在，会降级到 touch 事件模式，但我们桥接的是 pointer 事件
try {
  if (typeof _realGlobal.PointerEvent === 'undefined') {
    _realGlobal.PointerEvent = function PointerEvent(type, opts) {
      this.type = type;
      if (opts) { for (var k in opts) this[k] = opts[k]; }
    };
  }
} catch (_) {}

// ═══════════════ 5. HTMLCanvasElement / HTMLImageElement ═══════════════
;(function _patchHTMLElements() {
  if (typeof _realGlobal.HTMLCanvasElement === 'undefined') {
    var _HCE = (mainCanvas && mainCanvas.constructor) ? mainCanvas.constructor : function HTMLCanvasElement() {};
    _realGlobal.HTMLCanvasElement = _HCE;
    GameGlobal.HTMLCanvasElement = _HCE;
  }
  if (typeof _realGlobal.HTMLImageElement === 'undefined') {
    try {
      var img = _api.createImage();
      var _HIE = img.constructor || function HTMLImageElement() {};
      _realGlobal.HTMLImageElement = _HIE;
      GameGlobal.HTMLImageElement = _HIE;
    } catch (_) {
      var _fallback = function HTMLImageElement() {};
      _realGlobal.HTMLImageElement = _fallback;
      GameGlobal.HTMLImageElement = _fallback;
    }
  }
  if (typeof _realGlobal.HTMLVideoElement === 'undefined') {
    _realGlobal.HTMLVideoElement = function HTMLVideoElement() {};
  }
  // ★ 关键：new Image() 必须委托到 wx.createImage()，不能直接用原生构造器
  if (typeof _realGlobal.Image === 'undefined' || _realGlobal.Image === _realGlobal.HTMLImageElement) {
    _realGlobal.Image = function WxImage() {
      return _api.createImage();
    };
    try { GameGlobal.Image = _realGlobal.Image; } catch(_) {}
  }
})();

// ═══════════════ 6. 触摸事件桥接 ═══════════════
var _canvasListeners = {};
var _winListeners = {};

function _makeEvent(type, touch, target) {
  return {
    type: type, target: target, currentTarget: target,
    clientX: touch.clientX, clientY: touch.clientY,
    pageX: touch.pageX || touch.clientX,
    pageY: touch.pageY || touch.clientY,
    pointerId: touch.identifier || 0,
    pointerType: 'touch',
    button: 0, buttons: type === 'pointerup' ? 0 : 1,
    width: 1, height: 1,
    isPrimary: true,
    preventDefault: function() {},
    stopPropagation: function() {},
  };
}

function _fireCanvas(type, touch) {
  var arr = _canvasListeners[type];
  if (!arr || !arr.length) return;
  var evt = _makeEvent(type, touch, mainCanvas);
  for (var i = 0; i < arr.length; i++) arr[i](evt);
}

function _fireWindow(type, touch) {
  var arr = _winListeners[type];
  if (!arr || !arr.length) return;
  var evt = _makeEvent(type, touch, _realGlobal);
  for (var i = 0; i < arr.length; i++) arr[i](evt);
}

;(function _patchTouchEvents() {
  if (!mainCanvas || !_api) return;

  var _origAddCanvas = mainCanvas.addEventListener;
  var _origRemoveCanvas = mainCanvas.removeEventListener;

  mainCanvas.addEventListener = function(type, fn, opts) {
    _canvasListeners[type] = _canvasListeners[type] || [];
    if (_canvasListeners[type].indexOf(fn) === -1) _canvasListeners[type].push(fn);
    if (_origAddCanvas) try { _origAddCanvas.call(mainCanvas, type, fn, opts); } catch(_) {}
  };
  mainCanvas.removeEventListener = function(type, fn, opts) {
    var arr = _canvasListeners[type];
    if (arr) { var idx = arr.indexOf(fn); if (idx >= 0) arr.splice(idx, 1); }
    if (_origRemoveCanvas) try { _origRemoveCanvas.call(mainCanvas, type, fn, opts); } catch(_) {}
  };

  var _origAddWin = _realGlobal.addEventListener;
  var _origRemoveWin = _realGlobal.removeEventListener;

  _realGlobal.addEventListener = function(type, fn, opts) {
    _winListeners[type] = _winListeners[type] || [];
    if (_winListeners[type].indexOf(fn) === -1) _winListeners[type].push(fn);
    if (_origAddWin) try { _origAddWin.call(_realGlobal, type, fn, opts); } catch(_) {}
  };
  _realGlobal.removeEventListener = function(type, fn, opts) {
    var arr = _winListeners[type];
    if (arr) { var idx = arr.indexOf(fn); if (idx >= 0) arr.splice(idx, 1); }
    if (_origRemoveWin) try { _origRemoveWin.call(_realGlobal, type, fn, opts); } catch(_) {}
  };
})();

// ═══════════════ 7. canvas 辅助属性 ═══════════════
// ★ 核心修复: 用原始 defineProperty 设置 style，绕过安全补丁的静默吞错
// 如果原始 defineProperty 也失败（真机 native canvas 不可扩展），则用多种降级方案

/**
 * 为 canvas 对象强制挂载 style 属性，多种降级方案
 * @param {Object} c - canvas 对象
 */
function _ensureCanvasStyle(c) {
  if (!c) return;
  var _styleObj = {
    width: '', height: '',
    cursor: '', touchAction: 'none',
    position: '', top: '', left: '',
    // setter 容忍任意赋值不报错
  };

  // 如果已有 style 对象，确保关键属性存在
  if (c.style && typeof c.style === 'object') {
    if (!('touchAction' in c.style)) c.style.touchAction = 'none';
    return;
  }

  // 方案1: 用原始（未被安全 patch 的）Object.defineProperty
  var success = false;
  try {
    _origDefineProperty.call(Object, c, 'style', {
      value: _styleObj, writable: true, configurable: true, enumerable: true,
    });
    if (c.style === _styleObj) success = true;
  } catch (_) {}

  // 方案2: 直接赋值
  if (!success) {
    try { c.style = _styleObj; } catch (_) {}
    if (c.style === _styleObj) success = true;
  }

  // 方案3: 在原型链上挂载
  if (!success) {
    try {
      var proto = Object.getPrototypeOf ? Object.getPrototypeOf(c) : c.__proto__;
      if (proto) {
        _origDefineProperty.call(Object, proto, 'style', {
          value: _styleObj, writable: true, configurable: true,
        });
        if (c.style) success = true;
      }
    } catch (_) {}
  }

  // 方案4: 用 Proxy 包裹（最终兜底，仅当 Proxy 可用时）
  // 注意：这里不能替换 mainCanvas 引用，需要在 Game.ts 里做
  if (!success && !c.style) {
    console.warn('[adapter] canvas.style 无法设置，需要 Game.ts 兜底');
  }
}

;(function _patchCanvasProps() {
  if (!mainCanvas || !_api) return;
  var info = _api.getSystemInfoSync();
  var sw = info.screenWidth || 375;
  var sh = info.screenHeight || 667;

  try { mainCanvas.parentElement = { clientWidth: sw, clientHeight: sh }; } catch (_) {}

  if (typeof mainCanvas.getBoundingClientRect !== 'function') {
    mainCanvas.getBoundingClientRect = function() {
      return { left: 0, top: 0, width: sw, height: sh, right: sw, bottom: sh, x: 0, y: 0 };
    };
  }

  // 用专用函数挂载 style
  _ensureCanvasStyle(mainCanvas);

  // clientWidth/clientHeight
  try {
    if (typeof mainCanvas.clientWidth === 'undefined') {
      _origDefineProperty.call(Object, mainCanvas, 'clientWidth', { get: function() { return sw; }, configurable: true });
    }
  } catch(_) { try { mainCanvas.clientWidth = sw; } catch(_2) {} }
  try {
    if (typeof mainCanvas.clientHeight === 'undefined') {
      _origDefineProperty.call(Object, mainCanvas, 'clientHeight', { get: function() { return sh; }, configurable: true });
    }
  } catch(_) { try { mainCanvas.clientHeight = sh; } catch(_2) {} }
})();

// ═══════════════ 8. 全局触摸状态（供 InputSystem 轮询） ═══════════════
var __sdcTouches = [];
try { _realGlobal.__sdcTouches = __sdcTouches; } catch(_) {}
try { GameGlobal.__sdcTouches = __sdcTouches; } catch(_) {}

if (_api) {
  var _sw = 375, _sh = 667;
  try { var _si = _api.getSystemInfoSync(); _sw = _si.screenWidth || 375; _sh = _si.screenHeight || 667; } catch(_) {}

  _api.onTouchStart(function(e) {
    // ★ 必须用 changedTouches（仅新增触摸点），用 touches（全部）会造成重复
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      // 防重复：检查是否已存在
      var dup = false;
      for (var d = 0; d < __sdcTouches.length; d++) {
        if (__sdcTouches[d].id === t.identifier) { dup = true; break; }
      }
      if (!dup) {
        __sdcTouches.push({ id: t.identifier, x: t.clientX, y: t.clientY, sx: t.clientX, sy: t.clientY });
      }
    }
    for (var j = 0; j < e.changedTouches.length; j++) {
      _fireCanvas('pointerdown', e.changedTouches[j]);
      _fireWindow('pointerdown', e.changedTouches[j]);
    }
  });
  _api.onTouchMove(function(e) {
    // ★ 同样用 changedTouches
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      for (var j = 0; j < __sdcTouches.length; j++) {
        if (__sdcTouches[j].id === t.identifier) {
          __sdcTouches[j].x = t.clientX;
          __sdcTouches[j].y = t.clientY;
          break;
        }
      }
    }
    for (var k = 0; k < e.changedTouches.length; k++) {
      _fireCanvas('pointermove', e.changedTouches[k]);
      _fireWindow('pointermove', e.changedTouches[k]);
    }
  });
  _api.onTouchEnd(function(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      // ★ 删除所有匹配（不 break），清理可能的历史重复
      for (var j = __sdcTouches.length - 1; j >= 0; j--) {
        if (__sdcTouches[j].id === t.identifier) __sdcTouches.splice(j, 1);
      }
    }
    for (var k = 0; k < e.changedTouches.length; k++) {
      _fireCanvas('pointerup', e.changedTouches[k]);
      _fireWindow('pointerup', e.changedTouches[k]);
    }
  });
  _api.onTouchCancel(function(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      for (var j = __sdcTouches.length - 1; j >= 0; j--) {
        if (__sdcTouches[j].id === t.identifier) __sdcTouches.splice(j, 1);
      }
    }
    for (var k = 0; k < e.changedTouches.length; k++) {
      _fireCanvas('pointerup', e.changedTouches[k]);
      _fireWindow('pointerup', e.changedTouches[k]);
    }
  });
}

// ═══════════════ 加载游戏 bundle ═══════════════
console.log('[adapter] 适配层初始化完成');
require('./game-bundle.js');
