class StatsUI {
  static stats = null;
  static {
    // setup the frame rate display (FPS) in the top-left corner
    let container = document.getElementById("container");
    this.stats = new Stats();
    this.stats.domElement.style.position = "absolute";
    this.stats.domElement.style.top = "0px";
    this.stats.domElement.style.right = "0px";
    this.stats.domElement.style.cursor = "default";
    this.stats.domElement.style.webkitUserSelect = "none";
    this.stats.domElement.style.MozUserSelect = "none";
    container.appendChild(this.stats.domElement);
  }

  static update() {
    if (this.stats) this.stats.update();
  }
}

class FastUI {
  panel = null;
  constructor() {
    var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

    this.panel = new BABYLON.GUI.StackPanel();
    this.panel.spacing = 5;
    advancedTexture.addControl(this.panel);
    this.panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    this.panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.panel.paddingLeftInPixels = 10;
    this.panel.paddingTopInPixels = 10;
    this.panel.width = "30%";
    this.panel.fontSize = "10";
  }

  addBtn(text, clickFn) {
    const addBtn = BABYLON.GUI.Button.CreateSimpleButton("btn_" + text.slice(0, 5), text);
    this.panel.addControl(addBtn);
    addBtn.width = "100%";
    addBtn.height = "30px";
    addBtn.background = "green";
    addBtn.color = "white";
    addBtn.onPointerClickObservable.add(clickFn);
    return addBtn;
  }

  addToggle(toggleText) {
    var toggleViewLine = new BABYLON.GUI.StackPanel("toggleViewLine");
    toggleViewLine.isVertical = false;
    toggleViewLine.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    toggleViewLine.spacing = 5;
    toggleViewLine.resizeToFit = true;
    toggleViewLine.height = "25px";
    this.panel.addControl(toggleViewLine);
    var checkbox = new BABYLON.GUI.Checkbox();
    checkbox.verticalAlignment = 0; //BABYLON.Control.VERTICAL_ALIGNMENT_TOP;
    checkbox.width = "20px";
    checkbox.height = "20px";
    checkbox.isChecked = false;
    checkbox.color = "green";
    toggleViewLine.addControl(checkbox);
    toggleViewLine.paddingTop = 2;

    var checkboxText = new BABYLON.GUI.TextBlock("checkboxText", toggleText);
    checkboxText.resizeToFit = true;
    checkboxText.color = "white";
    toggleViewLine.addControl(checkboxText);
    return checkbox;
  }

  addText(scene, updateFn, initialText) {
    var bodiesCounter = new BABYLON.GUI.TextBlock("bodiesCounter", initialText);
    bodiesCounter.color = "white";
    bodiesCounter.resizeToFit = true;
    //bodiesCounter.fontSize = "20px";
    this.panel.addControl(bodiesCounter);
    if (updateFn) {
      scene.onAfterRenderObservable.add(() => updateFn(bodiesCounter));
    }
    return bodiesCounter;
  }

  setup(scene, hk, viewer) {
    // Debug physics button
    const viewerCheckbox = this.addToggle("Debug Viewer");
    viewerCheckbox.isChecked = false;
    viewerCheckbox.onIsCheckedChangedObservable.add((value) => {
      if (value) {
        viewer = new BABYLON.Debug.PhysicsViewer(scene);
        for (let mesh of scene.meshes) {
          if (viewer && mesh.physicsBody && mesh.plateauObj && mesh.plateauObj.physicsEnabled) {
            viewer.showBody(mesh.physicsBody);
          }
        }
      } else {
        viewer.dispose();
        viewer = null;
      }
    });

    this.addText(scene, (bodiesCounter) => {
      const n = hk.numBodies;
      bodiesCounter.text = `bodies: ${n}`;
    });

    const sceneInstrumentation = new BABYLON.SceneInstrumentation(scene);
    sceneInstrumentation.captureFrameTime = true;
    sceneInstrumentation.capturePhysicsTime = true;

    this.addText(scene, (c) => {
      const ft = sceneInstrumentation.frameTimeCounter.lastSecAverage;
      c.text = `absolute fps: ${(1000 / ft).toFixed(2)}`;
    });

    this.addText(scene, (c) => {
      const pt = sceneInstrumentation.physicsTimeCounter.lastSecAverage;
      c.text = `physics time: ${pt.toFixed(2)} ms`;
    });
  }
}

class MouseSpeed {
  static timestamp = 0;
  static speedMax = 0;
  static value = 0;
  static update(e) {
    var now = Date.now();

    var dt = now - this.timestamp;
    var dx = e.movementX;
    var dy = e.movementY;

    var distance = Math.sqrt(dx * dx + dy * dy);
    //    var direction = Math.atan2(dy, dx);

    //speed is zero when mouse was still (dt hold a long pause)
    this.value = parseInt((distance / dt) * 100);
    // var speedX = Math.round((dx / dt) * 100);
    // var speedY = Math.round((dy / dt) * 100);

    //reset if speed is zero, otherwise set max of any speed
    this.speedMax = !this.mouse_speed ? 0 : this.mouse_speed > this.speedMax ? this.mouse_speed : this.speedMax;
    //console.log("max:",speedMax)
    this.timestamp = now;
  }
  static reset() {
    this.speedMax = 0;
  }
}

