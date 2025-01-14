canvas = document.getElementById("renderCanvas");
engine = new BABYLON.Engine(canvas, true, { stencil: true });

var BoxWorld = function (scene, position, size, viewer, shadowGen) {
  var name = "boxWorld_" + Date.now();
  console.log("creating box world", name);

  const faceUV = [];
  faceUV[0] = new BABYLON.Vector4(0.1, 0.1, 0.9, 0.9);
  faceUV[1] = new BABYLON.Vector4(0.5, 0.5, 0.5, 0.5); // x, z swapped to flip image
  faceUV[2] = new BABYLON.Vector4(0.1, 0.1, 0.9, 0.9);

  const faceColors = [];
  faceColors[0] = new BABYLON.Color4(0.5, 0.5, 0.5, 1);

  var ground = BABYLON.MeshBuilder.CreateCylinder("ground", {
    diameter: size,
    height: 0.2,
    tessellation: 128,
    faceUV: faceUV,
    faceColors: faceColors,
  });

  //ground.rotation.x = Math.PI / 2;
  ground.position.copyFrom(position);
  ground.position.y -= 0.2;

  const pbr = new BABYLON.PBRMaterial("pbr", scene);
  //pbr.albedoColor = new BABYLON.Color3(1.0, 0.766, 0.336);
  pbr.metallic = 0;
  pbr.roughness = 0.8;

  // pbr.clearCoat.isEnabled = true;
  // pbr.clearCoat.intensity = 0.2;

  pbr.albedoTexture = new BABYLON.Texture("textures/table/37_Old table top_DIFF.jpg", scene);
  pbr.bumpTexture = new BABYLON.Texture("textures/table/37_Old table top_NORM.jpg", scene);
  pbr.bumpTexture.level = 2;
  pbr.ambientTexture = new BABYLON.Texture("textures/table/37_Old table top-AO.jpg", scene);

  pbr.reflectanceTexture = new BABYLON.Texture("textures/table/37_Old table top_SPEC.jpg", scene);
  ground.material = pbr;

  const groundShape = new BABYLON.PhysicsShapeCylinder(
    new BABYLON.Vector3(0, -0.1, 0), // starting point of the cylinder segment
    new BABYLON.Vector3(0, 0.1, 0), // ending point of the cylinder segment
    size * 0.5, // radius of the cylinder
    scene // scene of the shape
  );

  //  WorldBuild(ground, groundShape, scene, shadowGen);
  var groundBody = new BABYLON.PhysicsBody(ground, BABYLON.PhysicsMotionType.STATIC, false, scene);
  var groundMaterial = { friction: 0.6, restitution: 0.3 };

  groundShape.material = groundMaterial;
  groundBody.shape = groundShape;
  groundBody.setMassProperties({
    mass: 0,
  });

  ground.receiveShadows = true;
  if (shadowGen) shadowGen.addShadowCaster(ground);

  if (viewer) viewer.showBody(ground.physicsBody);
  return ground;
};

