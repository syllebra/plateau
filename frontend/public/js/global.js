let canvas, engine, pathTracingScene;
let camera, isolateCamera;
let scene, shadowGen;
let gizmoManager;

let controlKeyDown = false;
let shiftKeyDown = false;
let altKeyDown = false;

let rotationIncrement = 45;
let showDropZoneInRadius = 100.1;

let viewportMouseX = 0;
let viewportMouseY = 0;

let gMouseThrowSensibility = 80;

let randomizeDiceOrientationOnThrow = true;

gLiftHeight = 0.15;

let preloadFunctions = [];

let g_tooltip = null;

function registerPreload(f) {
  preloadFunctions.push(f);
}

async function preload() {
  for (var f of preloadFunctions) await f();
}

BABYLON.HavokPlugin.prototype.setPhysicsBodyEnabled = function (body, setEnabled = true) {
  if (!body || !body._pluginData) return;

  if (setEnabled) {
    this._hknp.HP_World_AddBody(this.world, body._pluginData.hpBodyId, body.startAsleep);
  } else {
    this._hknp.HP_World_RemoveBody(this.world, body._pluginData.hpBodyId);
  }
};

function getPageName(url) {
  var index = url.lastIndexOf("/") + 1;
  var filenameWithExtension = url.substr(index);
  var filename = filenameWithExtension.split(".")[0]; // <-- added this line
  return filename; // <-- added this line
}

function shuffle(array) {
  let currentIndex = array.length;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
}

/**
 * Fast UUID generator, RFC4122 version 4 compliant.
 * @author Jeff Ward (jcward.com).
 * @license MIT license
 * @link http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/21963136#21963136
 **/
var UUID = (function () {
  var self = {};
  var lut = [];
  for (var i = 0; i < 256; i++) {
    lut[i] = (i < 16 ? "0" : "") + i.toString(16);
  }
  self.generate = function () {
    var d0 = (Math.random() * 0xffffffff) | 0;
    var d1 = (Math.random() * 0xffffffff) | 0;
    var d2 = (Math.random() * 0xffffffff) | 0;
    var d3 = (Math.random() * 0xffffffff) | 0;
    return (
      lut[d0 & 0xff] +
      lut[(d0 >> 8) & 0xff] +
      lut[(d0 >> 16) & 0xff] +
      lut[(d0 >> 24) & 0xff] +
      "-" +
      lut[d1 & 0xff] +
      lut[(d1 >> 8) & 0xff] +
      "-" +
      lut[((d1 >> 16) & 0x0f) | 0x40] +
      lut[(d1 >> 24) & 0xff] +
      "-" +
      lut[(d2 & 0x3f) | 0x80] +
      lut[(d2 >> 8) & 0xff] +
      "-" +
      lut[(d2 >> 16) & 0xff] +
      lut[(d2 >> 24) & 0xff] +
      lut[d3 & 0xff] +
      lut[(d3 >> 8) & 0xff] +
      lut[(d3 >> 16) & 0xff] +
      lut[(d3 >> 24) & 0xff]
    );
  };
  return self;
})();

Number.prototype.pad = function (size) {
  var s = String(this);
  while (s.length < (size || 2)) {
    s = "0" + s;
  }
  return s;
};

// window.addEventListener("unhandledrejection", (event) => {
//   console.warn(`UNHANDLED PROMISE REJECTION: ${event.reason}`);
// });

window.onunhandledrejection = (event) => {
  console.warn(`UNHANDLED PROMISE REJECTION: ${event.reason}`);
};

function loadScript(src) {
  return new Promise(function (resolve, reject) {
    var s;
    s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

var _cls_ = {}; // serves as a cache, speed up later lookups
function getClass(name) {
  if (!_cls_[name]) {
    // cache is not ready, fill it up
    if (name.match(/^[a-zA-Z0-9_]+$/)) {
      // proceed only if the name is a single word string
      _cls_[name] = eval(name);
    } else {
      // arbitrary code is detected
      throw new Error("Who let the dogs out?");
    }
  }
  return _cls_[name];
}