class FrostedTooltip {
  appearTimeout = -1;
  constructor(cardId, container, options = {}) {
    this.card = document.getElementById(cardId);
    this.container = container; //document.getElementById(containerId);
    this.defaultOptions = {
      title: "Default Title",
      description: "This is the default description for the frosted card tooltip.",
      uuid: "xxxxxxxxxxxxxxxx", // Default placeholder UUID
      xOffset: 15,
      yOffset: 15,
    };
    this.options = { ...this.defaultOptions, ...options };

    // Apply default content
    this.setTitle(this.options.title);
    this.setDescription(this.options.description);
    this.setUUID(this.options.uuid);
    this.appearTimeout = -1;
  }

  setTitle(title) {
    this.options.title = title;
    this.card.querySelector("#tooltip-title").innerHTML = title;
  }

  setDescription(description) {
    this.options.description = description;
    this.card.querySelector("#tooltip-description").innerHTML = description;
  }

  setUUID(uuid) {
    this.options.uuid = uuid;
    this.card.querySelector("#tooltip-uuid").innerHTML = uuid;
  }

  showTooltip(mouseX, mouseY) {
    // Get container bounds
    const containerRect = this.container.getBoundingClientRect();
    const cardRect = this.card.getBoundingClientRect();

    // Calculate tooltip position
    let left = mouseX + this.options.xOffset;
    let top = mouseY + this.options.yOffset;

    // Adjust to keep tooltip inside the container
    if (left + cardRect.width > containerRect.right) {
      left = containerRect.right - cardRect.width - 10; // Add some padding
    }
    if (top + cardRect.height > containerRect.bottom) {
      top = containerRect.bottom - cardRect.height - 10;
    }
    if (left < containerRect.left) {
      left = containerRect.left + 10;
    }
    if (top < containerRect.top) {
      top = containerRect.top + 10;
    }

    // Apply final position
    this.card.style.left = `${left}px`;
    this.card.style.top = `${top}px`;

    // Add visible class for animations
    if (this.appearTimeout < 0)
      this.appearTimeout = setTimeout(() => {
        this.card.classList.add("visible");
      }, 1000);
  }

  hideTooltip() {
    // Remove visible class to trigger disappearance animations
    this.card.classList.remove("visible");
    if (this.appearTimeout >= 0) {
      clearTimeout(this.appearTimeout);
      this.appearTimeout = -1;
    }
  }
}

// Example usage:
const tooltip = new FrostedTooltip("tooltip-card", "container", {
  title: "Hello Tooltip!",
  description: "This tooltip adjusts its position to stay visible within the container.",
});

// Event listeners for showing and hiding the tooltip
document.getElementById("container").addEventListener("mousemove", (event) => {
  tooltip.showTooltip(event.pageX, event.pageY);
});

document.getElementById("container").addEventListener("mouseleave", () => {
  tooltip.hideTooltip();
});