function preparePipeline(scene, camera) {
  var defaultPipeline = new BABYLON.DefaultRenderingPipeline(
    "defaultPipeline", // The name of the pipeline
    true, // Do you want the pipeline to use HDR texture?
    scene, // The scene instance
    [camera] // The list of cameras to be attached to
  );

  // var defaultPipeline = new StandardRenderingPipeline(
  //     "defaultPipeline", // The name of the pipeline
  //     scene,
  //     1.0,null, [camera]
  // // );

  // // Create SSAO and configure all properties (for the example)
  //     var ssaoRatio = {
  //         ssaoRatio: 0.5, // Ratio of the SSAO post-process, in a lower resolution
  //         combineRatio: 1.0 // Ratio of the combine post-process (combines the SSAO and the scene)
  //     };

  //     var ssao = new BABYLON.SSAORenderingPipeline("ssao", scene, ssaoRatio);
  //     ssao.fallOff = 0.000001;
  //     ssao.area = 1;
  //     ssao.radius = 0.0001;
  //     ssao.totalStrength = 1.0;
  //     ssao.base = 0.5;

  //     // Attach camera to the SSAO render pipeline
  //     scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline("ssao", camera);

  // defaultPipeline.imageProcessing.contrast = 1.8;
  // defaultPipeline.imageProcessing.exposure = 0.8;
  defaultPipeline.bloomEnabled = true;
  defaultPipeline.bloomKernel = 100;
  defaultPipeline.bloomWeight = 0.38;

  defaultPipeline.bloomThreshold = 0.85;

  defaultPipeline.chromaticAberrationEnabled = false;
  defaultPipeline.chromaticAberration.aberrationAmount = 10;
  defaultPipeline.imageProcessing.vignetteEnabled = true;

  var curve = new BABYLON.ColorCurves();
  curve.globalHue = 200;
  curve.globalDensity = 80;
  curve.globalSaturation = 80;
  curve.highlightsHue = 20;
  curve.highlightsDensity = 80;
  curve.highlightsSaturation = -80;
  curve.shadowsHue = 2;
  curve.shadowsDensity = 80;
  curve.shadowsSaturation = 40;
  defaultPipeline.imageProcessing.colorCurves = curve;
  //defaultPipeline.depthOfField.focalLength = 150;
  defaultPipeline.fxaaEnabled = true;
  defaultPipeline.samples = 4;
  defaultPipeline.sharpenEnabled = true;

  //   var lensEffect = new BABYLON.LensRenderingPipeline('lens', {
  //     edge_blur: 0.1,
  //     chromatic_aberration: 1.0,
  //     distortion: 0.1,
  //     dof_focus_distance: 1,
  //     dof_aperture: 0.80,			// set this very high for tilt-shift effect
  //     grain_amount: 0.0,
  //     //grain_texture: grain_texture,
  //     dof_pentagon: true,
  //     dof_gain: 0.0,
  //     dof_threshold: 1.0,
  //     dof_darken: 0.25
  // }, scene, 1.0, [camera]);
  // lensEffect._disableEffect

  // camera.onViewMatrixChangedObservable.add(function(c: BABYLON.ArcRotateCamera ) {
  //     lensEffect.setAperture(c.radius*0.06);
  // })

  scene.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("textures/environment.dds", scene);

  // Skybox
  var hdrSkybox = BABYLON.Mesh.CreateBox("hdrSkyBox", 1000.0, scene);
  var hdrSkyboxMaterial = new BABYLON.PBRMaterial("skyBox", scene);
  hdrSkyboxMaterial.backFaceCulling = false;
  hdrSkyboxMaterial.reflectionTexture = scene.environmentTexture.clone();
  hdrSkyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
  hdrSkyboxMaterial.microSurface = 1.0;
  hdrSkyboxMaterial.cameraExposure = 1.0;
  hdrSkyboxMaterial.cameraContrast = 1.6;
  hdrSkyboxMaterial.disableLighting = true;
  hdrSkybox.material = hdrSkyboxMaterial;
  hdrSkybox.infiniteDistance = true;

  // const ssr = new BABYLON.SSRRenderingPipeline(
  //   "ssr", // The name of the pipeline
  //   scene, // The scene to which the pipeline belongs
  //   [scene.activeCamera], // The list of cameras to attach the pipeline to
  //   true, // Whether or not to use the geometry buffer renderer (default: false, use the pre-pass renderer)
  //   BABYLON.Constants.TEXTURETYPE_UNSIGNED_BYTE // The texture type used by the SSR effect (default: TEXTURETYPE_UNSIGNED_BYTE)
  // );
}

