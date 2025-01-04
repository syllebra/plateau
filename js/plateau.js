canvas = document.getElementById("renderCanvas");
engine = new BABYLON.Engine(canvas, true, { stencil: true });

var BoxWorld = function (scene, position, size, viewer, shadowGen) {
  var name = "boxWorld_" + Date.now();
  console.log("creating box world", name);
  var ground = BABYLON.Mesh.CreateGround(name, size, size, 2, scene);
  ground.position = position;
  var groundShape = new BABYLON.PhysicsShapeBox(
    new BABYLON.Vector3(0, 0, 0),
    BABYLON.Quaternion.Identity(),
    new BABYLON.Vector3(size, 0.1, size),
    scene
  );
  //  WorldBuild(ground, groundShape, scene, shadowGen);
  var groundBody = new BABYLON.PhysicsBody(
    ground,
    BABYLON.PhysicsMotionType.STATIC,
    false,
    scene
  );
  var groundMaterial = { friction: 0.6, restitution: 0.3 };

  groundShape.material = groundMaterial;
  groundBody.shape = groundShape;
  groundBody.setMassProperties({
    mass: 0,
  });

  ground.receiveShadows = true;
  shadowGen.addShadowCaster(ground);

  if (viewer) viewer.showBody(ground.physicsBody);
  return ground;
};

