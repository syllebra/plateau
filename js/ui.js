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
    var advancedTexture =
      BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

    this.panel = new BABYLON.GUI.StackPanel();
    this.panel.spacing = 5;
    advancedTexture.addControl(this.panel);
    this.panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    this.panel.horizontalAlignment =
      BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.panel.paddingLeftInPixels = 10;
    this.panel.paddingTopInPixels = 10;
    this.panel.width = "30%";
    this.panel.fontSize = "10";
  }

  addBtn(text, clickFn) {
    const addBtn = BABYLON.GUI.Button.CreateSimpleButton(
      "btn_" + text.slice(0, 5),
      text
    );
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
    toggleViewLine.horizontalAlignment =
      BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
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
    this.speedMax = !this.mouse_speed
      ? 0
      : this.mouse_speed > this.speedMax
      ? this.mouse_speed
      : this.speedMax;
    //console.log("max:",speedMax)
    this.timestamp = now;
  }
  static reset() {
    this.speedMax = 0;
  }

}

class FrostedTooltip {
  constructor(cardId, container, options = {}) {
    this.card = document.getElementById(cardId);
    this.container = container; //document.getElementById(containerId);
    this.defaultOptions = {
      title: "Default Title",
      description: "This is the default description for the frosted card tooltip.",
      xOffset: 15,
      yOffset: 15,
    };
    this.options = { ...this.defaultOptions, ...options };

    // Apply default content
    this.setTitle(this.options.title);
    this.setDescription(this.options.description);
  }

  setTitle(title) {
    this.options.title = title;
    this.card.querySelector("#tooltip-title").textContent = title;
  }

  setDescription(description) {
    this.options.description = description;
    this.card.querySelector("#tooltip-description").textContent = description;
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
    this.card.classList.add("visible");
  }

  hideTooltip() {
    // Remove visible class to trigger disappearance animations
    this.card.classList.remove("visible");
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
