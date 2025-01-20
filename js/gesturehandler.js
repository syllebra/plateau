class GestureHandler {
  constructor(targetElement) {
    if (!targetElement) {
      throw new Error("Target element is required");
    }
    if (!("ontouchstart" in window)) {
      console.warn("Touch events not supported in this environment");
    }

    this.target = targetElement;
    this.touches = new Map();
    this.isGestureActive = false;
    this.initialDistance = null;
    this.initialCenter = null;

    // Bind event handlers
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);

    // Register event listeners
    this.target.addEventListener("touchstart", this.handleTouchStart);
    this.target.addEventListener("touchmove", this.handleTouchMove);
    this.target.addEventListener("touchend", this.handleTouchEnd);
    this.target.addEventListener("touchcancel", this.handleTouchEnd);

    // Callback storage
    this.gestureStartCallbacks = [];
    this.gestureUpdateCallbacks = [];
    this.gestureEndCallbacks = [];
  }

  handleTouchStart(event) {
    // Update touch points
    for (let touch of event.touches) {
      this.touches.set(touch.identifier, {
        x: touch.clientX,
        y: touch.clientY,
      });
    }

    // Check if we have enough touches for a gesture
    if (this.touches.size >= 2 && !this.isGestureActive) {
      this.isGestureActive = true;
      this.initialDistance = this.calculateDistance();
      this.initialCenter = this.calculateCenter();
      this.gestureType = null;
      this.moveCount = 0;
      this.eventBuffer = [];
    }
  }

  handleTouchMove(event) {
    if (!this.isGestureActive) return;

    // Update touch positions
    for (let touch of event.touches) {
      if (this.touches.has(touch.identifier)) {
        this.touches.set(touch.identifier, {
          x: touch.clientX,
          y: touch.clientY,
        });
      }
    }

    // Buffer events until gesture type is determined
    if (!this.gestureType) {
      this.moveCount++;

      // Check if we have enough movement to determine gesture type
      if (this.moveCount >= 5) {
        // Increased buffer size
        const currentDistance = this.calculateDistance();
        const distanceChange = Math.abs(currentDistance - this.initialDistance);
        const centerChange = Math.hypot(
          this.calculateCenter().x - this.initialCenter.x,
          this.calculateCenter().y - this.initialCenter.y
        );

        // Calculate scale-based thresholds
        const currentScale = currentDistance / this.initialDistance;
        const scaleChange = Math.abs(currentScale - 1);
        const minScaleChange = 0.1; // Minimum scale change to consider pinch
        const dragThreshold = 8; // Pixel threshold for drag

        // Calculate relative movement ratios
        const pinchRatio = scaleChange / (centerChange / this.initialDistance || 1);
        const dragRatio = centerChange / (scaleChange * this.initialDistance || 1);

        // Enhanced gesture type detection using scale
        // For multiple touches, require stronger pinch evidence
        const pinchStrength = this.touches.size > 2 ? 1.5 : 1.2;
        if (
          scaleChange > minScaleChange &&
          pinchRatio > pinchStrength // Favor pinch when scale change dominates
        ) {
          this.gestureType = "pinch";
          console.log("Pinch detected:", {
            initialDistance: this.initialDistance,
            currentDistance,
            scale: currentScale,
            scaleChange,
            minScaleChange,
            centerChange,
            dragThreshold,
            pinchRatio,
            dragRatio,
          });
        } else {
          this.gestureType = "drag";
          console.log("Drag detected:", {
            initialDistance: this.initialDistance,
            currentDistance,
            scale: currentScale,
            scaleChange,
            minScaleChange,
            centerChange,
            dragThreshold,
            pinchRatio,
            dragRatio,
          });
        }

        // Trigger gesture start with accumulated data
        const startData = this.getGestureData("start");
        this.gestureStartCallbacks.forEach((cb) => cb(startData));

        // Process buffered events
        this.eventBuffer.forEach((bufferedEvent) => {
          const updateData = this.getGestureData("update");
          this.gestureUpdateCallbacks.forEach((cb) => cb(updateData));
        });
        this.eventBuffer = [];
      } else {
        // Buffer the event
        this.eventBuffer.push(event);
        return;
      }
    }

    // Trigger gesture update callbacks
    const data = this.getGestureData("update");
    this.gestureUpdateCallbacks.forEach((cb) => cb(data));
  }

  handleTouchEnd(event) {
    // Remove ended touches
    for (let touch of event.changedTouches) {
      this.touches.delete(touch.identifier);
    }

    // If we dropped below 2 touches, end the gesture
    if (this.touches.size < 2 && this.isGestureActive) {
      this.isGestureActive = false;

      // Trigger gesture end callbacks
      const data = this.getGestureData("end");
      this.gestureEndCallbacks.forEach((cb) => cb(data));

      // Reset state
      this.initialDistance = null;
      this.initialCenter = null;
    }
  }

  calculateDistance() {
    const touches = Array.from(this.touches.values());
    if (touches.length < 2) return 0;

    // Calculate average distance between all touch points
    let totalDistance = 0;
    let count = 0;

    for (let i = 0; i < touches.length; i++) {
      for (let j = i + 1; j < touches.length; j++) {
        const dx = touches[j].x - touches[i].x;
        const dy = touches[j].y - touches[i].y;
        totalDistance += Math.sqrt(dx * dx + dy * dy);
        count++;
      }
    }

    return totalDistance / count;
  }

  calculateCenter() {
    const touches = Array.from(this.touches.values());
    if (touches.length === 0) return { x: 0, y: 0 };

    const sum = touches.reduce(
      (acc, touch) => {
        return {
          x: acc.x + touch.x,
          y: acc.y + touch.y,
        };
      },
      { x: 0, y: 0 }
    );

    return {
      x: sum.x / touches.length,
      y: sum.y / touches.length,
    };
  }

  getGestureData(type) {
    const currentDistance = this.calculateDistance();
    const currentCenter = this.calculateCenter();
    // Adjust threshold based on number of touches
    const touchCount = this.touches.size;
    const distanceThreshold = this.initialDistance * (touchCount > 2 ? 0.08 : 0.05); // 8% for >2 touches, 5% for 2 touches

    // Determine gesture type on start
    if (type === "start") {
      this.gestureType = Math.abs(currentDistance - this.initialDistance) > distanceThreshold ? "pinch" : "drag";
    }

    return {
      type: this.gestureType,
      center: currentCenter,
      delta: {
        x: currentCenter.x - (this.initialCenter?.x || 0),
        y: currentCenter.y - (this.initialCenter?.y || 0),
      },
      scale: currentDistance / (this.initialDistance || 1),
    };
  }

  onGestureStart(callback) {
    if (typeof callback === "function") {
      this.gestureStartCallbacks.push(callback);
    }
    return this;
  }

  onGestureUpdate(callback) {
    if (typeof callback === "function") {
      this.gestureUpdateCallbacks.push(callback);
    }
    return this;
  }

  onGestureEnd(callback) {
    if (typeof callback === "function") {
      this.gestureEndCallbacks.push(callback);
    }
    return this;
  }

  destroy() {
    this.target.removeEventListener("touchstart", this.handleTouchStart);
    this.target.removeEventListener("touchmove", this.handleTouchMove);
    this.target.removeEventListener("touchend", this.handleTouchEnd);
    this.target.removeEventListener("touchcancel", this.handleTouchEnd);

    this.touches.clear();
    this.gestureStartCallbacks = [];
    this.gestureUpdateCallbacks = [];
    this.gestureEndCallbacks = [];
  }
}

// Export for module usage
if (typeof module !== "undefined" && module.exports) {
  module.exports = GestureHandler;
}