var createScene = async function () {
  // This creates a basic Babylon Scene object (non-mesh)
  scene = new BABYLON.Scene(engine);
  scene.useRightHandedSystem = true;

  //This creates and positions a free camera (non-mesh)
  camera = new BABYLON.UniversalCamera(
    "camera1",
    new BABYLON.Vector3(0, 1, -3),
    scene
  );

  // This targets the camera to scene origin
  camera.setTarget(BABYLON.Vector3.Zero());

  // This attaches the camera to the canvas
  camera.attachControl(canvas, true);
  camera.inertia = 0.5;
  camera.minZ = 0.01;
  camera.inputs.attached.mouse.buttons = [2];
  console.log(camera.inputs.attached.mouse);

  //camera.inputs.removeMouse();
  camera.inputs.addMouseWheel();

  camera.inputs.attached.mousewheel.wheelPrecisionX =
    camera.inputs.attached.mousewheel.wheelPrecisionY =
    camera.inputs.attached.mousewheel.wheelPrecisionZ =
      0.2;

  camera.checkCollisions = true;
  camera.lowerRadiusLimit = 0.001;

  console.log(camera.inputs.attached.keyboard);

  // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
  var light = new BABYLON.HemisphericLight(
    "light1",
    new BABYLON.Vector3(0, 1, 0),
    scene
  );

  // Default intensity is 1. Let's dim the light a small amount
  light.intensity = 0.7;

  var dirLight = new BABYLON.DirectionalLight(
    "dirLight",
    new BABYLON.Vector3(0, -1, 1)
  );
  dirLight.autoCalcShadowZBounds = true;
  dirLight.intensity = 0.4;
  shadowGen = new BABYLON.ShadowGenerator(1024, dirLight);
  shadowGen.bias = 0.01;
  shadowGen.usePercentageCloserFiltering = true;

  // initialize plugin
  const havokInstance = await HavokPhysics();
  // pass the engine to the plugin
  const hk = new BABYLON.HavokPlugin(true, havokInstance);
  scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), hk);
  var physicsEngine = scene.getPhysicsEngine();
  console.log(physicsEngine);

  //physicsEngine.setTimeStep((1/100))// * scene.getAnimationRatio())

  var viewer = null; // new BABYLON.Debug.PhysicsViewer(scene);

  await preload();

  physicsMaterial = { friction: 0.6, restitution: 0.3 };
  bodyRenderingMaterial = new BABYLON.StandardMaterial(
    "default_material",
    scene
  );
  bodyRenderingMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.3, 1);
  bodyRenderingMaterial.ambientColor = new BABYLON.Color3(0.1, 0.1, 0.2);

  // body/shape on box
  var ground = BoxWorld(
    scene,
    new BABYLON.Vector3(0, 0, 0),
    40,
    viewer,
    shadowGen
  );

  const instance = new Dice(new BABYLON.Vector3(0, 0.6, 0));

  var ui = new FastUI();
  ui.setup(scene, hk, viewer);

  const tstBtn = ui.addBtn("Test", () => {
    tst.setEnabled(true);
  });
  const addDiceBtn = ui.addBtn("Add a dice", () => {
    var target_height =
      0.3 +
      getSceneHeight(
        scene,
        new BABYLON.Vector3(0, 10, 0),
        0.1,
        SelectionHandler.selbox.box
      );
    console.log(target_height);
    const newBody = new Dice(
      new BABYLON.Vector3(0, target_height, 0),
      Math.random() * 0.2 + 0.1
    );
  });
  const addCardBtn = ui.addBtn("Add a card", () => {
    var target_height =
      0.3 +
      getSceneHeight(
        scene,
        new BABYLON.Vector3(0, 10, 0),
        0.1,
        SelectionHandler.selbox.box
      );
    console.log(target_height);
    const newBody = new Card(new BABYLON.Vector3(0, target_height, 0));
  });

  function getSceneHeight(scene, position, test_radius = 0, avoid = null) {
    const N = 16;
    var max_height = 0;

    var ray = new BABYLON.Ray(position, new BABYLON.Vector3(0, -10000, 0));
    var height_pick_info = scene.pickWithRay(
      (ray = ray),
      (predicate = (mesh, i) =>
        mesh != avoid && mesh != SelectionHandler.selbox.box)
    );

    max_height = height_pick_info.hit ? height_pick_info.pickedPoint.y : 0;

    if (test_radius > 0) {
      for (var a = 0.0; a < Math.PI * 2; a += (Math.PI * 2) / N) {
        var dx = -Math.cos(a) * test_radius;
        var dy = Math.sin(a) * test_radius;
        var ray_start = new BABYLON.Vector3(
          position.x + dx,
          position.y,
          position.z + dy
        );
        ray = new BABYLON.Ray(ray_start, new BABYLON.Vector3(0, -10000, 0));
        height_pick_info = scene.pickWithRay(
          (ray = ray),
          (predicate = (mesh, i) => mesh != avoid)
        );
        if (height_pick_info.hit && height_pick_info.pickedPoint.y > max_height)
          max_height = height_pick_info.pickedPoint.y;
      }
    }

    return max_height;
  }

  var timestamp = 0,
    speedMax = 0,
    mouse_speed = 0;

  function updateMouseSpeed(e) {
    var now = Date.now();

    var dt = now - timestamp;
    var dx = e.movementX;
    var dy = e.movementY;

    var distance = Math.sqrt(dx * dx + dy * dy);
    var direction = Math.atan2(dy, dx);

    //speed is zero when mouse was still (dt hold a long pause)
    mouse_speed = parseInt((distance / dt) * 100);
    var speedX = Math.round((dx / dt) * 100);
    var speedY = Math.round((dy / dt) * 100);

    //reset if speed is zero, otherwise set max of any speed
    speedMax = !mouse_speed
      ? 0
      : mouse_speed > speedMax
      ? mouse_speed
      : speedMax;
    //console.log("max:",speedMax)
    timestamp = now;
  }

  var picked = null;
  var picked_ground_pos = new BABYLON.Vector3();
  var picked_ray_hit_ground = new BABYLON.Vector3();
  var box_selection = false;
  var dir_speed = new BABYLON.Vector3();
  var last_base_hit = new BABYLON.Vector3();
  var last_base_hit_time = performance.now();
  var current_anim = null;

  function changeAnimTarget(obj, height = 0.3) {
    var phys_step = scene.getPhysicsEngine().getTimeStep();
    const ySpeed = 2.0;
    var nbf = ((height - obj.position.y) * 1000) / ySpeed;

    if (current_anim && current_anim.target == obj) {
      current_anim.getAnimations()[0].currentValue = height;
      current_anim.getAnimations()[0].duration = nbf;
      current_anim.getAnimations()[0].restart();
      //current_anim.animations[0]()[0]._keys[1].value = height;
      return;
    }

    current_anim = anime({
      targets: obj.position,
      y: height,
      easing: "linear", //'easeInElastic(1, .6)',
      //round: 1,
      duration: nbf,
      //autoplay: false
      // update: function() {
      //   console.log(JSON.stringify(obj.position));
      // }
    });
    //current_anim.play()
    current_anim.complete = function () {
      current_anim = null;
    };
  }

  let controlKeyDown = false;

  // Handle keyboard events
  // UP/DOWN arrows with SHIFT key modifier
  scene.onKeyboardObservable.add((kbInfo) => {
    switch (kbInfo.type) {
      case BABYLON.KeyboardEventTypes.KEYDOWN:
        //        console.log("Key down",kbInfo.event.key)
        switch (kbInfo.event.key) {
          case "Control":
            controlKeyDown = true;
            break;
        }
        break;
      case BABYLON.KeyboardEventTypes.KEYUP:
        switch (kbInfo.event.key) {
          case "Control":
            controlKeyDown = false;
            break;
        }
        break;
    }
  });

  var panning = false;
  scene.onPointerObservable.add((pointerInfo) => {
    switch (pointerInfo.type) {
      case BABYLON.PointerEventTypes.POINTERDOWN:
        if (pointerInfo.event.button == 1) panning = true;
        if (pointerInfo.event.button != 0) break;
        if (!pointerInfo.pickInfo.hit) break;
        if (pointerInfo.pickInfo.pickedMesh == ground) {
          if (!controlKeyDown) SelectionHandler.removeAll();
          SelectionHandler.selbox.setVisiblity(true);
          SelectionHandler.selbox.setInitPoint(
            pointerInfo.pickInfo.pickedPoint
          );
          //camera.detachControl(canvas);
          box_selection = true;
        } else if (pointerInfo.pickInfo.pickedMesh != ground) {
          speedMax = 0;

          if (!pointerInfo.pickInfo.pickedMesh.physicsBody) break;

          if (controlKeyDown) {
            SelectionHandler.toggleSelection(pointerInfo.pickInfo.pickedMesh);
            break;
          } else {
            if (!SelectionHandler.isSelected(pointerInfo.pickInfo.pickedMesh))
              SelectionHandler.removeAll();
          }

          picked = pointerInfo.pickInfo.pickedMesh;

          picked_ground_pos.copyFrom(picked.position);
          picked_ray_hit_ground.copyFrom(
            pointerInfo.pickInfo.ray.intersectsMesh(
              ground,
              (onlyBoundingInfo = true)
            ).pickedPoint
          );

          console.log(
            "picked",
            pointerInfo.pickInfo,
            picked_ground_pos,
            picked_ray_hit_ground
          );

          //camera.detachControl(canvas);
          picked.physicsBody.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);
          picked.physicsBody.disablePreStep = false;
          console.log(picked.physicsBody);
          picked.physicsBody.setLinearVelocity(new BABYLON.Vector3(0, 0, 0));
          picked.physicsBody.setAngularVelocity(new BABYLON.Vector3(0, 0, 0));
          picked.physicsBody.checkCollisions = true;
          var target_height =
            0.3 + getSceneHeight(scene, picked.position, 0.1, picked);
          //picked.position.y = target_height;
          changeAnimTarget(picked, target_height);
        }
        break;
      case BABYLON.PointerEventTypes.POINTERUP:
        if (pointerInfo.event.button == 1 && panning) panning = false;
        if (pointerInfo.event.button != 0) break;

        if (box_selection) {
          //SelectionHandler.selbox.setSecondPoint(pointerInfo.pickInfo.ray.intersectsMesh(ground, onlyBoundingInfo = true).pickedPoint);
          box_selection = false;
          //camera.attachControl(canvas, true);
          SelectionHandler.selbox.setVisiblity(false);
        } else if (picked) {
          picked.physicsBody.disablePreStep = true;
          picked.physicsBody.setMotionType(BABYLON.PhysicsMotionType.DYNAMIC);
          //picked.physicsBody.applyForce(dir_speed, picked.position);
          dir_speed = dir_speed.normalize();
          var power =
            picked.physicsBody.getMassProperties().mass * 1.5 * mouse_speed;
          dir_speed.x *= power;
          dir_speed.z *= power;
          var pos = picked.position;
          pos.y += 0.03; // slightly up to induce some moment (angular velocity)
          picked.physicsBody.applyForce(dir_speed, pos);
          //camera.attachControl(canvas, true);

          picked = null;
        }
        break;
      case BABYLON.PointerEventTypes.POINTERMOVE:
        if (panning) {
          const delta = 0.01; // Amount of change in movement
          let x = delta * pointerInfo.event.movementX;
          let y = -delta * pointerInfo.event.movementY;
          camera.position.addInPlace(new BABYLON.Vector3(x, y, 0));
        }

        updateMouseSpeed(pointerInfo.event);
        if (box_selection) {
          SelectionHandler.selbox.setSecondPoint(
            pointerInfo.pickInfo.ray.intersectsMesh(
              ground,
              (onlyBoundingInfo = true)
            ).pickedPoint
          );
          var sel_bb =
            SelectionHandler.selbox.box.getBoundingInfo().boundingBox;

          for (var m of scene.meshes) {
            if (m == SelectionHandler.selbox.box || m == ground) continue;
            var m_bb = m.getBoundingInfo().boundingBox;
            //let max = childMeshes[0].getBoundingInfo().boundingBox.maximumWorld;)
            if (BABYLON.BoundingBox.Intersects(sel_bb, m_bb)) {
              SelectionHandler.addMesh(m);
            } else if (!controlKeyDown) SelectionHandler.removeMesh(m);
          }
        } else if (picked) {
          var base_hit = pointerInfo.pickInfo.ray.intersectsMesh(
            ground,
            (onlyBoundingInfo = true)
          );
          if (base_hit.hit) {
            var target_height =
              0.3 + getSceneHeight(scene, picked.position, 0.1, picked);
            //picked.position.y = target_height;
            changeAnimTarget(picked, target_height);

            // if(anim)
            //   anim.stop()
            // console.log("pickedPoint",base_hit.pickedPoint)
            // console.log("picked_ground_pos",picked_ground_pos)
            // console.log("picked_ray_hit_ground",picked_ray_hit_ground)
            // BABYLON.Animation.CreateAndStartAnimation("pickup_move_x", picked, "position.x", phys_step * 2, phys_step * 0.1, picked.position.x, base_hit.pickedPoint.x, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            // BABYLON.Animation.CreateAndStartAnimation("pickup_move_z", picked, "position.z", phys_step * 2, phys_step * 0.1, picked.position.z, base_hit.pickedPoint.z, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            picked.position.x =
              picked_ground_pos.x +
              base_hit.pickedPoint.x -
              picked_ray_hit_ground.x;
            picked.position.z =
              picked_ground_pos.z +
              base_hit.pickedPoint.z -
              picked_ray_hit_ground.z;
            var elapsed = performance.now() - last_base_hit_time;
            dir_speed.x = (base_hit.pickedPoint.x - last_base_hit.x) / elapsed;
            dir_speed.z = (base_hit.pickedPoint.z - last_base_hit.z) / elapsed;
            last_base_hit.copyFrom(base_hit.pickedPoint);
            last_base_hit_time = performance.now();
          }
        }
        break;
    }
  });

  // scene.onBeforePhysicsObservable.add( (e) => {
  //   if(current_anim)
  //   {
  //     current_anim.tick(e.deltaTime);
  //     //console.log(current_anim.currentTime)
  //   }
  // });

  // console.log(BABYLON.Effect.ShadersStore);
  // console.log(BABYLON.Effect.ShadersStore["highlightsPixelShader"]);

  //   var alpha = 0;
  //   scene.registerBeforeRender(() => {
  //   alpha += 0.06;

  //   hl.blurHorizontalSize = 0.4 + Math.cos(alpha) * 0.6;// + 0.6;
  //   hl.blurVerticalSize = 0.4 + Math.sin(alpha) * 0.6;// + 0.6;
  // });

  SelectionHandler.init(scene);

  return scene;
};