var createScene = async function () {
  // This creates a basic Babylon Scene object (non-mesh)
  scene = new BABYLON.Scene(engine);
  scene.useRightHandedSystem = true;

  gizmoManager = new BABYLON.GizmoManager(scene);
  gizmoManager.positionGizmoEnabled = true;
  gizmoManager.attachableMeshes = [];

  //This creates and positions a free camera (non-mesh)
  camera = new BABYLON.UniversalCamera("camera1", new BABYLON.Vector3(0, 1, 3), scene);

  // This targets the camera to scene origin
  camera.setTarget(BABYLON.Vector3.Zero());

  // This attaches the camera to the canvas
  camera.attachControl(canvas, true);
  camera.inertia = 0.5;
  camera.minZ = 0.01;
  camera.inputs.attached.mouse.buttons = [2];

  //camera.inputs.removeMouse();
  camera.inputs.addMouseWheel();

  var mouseWheelHandler = camera.inputs.attached.mousewheel;
  mouseWheelHandler.wheelPrecisionX = mouseWheelHandler.wheelPrecisionY = mouseWheelHandler.wheelPrecisionZ = 0.2;

  camera.checkCollisions = true;
  camera.lowerRadiusLimit = 0.001;

  preparePipeline(scene, camera);

  // // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
  // var light = new BABYLON.HemisphericLight(
  //   "light1",
  //   new BABYLON.Vector3(0, 1, 0),
  //   scene
  // );

  // // Default intensity is 1. Let's dim the light a small amount
  // light.intensity = 0.7;

  // var dirLight = new BABYLON.DirectionalLight(
  //   "dirLight",
  //   new BABYLON.Vector3(0, -1, 1)
  // );
  // dirLight.autoCalcShadowZBounds = true;
  // dirLight.intensity = 0.4;
  // shadowGen = new BABYLON.ShadowGenerator(1024, dirLight);
  // shadowGen.bias = 0.01;
  // shadowGen.usePercentageCloserFiltering = true;

  // initialize plugin
  const havokInstance = await HavokPhysics();
  // pass the engine to the plugin
  const hk = new BABYLON.HavokPlugin(true, havokInstance);
  scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), hk);
  var physicsEngine = scene.getPhysicsEngine();

  var viewer = null; // new BABYLON.Debug.PhysicsViewer(scene);

  await preload();

  bodyRenderingMaterial = new BABYLON.PBRMaterial("default_material", scene);
  bodyRenderingMaterial.albedoColor = new BABYLON.Color3(0.1, 0.3, 1);
  bodyRenderingMaterial.metallic = 0.0;
  bodyRenderingMaterial.roughness = 0.1;
  // bodyRenderingMaterial.ambientColor = new BABYLON.Color3(0.1, 0.1, 0.2);

  // body/shape on box
  var ground = BoxWorld(scene, new BABYLON.Vector3(0, 0, 0), 10, viewer, shadowGen);

  const instance = new Dice(new BABYLON.Vector3(0, 0.6, 0));

  BABYLON.SceneLoader.LoadAssetContainer(
    "models/",
    "stairs_01.glb",
    scene,
    function (
      container //BABYLON.SceneLoader.ImportMesh("", "models/", modelNameAndExtension, pathTracingScene, function (meshes)
    ) {
      // clear out the mesh object and array
      //meshes = container.meshes;
      var mesh = container.meshes[1].clone();
      mesh.createNormals();
      mesh.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5);
      // mesh.material.clearCoat.isEnabled = true;
      // mesh.material.clearCoat.intensity = 1.0;

      mesh.material.metallic = 0.0;
      mesh.material.roughness = 0;

      mesh.material.subSurface.isTranslucencyEnabled = true;
      mesh.material.subSurface.tintColor = BABYLON.Color3.White();

      const instance = new PlateauObject(
        mesh,
        null,
        { friction: 0.6, restitution: 0.3 },
        new BABYLON.Vector3(0, 1.6, 0),
        1
      );

      var box = BABYLON.Mesh.CreateBox("box", 0.3, scene, false, BABYLON.Mesh.DEFAULTSIDE);
      box.material = bodyRenderingMaterial;
      instance.node.addChild(box);
      box.position = new BABYLON.Vector3(0, 0.3, 0);
      instance.updateBoundingInfos();
      // pathTracedMesh = null;
      // containerMeshes = [];
    }
  );

  var ui = new FastUI();
  ui.setup(scene, hk, viewer);

  var french_deck_atlas = new CardAtlas();
  var deck = Deck.BuildFromCardsAtlas("Test Deck", french_deck_atlas, new BABYLON.Vector3(1, 0.4, 0));

  const tstBtn = ui.addBtn("Test", () => {
    tst.setEnabled(true);
  });
  const addDiceBtn = ui.addBtn("Add a dice", () => {
    var target_height = 0.3 + getSceneHeight(scene, new BABYLON.Vector3(0, 10, 0), 0.1, SelectionHandler.selbox.box);
    const newBody = new Dice(new BABYLON.Vector3(0, target_height, 0), Math.random() * 0.2 + 0.1);
  });
  const addCardBtn = ui.addBtn("Add a card", () => {
    var target_height = 0.3 + getSceneHeight(scene, new BABYLON.Vector3(0, 10, 0), 0.1, SelectionHandler.selbox.box);
    const newBody = new Card(
      new BABYLON.Vector3(0, target_height, 0),
      french_deck_atlas,
      Math.floor(Math.random() * french_deck_atlas.nb),
      french_deck_atlas.back
    );
  });

  function getSceneHeight(scene, position, test_radius = 0, avoid = null) {
    const N = 16;
    var max_height = 0;

    var ray = new BABYLON.Ray(position, new BABYLON.Vector3(0, -10000, 0));

    function isDragged(mesh) {
      return mesh.dragged || (mesh.parent ? isDragged(mesh.parent) : true);
      //return mesh.physicsBody && mesh.physicsBody.getMotionType() == BABYLON.PhysicsMotionType.ANIMATED;
    }
    var height_pick_info = scene.pickWithRay((ray = ray), (predicate = (mesh, i) => mesh != avoid && !isDragged(mesh)));

    max_height = height_pick_info.hit ? height_pick_info.pickedPoint.y : 0;

    if (test_radius > 0) {
      for (var a = 0.0; a < Math.PI * 2; a += (Math.PI * 2) / N) {
        var dx = -Math.cos(a) * test_radius;
        var dy = Math.sin(a) * test_radius;
        var ray_start = new BABYLON.Vector3(position.x + dx, position.y, position.z + dy);
        ray = new BABYLON.Ray(ray_start, new BABYLON.Vector3(0, -10000, 0));
        height_pick_info = scene.pickWithRay((ray = ray), (predicate = (mesh, i) => mesh != avoid && !isDragged(mesh)));
        if (height_pick_info.hit && height_pick_info.pickedPoint.y > max_height)
          max_height = height_pick_info.pickedPoint.y;
      }
    }

    return max_height;
  }

  var pickedObject = null;
  var picked_ground_pos = new BABYLON.Vector3();
  var picked_ray_hit_ground = new BABYLON.Vector3();
  var box_selection = false;
  var dir_speed = new BABYLON.Vector3();
  var last_base_hit = new BABYLON.Vector3();
  var last_base_hit_time = performance.now();

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
          case "f":
          case "F":
            var objects = SelectionHandler.getPlateauObjects();
            if (pickedObject && !SelectionHandler.isSelected(pickedObject)) objects.push(pickedObject);
            for (var o of objects) o.flip();

            break;
        }
        if (pickedObject) pickedObject.onKeyDown(kbInfo.event.key);
        else if (SelectionHandler.hoveredObject) SelectionHandler.hoveredObject.onKeyDown(kbInfo.event.key);
        break;
      case BABYLON.KeyboardEventTypes.KEYUP:
        switch (kbInfo.event.key) {
          case "Control":
            controlKeyDown = false;
            break;
          case "I":
          case "i":
            if (scene.debugLayer.IsVisible) scene.debugLayer.hide();
            else
              scene.debugLayer.show({
                embedMode: false,
              });
            break;
        }
        if (pickedObject) pickedObject.onKeyUp(kbInfo.event.key);
        else if (SelectionHandler.hoveredObject) SelectionHandler.hoveredObject.onKeyUp(kbInfo.event.key);
        break;
    }
  });

  function updateDraggedNodeHeight(obj) {
    var target_height =
      0.3 +
      getSceneHeight(scene, obj.node.position, 0.1, obj.node) +
      obj.node.getBoundingInfo().boundingBox.extendSizeWorld.y;

    obj.updateAnimationModeTarget({ targets: obj.node.position, y: target_height }, obj.node.position.y, target_height);
  }

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
          SelectionHandler.selbox.setInitPoint(pointerInfo.pickInfo.pickedPoint);
          //camera.detachControl(canvas);
          box_selection = true;
        } else if (pointerInfo.pickInfo.pickedMesh != ground) {
          MouseSpeed.reset();

          var po = PlateauObject.GetTopMost(pointerInfo.pickInfo.pickedMesh);
          if (!po || !po.node || !po.body || !po.pickable) {
            pickedObject = null;
            break;
          }
          pickedObject = po;
          SelectionHandler.updateHover(null);

          if (controlKeyDown) {
            SelectionHandler.toggleSelection(pickedObject);
            break;
          } else {
            if (!SelectionHandler.isSelected(pickedObject)) SelectionHandler.removeAll();
          }

          picked_ground_pos.copyFrom(pickedObject.node.absolutePosition);
          picked_ray_hit_ground.copyFrom(
            pointerInfo.pickInfo.ray.intersectsMesh(ground, (onlyBoundingInfo = true)).pickedPoint
          );

          var objects = SelectionHandler.getPlateauObjects();
          if (!SelectionHandler.isSelected(pickedObject)) objects.push(pickedObject);
          for (var o of objects) {
            o.node.dragged = true;
            o.startAnimationMode();
            o.onPickup();
            updateDraggedNodeHeight(o);
          }

          camera.inputs.remove(mouseWheelHandler);
        }
        break;
      case BABYLON.PointerEventTypes.POINTERUP:
        if (pointerInfo.event.button == 1 && panning) panning = false;
        if (pointerInfo.event.button != 0) break;

        if (box_selection) {
          box_selection = false;
          SelectionHandler.selbox.setVisiblity(false);
        } else if (pickedObject) {
          dir_speed = dir_speed.normalize();

          var objects = SelectionHandler.getPlateauObjects();
          if (!SelectionHandler.isSelected(pickedObject)) objects.push(pickedObject);
          for (var o of objects) {
            o.node.dragged = false;
            var pos = new BABYLON.Vector3();
            pos.copyFrom(o.node.absolutePosition);
            pos.y += 0.03; // slightly up to induce some moment (angular velocity)
            o.stopAnimationMode();
            o.onRelease();

            if (o.body) {
              var power = o.body.getMassProperties().mass * 1.5 * MouseSpeed.value;
              var forceVector = new BABYLON.Vector3();
              forceVector.copyFrom(dir_speed);
              forceVector.x *= power;
              forceVector.z *= power;
              o.body.applyForce(forceVector, pos);
            }
          }
          pickedObject = null;
          camera.inputs.add(mouseWheelHandler);
        }
        break;
      case BABYLON.PointerEventTypes.POINTERMOVE:
        if (panning) {
          const delta = 0.01; // Amount of change in movement
          let x = delta * pointerInfo.event.movementX;
          let y = -delta * pointerInfo.event.movementY;
          var dx = camera.getDirection(new BABYLON.Vector3(1, 0, 0));
          var dy = camera.getDirection(new BABYLON.Vector3(0, 1, 0));
          dx = dx.multiplyByFloats(x, x, x);
          dy = dy.multiplyByFloats(y, y, y);
          camera.position.addInPlace(dx);
          camera.position.addInPlace(dy);
        }

        MouseSpeed.update(pointerInfo.event);
        if (box_selection) {
          SelectionHandler.selbox.setSecondPoint(
            pointerInfo.pickInfo.ray.intersectsMesh(ground, (onlyBoundingInfo = true)).pickedPoint
          );
          var sel_bb = SelectionHandler.selbox.box.getBoundingInfo().boundingBox;

          for (var m of scene.meshes) {
            var po = PlateauObject.GetTopMost(m);
            if (!po) continue;
            var m_bb = po.getBoundingInfos().boundingBox;

            if (BABYLON.BoundingBox.Intersects(sel_bb, m_bb, true)) {
              SelectionHandler.addPlateauObject(po);
            } else if (!controlKeyDown) SelectionHandler.removePlateauObject(po);
          }
        } else if (pickedObject) {
          var base_hit = pointerInfo.pickInfo.ray.intersectsMesh(ground, (onlyBoundingInfo = true));
          if (base_hit.hit) {
            let dx =
              picked_ground_pos.x + base_hit.pickedPoint.x - picked_ray_hit_ground.x - pickedObject.node.position.x;
            let dz =
              picked_ground_pos.z + base_hit.pickedPoint.z - picked_ray_hit_ground.z - pickedObject.node.position.z;

            var objects = SelectionHandler.getPlateauObjects();
            if (!SelectionHandler.isSelected(pickedObject)) objects.push(pickedObject);
            for (var o of objects) {
              o.node.position.x += dx;
              o.node.position.z += dz;
              updateDraggedNodeHeight(o);
            }

            var elapsed = performance.now() - last_base_hit_time;
            dir_speed.x = (base_hit.pickedPoint.x - last_base_hit.x) / elapsed;
            dir_speed.z = (base_hit.pickedPoint.z - last_base_hit.z) / elapsed;
            last_base_hit.copyFrom(base_hit.pickedPoint);
            last_base_hit_time = performance.now();
          }
        } else {
          var pi = scene.pickWithRay(pointerInfo.pickInfo.ray, (m) => PlateauObject.GetTopMost(m) != null);
          var po = PlateauObject.GetTopMost(pi.pickedMesh);
          SelectionHandler.updateHover(po);
        }
        break;
      case BABYLON.PointerEventTypes.POINTERWHEEL:
        if (pickedObject) {
          const angle = pointerInfo.event.deltaY > 0 ? rotationIncrement : -rotationIncrement;

          var world_H_axisRot = new XTransform(pickedObject.node.absolutePosition);
          var axisRot_H_world = world_H_axisRot.inversed();
          var /* The code seems to be a comment in JavaScript. The text "picked_h_new" and " */
            axisRot_H_newAxisRot = new XTransform(
              new BABYLON.Vector3.Zero(),
              BABYLON.Quaternion.FromEulerAngles(0, BABYLON.Tools.ToRadians(angle), 0)
            );
          var objects = SelectionHandler.getPlateauObjects();
          if (!SelectionHandler.isSelected(pickedObject)) objects.push(pickedObject);
          for (var o of objects) {
            var world_H_obj = XTransform.FromNodeWorld(o.node);
            var axisRot_H_obj = axisRot_H_world.multiply(world_H_obj);
            var world_h_objnew = world_H_axisRot.multiply(axisRot_H_newAxisRot).multiply(axisRot_H_obj);
            world_h_objnew.applyToNodeWorld(o.node);
          }
        }
        break;
    }
  });

  SelectionHandler.init(scene);
  SelectionHandler.hl.addExcludedMesh(ground);

  SelectionHandler.hl.addExcludedMesh(scene.getNodeById("hdrSkyBox"));

  var tile = createTileTest(0.4, 0.4, 0.02, 0.005, 4, 0.01, 3);
  var mat = new BABYLON.PBRMaterial("cardBoard", scene);
  mat.albedoTexture = new BABYLON.Texture("textures/tiles/hand_painted_tiles.png", scene, true, false);
  mat.albedoColor = new BABYLON.Color3(0.8, 0.8, 0.8);
  mat.metallic = 0.0;
  mat.roughness = 0.13;
  tile.material = mat;
  new PlateauObject(tile);
  tile.position = new BABYLON.Vector3(0, 0.6, 0);
  return scene;
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