g_tooltip = new FrostedTooltip("tooltip-card", document.body, {
  title: "Hello Tooltip!",
  description: "This is a frosted card tooltip with subtle animations for title and description.",
});
const LoadingOverlay = {
  // Configuration options
  config: {
    blockable: true, // Whether the overlay is fully blockable
    debug: false, // Whether to display debug information
    animationDuration: 2, // Duration of the animation in seconds
    gradientColors: ["rgba(0, 255, 255, 0.3)", "rgba(28, 28, 28, 0.3)", "rgba(46, 46, 46, 0.3)"], // Gradient colors with increased opacity
    frostEffect: true, // Whether to apply a frost/transparency effect
    debugInfo: "Loading...", // Default debug information
    progress: 0, // Current progress (0 to 100)
    pulseDuration: 5, // Duration of the transparency pulse animation in seconds
  },

  // Initialize the overlay
  init: function (options) {
    // Merge user options with default config
    Object.assign(this.config, options);

    // Create the overlay element
    this.overlay = document.createElement("div");
    this.overlay.style.position = "fixed";
    this.overlay.style.top = "0";
    this.overlay.style.left = "0";
    this.overlay.style.width = "100%";
    this.overlay.style.height = "100%";
    this.overlay.style.display = "flex";
    this.overlay.style.flexDirection = "column";
    this.overlay.style.justifyContent = "center";
    this.overlay.style.alignItems = "center";
    this.overlay.style.zIndex = "1000";
    this.overlay.style.background = this._createGradient();
    this.overlay.style.backdropFilter = this.config.frostEffect ? "blur(10px)" : "none";
    this.overlay.style.opacity = "0";
    this.overlay.style.transition = `opacity ${this.config.animationDuration}s ease-in-out`;
    this.overlay.style.pointerEvents = this.config.blockable ? "auto" : "none";
    this.overlay.style.overflow = "hidden";

    // Create a container for animated transparency layers
    this.overlay.innerHTML = `
            <div class="pulse-layer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 255, 255, 0.2); animation: pulse-1 ${this.config.pulseDuration}s infinite ease-in-out;"></div>
            <div class="pulse-layer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(28, 28, 28, 0.2); animation: pulse-2 ${this.config.pulseDuration}s infinite ease-in-out;"></div>
            <div class="pulse-layer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(46, 46, 46, 0.2); animation: pulse-3 ${this.config.pulseDuration}s infinite ease-in-out;"></div>
        `;

    // Create the loading spinner
    this.spinner = document.createElement("div");
    this.spinner.style.border = "4px solid rgba(255, 255, 255, 0.3)";
    this.spinner.style.borderTop = "4px solid #00FFFF";
    this.spinner.style.borderRadius = "50%";
    this.spinner.style.width = "50px";
    this.spinner.style.height = "50px";
    this.spinner.style.animation = "spin 1s linear infinite";
    this.spinner.style.zIndex = "1"; // Ensure spinner is above the pulse layers

    // Create the progress indicator
    this.progressContainer = document.createElement("div");
    this.progressContainer.style.width = "200px";
    this.progressContainer.style.height = "10px";
    this.progressContainer.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
    this.progressContainer.style.borderRadius = "5px";
    this.progressContainer.style.marginTop = "20px";
    this.progressContainer.style.overflow = "hidden";
    this.progressContainer.style.zIndex = "1"; // Ensure progress bar is above the pulse layers

    this.progressBar = document.createElement("div");
    this.progressBar.style.width = `${this.config.progress}%`;
    this.progressBar.style.height = "100%";
    this.progressBar.style.backgroundColor = "#00FFFF";
    this.progressBar.style.transition = "width 0.3s ease-in-out";

    this.progressContainer.appendChild(this.progressBar);

    // Create the debug info container
    this.debugInfo = document.createElement("div");
    this.debugInfo.style.position = "absolute";
    this.debugInfo.style.bottom = "20px";
    this.debugInfo.style.left = "20px";
    this.debugInfo.style.color = "#00FFFF";
    this.debugInfo.style.fontFamily = "Arial, sans-serif";
    this.debugInfo.style.fontSize = "14px";
    this.debugInfo.style.opacity = "0.8";
    this.debugInfo.style.zIndex = "1"; // Ensure debug info is above the pulse layers
    this.debugInfo.textContent = this.config.debugInfo;

    // Append spinner, progress bar, and debug info to the overlay
    this.overlay.appendChild(this.spinner);
    this.overlay.appendChild(this.progressContainer);
    if (this.config.debug) {
      this.overlay.appendChild(this.debugInfo);
    }

    // Append the overlay to the body
    document.body.appendChild(this.overlay);

    // Fade in the overlay
    setTimeout(() => {
      this.overlay.style.opacity = "1";
    }, 10);

    // Add animation keyframes for the spinner and pulse effects
    this._addKeyframes();
  },

  // Create the gradient background
  _createGradient: function () {
    const gradient = `linear-gradient(135deg, ${this.config.gradientColors.join(", ")})`;
    return gradient;
  },

  // Add CSS keyframes for the spinner and pulse animations
  _addKeyframes: function () {
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            @keyframes pulse-1 {
                0% { opacity: 0.2; }
                50% { opacity: 0.1; }
                100% { opacity: 0.2; }
            }
            @keyframes pulse-2 {
                0% { opacity: 0.2; }
                50% { opacity: 0.3; }
                100% { opacity: 0.2; }
            }
            @keyframes pulse-3 {
                0% { opacity: 0.2; }
                50% { opacity: 0.4; }
                100% { opacity: 0.2; }
            }
        `;
    document.head.appendChild(styleSheet);
  },

  // Update debug information
  updateDebugInfo: function (info) {
    if (this.config.debug) {
      this.debugInfo.textContent = info;
    }
  },

  // Update progress
  updateProgress: function (progress) {
    this.config.progress = Math.min(Math.max(progress, 0), 100); // Clamp progress between 0 and 100
    this.progressBar.style.width = `${this.config.progress}%`;
  },

  // Remove the overlay
  remove: function () {
    this.overlay.style.opacity = "0";
    setTimeout(() => {
      document.body.removeChild(this.overlay);
    }, this.config.animationDuration * 1000);
  },

  // Block or unblock the overlay
  setBlockable: function (blockable) {
    this.config.blockable = blockable;
    this.overlay.style.pointerEvents = blockable ? "auto" : "none";
  },
};
