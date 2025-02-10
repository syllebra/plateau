var ENABLE_TOUCHSCREEN_SIMULATION = !("ontouchstart" in window); // Automatic if touch not available
var DISPATCH_ELEMENT_NAME = "renderCanvas";

// Adds mapping of touch events to mouse events for mobile. This isnt great but it is somewhat usable

// Framework for simulating touch events without a mobile device
// Trying to be compatible with
//  http://dvcs.w3.org/hg/webevents/raw-file/tip/touchevents.html
// TODO: support more of the touch API: touch{enter, leave, cancel}
var tuio = {
  cursors: [],

  // Data structure for associating cursors with objects
  _data: {},

  _touchstart: function (touch) {
    // Create a touchstart event
    this._create_event("touchstart", touch, {});
    //this._create_event("pointerdown", touch, {});
  },

  _touchmove: function (touch) {
    // Create a touchmove event
    this._create_event("touchmove", touch, {});
    //this._create_event("pointermove", touch, {});
  },

  _touchend: function (touch) {
    // Create a touchend event
    this._create_event("touchend", touch, {});
    //this._create_event("pointerup", touch, {});
  },

  _create_event: function (name, touch, attrs) {
    // Create PointerEvent for Babylon.js compatibility
    var evt = new PointerEvent(name, {
      //inputIndex: 12,
      isTrusted: true,
      altKey: false,
      altitudeAngle: 1.5707963267948966,
      azimuthAngle: 0,
      bubbles: true,
      button: -1,
      buttons: 1,
      cancelBubble: false,
      cancelable: true,
      clientX: touch.clientX,
      clientY: touch.clientY,
      screenX: touch.pageX,
      screenY: touch.pageY,
      composed: true,
      ctrlKey: false,
      currentTarget: null,
      defaultPrevented: false,
      detail: 0,
      eventPhase: 0,
      fromElement: null,
      persistentDeviceId: 0,
      pointerId: touch.id,
      pointerType: "touch",
      pressure: 1,
      relatedTarget: null,
      returnValue: true,
      shiftKey: false,
      sourceCapabilities: null,
      tangentialPressure: 0,
      tiltX: 0,
      toElement: null,
      twist: 0,
      type: touch.type,
      isPrimary: true,
      metaKey: false,
    });

    // Attach touch properties for compatibility
    evt.touches = this.cursors;
    evt.targetTouches = this._get_target_touches(touch.target);
    evt.changedTouches = [touch];
    // Attach custom attrs to the event
    for (var attr in attrs) {
      if (attrs.hasOwnProperty(attr)) {
        evt[attr] = attrs[attr];
      }
    }
    // Dispatch the event to renderCanvas with proper coordinates
    const renderCanvas = document.getElementById(DISPATCH_ELEMENT_NAME);
    const rect = renderCanvas.getBoundingClientRect();

    // Convert coordinates to renderCanvas space using touch coordinates
    evt.pageX = rect.left + (touch.pageX / window.innerWidth) * rect.width;
    evt.pageY = rect.top + (touch.pageY / window.innerHeight) * rect.height;
    evt.clientX = evt.pageX - window.scrollX;
    evt.clientY = evt.pageY - window.scrollY;

    // Update touch coordinates
    if (evt.changedTouches && evt.changedTouches.length > 0) {
      evt.changedTouches[0].pageX = evt.pageX;
      evt.changedTouches[0].pageY = evt.pageY;
      evt.changedTouches[0].clientX = evt.clientX;
      evt.changedTouches[0].clientY = evt.clientY;
    }

    // Dispatch to renderCanvas
    renderCanvas.dispatchEvent(evt);
  },

  _get_target_touches: function (element) {
    var targetTouches = [];
    for (var i = 0; i < this.cursors.length; i++) {
      var touch = this.cursors[i];
      if (touch.target == element) {
        targetTouches.push(touch);
      }
    }
    return targetTouches;
  },

  // Callback from the main event handler
  callback: function (type, sid, fid, x, y, angle) {
    //console.log('callback type: ' + type + ' sid: ' + sid + ' fid: ' + fid);
    var data;

    if (type !== 3) {
      data = this._data[sid];
    } else {
      data = {
        sid: sid,
        fid: fid,
      };
      this._data[sid] = data;
    }

    // Some properties
    // See http://dvcs.w3.org/hg/webevents/raw-file/tip/touchevents.html

    data.identifier = sid;
    const renderCanvas = document.getElementById(DISPATCH_ELEMENT_NAME);
    const rect = renderCanvas.getBoundingClientRect();

    // Calculate coordinates relative to renderCanvas
    data.pageX = rect.left + x * rect.width;
    data.pageY = rect.top + y * rect.height;
    data.clientX = data.pageX - window.scrollX;
    data.clientY = data.pageY - window.scrollY;
    data.target = renderCanvas;
    data.type = type;

    switch (type) {
      case 3:
        this.cursors.push(data);
        this._touchstart(data);
        break;

      case 4:
        this._touchmove(data);
        break;

      case 5:
        this.cursors.splice(this.cursors.indexOf(data), 1);
        this._touchend(data);
        break;

      default:
        break;
    }

    // if (type === 5) {
    // 	delete this._data[sid];
    // }
  },
};