const AddBtn = function (text, panel, clickFn) {
  const addBtn = BABYLON.GUI.Button.CreateSimpleButton(
    "btn_" + text.slice(0, 5),
    text
  );
  panel.addControl(addBtn);
  addBtn.width = "100%";
  addBtn.height = "40px";
  addBtn.background = "green";
  addBtn.color = "white";
  addBtn.onPointerClickObservable.add(clickFn);
  return addBtn;
};

var AddToggle = function (toggleText, panel) {
  var toggleViewLine = new BABYLON.GUI.StackPanel("toggleViewLine");
  toggleViewLine.isVertical = false;
  toggleViewLine.horizontalAlignment =
    BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  toggleViewLine.spacing = 5;
  toggleViewLine.resizeToFit = true;
  toggleViewLine.height = "25px";
  panel.addControl(toggleViewLine);
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
};

createScene().then((scene) => {
  engine.runRenderLoop(function () {
    if (scene) {
      scene.render();
      // // now for the heavy lifter, the bulk of the frame time
      // eRenderer.render(pathTracingEffect, pathTracingRenderTarget);
      // // then simply copy(store) what the pathTracer just calculated - should take no time at all
      // eRenderer.render(screenCopyEffect, screenCopyRenderTarget);
      // // finally take the accumulated pathTracingRenderTarget buffer and average by numberOfSamples taken, then apply Reinhard tonemapping (brings image into friendly 0.0-1.0 rgb color float range),
      // // and lastly raise to the power of (0.4545), in order to make gamma correction (gives more brightness range where it counts).  This last step should also take minimal time
      // eRenderer.render(screenOutputEffect, null); // null, because we don't feed this non-linear image-processed output back into the pathTracing accumulation buffer as it would 'pollute' the pathtracing unbounded linear color space

      // scene.debugLayer.show({
      //   embedMode: false,
      // });

      StatsUI.update();
    }

    // window.addEventListener('blur', function(){
    //   scene.enablePhysics = false;
    //   console.log('blur',scene.getPhysicsEngine());
    // }, false);

    // window.addEventListener('focus', function(){
    //   scene.enablePhysics = true;
    //   console.log('focus',scene.getPhysicsEngine());
    // }, false);

    // document.addEventListener("visibilitychange", function (evt) {
    //   if (evt.visibilityState === "hidden") { console.log(scene.getPhysicsEngine()); }
    //   else if (evt.visibilityState === "visible") { console.log(scene.getPhysicsEngine()); }
    // });
  });
});
// Resize
window.addEventListener("resize", function () {
  engine.resize();
});
