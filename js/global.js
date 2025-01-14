let canvas, engine, pathTracingScene;
let camera;
let scene, shadowGen;
let gizmoManager;

let rotationIncrement = 45;

let preloadFunctions = [];

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