function tuio_callback(type, sid, fid, x, y, angle) {
  tuio.callback(type, sid, fid, x, y, angle);
}

////////////////////////////////////////////////////////////////////////
// Debug drawing canvas
var ts_simulator_canvas;
var ctx;
var w = 0;
var h = 0;

var timer;
var updateStarted = false;
var touches = [];

function update() {
  if (updateStarted) return;
  updateStarted = true;

  var nw = window.innerWidth;
  var nh = window.innerHeight;

  if (w != nw || h != nh) {
    w = nw;
    h = nh;
    ts_simulator_canvas.style.width = w + "px";
    ts_simulator_canvas.style.height = h + "px";
    ts_simulator_canvas.width = w;
    ts_simulator_canvas.height = h;
  }

  ctx.clearRect(0, 0, w, h);

  var i,
    len = touches.length;
  for (i = 0; i < len; i++) {
    var touch = touches[i];
    var px = touch.pageX;
    var py = touch.pageY;

    ctx.beginPath();
    ctx.arc(px, py, 20, 0, 2 * Math.PI, true);

    ctx.fillStyle = "rgba(200, 0, 200, 0.2)";
    ctx.fill();

    ctx.lineWidth = 2.0;
    ctx.strokeStyle = "rgba(200, 0, 200, 0.8)";
    ctx.stroke();
    //console.log('drawn circle at ' + px +',' + py);
  }

  updateStarted = false;
}

function ol() {
  ts_simulator_canvas = document.getElementById("ts_simulator_canvas");
  ctx = ts_simulator_canvas.getContext("2d");
  timer = setInterval(update, 15);

  ts_simulator_canvas.addEventListener("touchend", function (event) {
    ctx.clearRect(0, 0, w, h);
    console.log("end");
  });

  ts_simulator_canvas.addEventListener("touchmove", function (event) {
    //event.preventDefault();
    touches = event.touches;
    console.log("touchmove:", touches);
  });

  ts_simulator_canvas.addEventListener("touchstart", function (event) {
    console.log("start");
  });
}

function oldebug() {
  render_canvas = document.getElementById(DISPATCH_ELEMENT_NAME);

  render_canvas.addEventListener("touchend", function (event) {
    ctx.clearRect(0, 0, w, h);
    console.log("RC: end");
  });

  render_canvas.addEventListener("touchmove", function (event) {
    //event.preventDefault();
    touches = event.touches;
    console.log("RC: touchmove:", touches);
  });

  render_canvas.addEventListener("touchstart", function (event) {
    console.log("RC: start");
  });
}

////////////////////////////////////////////////////////////////////////

function makeElementDraggable(elmnt) {
  var pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;
  if (document.getElementById(elmnt.id + "header")) {
    // if present, the header is where you move the DIV from:
    document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV:
    elmnt.onmousedown = dragMouseDown;
    elementDrag.ontouchdown = dragMouseDown;
  }

  function dragMouseDown(e) {
    if (e.fake) return;

    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;

    if (e.button == 1) {
      if (elmnt.classList.contains("touch-down")) {
        elmnt.classList.remove("touch-down");
        tuio_callback(
          5,
          elmnt.id,
          elmnt.id,
          elmnt.offsetLeft / window.innerWidth,
          elmnt.offsetTop / window.innerHeight,
          0
        );
      } else {
        elmnt.classList.add("touch-down");
        tuio_callback(
          3,
          elmnt.id,
          elmnt.id,
          elmnt.offsetLeft / window.innerWidth,
          elmnt.offsetTop / window.innerHeight,
          0
        );
      }
    }
  }

  function elementDrag(e) {
    if (e.fake) return;
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;

    var toMove = [elmnt];
    if (e.shiftKey) toMove = document.getElementsByClassName("touch-down");

    for (var el of toMove) {
      // set the element's new position:
      el.style.top = el.offsetTop - pos2 + "px";
      el.style.left = el.offsetLeft - pos1 + "px";

      if (el.classList.contains("touch-down")) {
        tuio_callback(4, el.id, el.id, el.offsetLeft / window.innerWidth, el.offsetTop / window.innerHeight, 0);
      }
    }
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
    //elmnt.classList.remove("touch-down")
  }
}

function initTouchDebug() {
  if (ENABLE_TOUCHSCREEN_SIMULATION == false) return;
  document.head.innerHTML += '<link rel="stylesheet" type="text/css" href="js/debug/multi_touch_sim.css" />';
  document.body.insertAdjacentHTML(
    "beforeend",
    '<canvas id="ts_simulator_canvas" width="100%" height="100%"></canvas>'
  );

  document.body.insertAdjacentHTML("beforeend", '<div class="touch-sim" id="touch-sim-1"</div>');
  document.body.insertAdjacentHTML("beforeend", '<div class="touch-sim" id="touch-sim-2"</div>');
  document.body.insertAdjacentHTML("beforeend", '<div class="touch-sim" id="touch-sim-3"</div>');
  var cpt = 0;
  for (var el of document.getElementsByClassName("touch-sim")) {
    // el.id_cpt = cpt
    // cpt = cpt +1
    makeElementDraggable(el);
  }

  ol();
  //oldebug();
}
initTouchDebug();
