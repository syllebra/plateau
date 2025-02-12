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
  ground.position.y -= 0.1;

  const pbr = new BABYLON.PBRMaterial("pbr", scene);
  //pbr.albedoColor = new BABYLON.Color3(1.0, 0.766, 0.336);
  pbr.metallic = 0;
  pbr.roughness = 0.8;

  // pbr.clearCoat.isEnabled = true;
  // pbr.clearCoat.intensity = 0.2;
  //pbr.albedoColor = new BABYLON.Color3(0.2,0.2,0.2)
  pbr.albedoTexture = new BABYLON.Texture("textures/table/37_Old table top_DIFF.jpg", scene);
  //pbr.albedoTexture = new BABYLON.Texture("https://github.com/Tencent/Hunyuan3D-1/blob/main/assets/teaser.png?raw=true", scene);

  pbr.bumpTexture = new BABYLON.Texture("textures/table/37_Old table top_NORM.jpg", scene);
  pbr.bumpTexture.level = 2;
  pbr.ambientTexture = new BABYLON.Texture("textures/table/37_Old table top-AO.jpg", scene);

  pbr.reflectanceTexture = new BABYLON.Texture("textures/table/37_Old table top_SPEC.jpg", scene);
  pbr.environmentIntensity = 0.5;
  ground.material = pbr;

  const groundShape = new BABYLON.PhysicsShapeCylinder(
    new BABYLON.Vector3(0, -0.1, 0), // starting point of the cylinder segment
    new BABYLON.Vector3(0, 0.1, 0), // ending point of the cylinder segment
    size * 0.5 * 1000, // radius of the cylinder
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
  //if (shadowGen) shadowGen.addShadowCaster(ground);

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

  // var curve = new BABYLON.ColorCurves();
  // curve.globalHue = 200;
  // curve.globalDensity = 80;
  // curve.globalSaturation = 80;
  // curve.highlightsHue = 20;
  // curve.highlightsDensity = 80;
  // curve.highlightsSaturation = -80;
  // curve.shadowsHue = 2;
  // curve.shadowsDensity = 80;
  // curve.shadowsSaturation = 40;
  // defaultPipeline.imageProcessing.colorCurves = curve;
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

  //   scene.environmentTexture = new BABYLON.EquiRectangularCubeTexture(
  //     "https://emergentlandscapes.files.wordpress.com/2012/05/the-witcher-pano_-8.jpg",
  //     scene, 256,false, false
  // );
  //scene.environmentTexture = new BABYLON.HDRCubeTexture("textures/envs/little_paris_eiffel_tower_2k.hdr", scene, 1024, true, false, false, true);
  //scene.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("textures/envs/environment.dds", scene);
  scene.environmentTexture = new BABYLON.HDRCubeTexture(
    "dev/ComfyUI_temp_qplmu_00008_.hdr",
    scene,
    1024,
    true,
    false,
    false,
    true
  );

  //scene.environmentTexture = new BABYLON.CubeTexture("textures/envs/dummy_cubemap.dds", scene)
  //scene.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("textures/envs/cubemap_uncompressed_dx10.dds", scene);

  // // Skybox
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
  //   "ssr", // The name of the pipeli ne
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
  camera.inputs.attached.touch.detachControl();

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

  var dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(0.2, -1, 0.3));
  dirLight.position = new BABYLON.Vector3(0, 12, 0);
  dirLight.autoUpdateExtends = false;
  dirLight.autoCalcShadowZBounds = false;
  //dirLight.shadowFrustumSize = 1;
  dirLight.orthoLeft = -15;
  dirLight.orthoRight = 15;
  dirLight.orthoTop = 15;
  dirLight.orthoBottom = -15;
  dirLight.shadowMinZ = 0;
  dirLight.shadowMaxZ = 15;

  //   //orthoRight / orthoTop / orthoBottom
  //   dirLight.customProjectionMatrixBuilder = function(viewMatrix, renderList) {
  //     return BABYLON.Matrix.PerspectiveFovLH(Math.PI*0.25, 1.0, camera.minZ, 1.0);
  // }
  dirLight.intensity = 2;
  shadowGen = new BABYLON.ShadowGenerator(1024, dirLight);
  shadowGen.bias = 0.015;
  shadowGen.usePercentageCloserFiltering = true;
  //shadowGen.useBlurCloseExponentialShadowMap = true;
  //shadowGen.usePoissonSampling = true;
  //shadowGen.useContactHardeningShadow = true;

  // initialize plugin
  const havokInstance = await HavokPhysics();
  // pass the engine to the plugin
  const hk = new BABYLON.HavokPlugin(false, havokInstance);
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
  var ground = BoxWorld(scene, new BABYLON.Vector3(0, 0, 0), 20, viewer, shadowGen);

  var ui = new FastUI();
  ui.setup(scene, hk, viewer);

  const tstBtn = ui.addBtn("Test", () => {
    //tst.setEnabled(true);
    var po = SelectionHandler.getPlateauObjects()[0];
    console.log(po);
    var pc = po.clone();
    console.log(pc);
  });
  const addDiceBtn = ui.addBtn("Add a dice", () => {
    var target_height =
      gLiftHeight + getSceneHeight(scene, new BABYLON.Vector3(0, 10, 0), 0.1, SelectionHandler.selbox.box);
    const newBody = new Dice(new BABYLON.Vector3(0, target_height, 0), Math.random() * 0.2 + 0.1);
  });
  const addCardBtn = ui.addBtn("Add a card", () => {
    var target_height =
      gLiftHeight + getSceneHeight(scene, new BABYLON.Vector3(0, 10, 0), 0.1, SelectionHandler.selbox.box);
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

    function includeMesh(mesh) {
      var po = PlateauObject.GetTopMost(mesh);
      var isDragged = po && po.node.dragged;
      return mesh != avoid && !isDragged && !Pointer.isPointerPart(mesh);
      //return mesh.dragged || (mesh.parent ? isDragged(mesh.parent) : true);
      //return mesh.physicsBody && mesh.physicsBody.getMotionType() == BABYLON.PhysicsMotionType.ANIMATED;
    }
    var height_pick_info = scene.pickWithRay((ray = ray), (predicate = (mesh, i) => includeMesh(mesh)));

    max_height = height_pick_info.hit ? height_pick_info.pickedPoint.y : 0;

    if (test_radius > 0) {
      for (var a = 0.0; a < Math.PI * 2; a += (Math.PI * 2) / N) {
        var dx = -Math.cos(a) * test_radius;
        var dy = Math.sin(a) * test_radius;
        var ray_start = new BABYLON.Vector3(position.x + dx, position.y, position.z + dy);
        ray = new BABYLON.Ray(ray_start, new BABYLON.Vector3(0, -10000, 0));
        height_pick_info = scene.pickWithRay((ray = ray), (predicate = (mesh, i) => includeMesh(mesh)));
        if (height_pick_info.hit && height_pick_info.pickedPoint.y > max_height)
          max_height = height_pick_info.pickedPoint.y;
      }
    }

    Pointer.move(new BABYLON.Vector3(position.x, 0, position.z), max_height);

    return max_height;
  }

  var pickedObject = null;
  var pickedObjectGhost = null;
  var picked_ground_pos = new BABYLON.Vector3();
  var picked_ray_hit_ground = new BABYLON.Vector3();
  var box_selection = false;
  var mousePanning = false;
  var gestureOn = false;
  var dir_speed = new BABYLON.Vector3();
  var last_base_hit = new BABYLON.Vector3();
  var last_base_hit_time = performance.now();

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
          case "Shift":
            shiftKeyDown = true;
            break;
          case "f":
          case "F":
            var objects = SelectionHandler.getPlateauObjects();
            if (pickedObject && !SelectionHandler.isSelected(pickedObject)) objects.push(pickedObject);
            for (var o of objects) if (!o.locked) o.flip();

            break;
          case "t":
          case "T":
            //create_hell_deck(new BABYLON.Vector3(2.48518202226,0,3.20742907408));
            do_setup();
            break;
          case "r":
          case "R":
            var obj = PlateauManager.getObject("efbc88");
            obj.startAnimationMode();
            obj.node.position.copyFrom(BABYLON.Vector3.Zero());
            window.setTimeout(() => obj.stopAnimationMode(), 1000);

            break;
        }
        var consumed = false;
        if (pickedObject) consumed = pickedObject.onKeyDown(kbInfo.event.key);
        else if (SelectionHandler.hoveredObject) consumed = SelectionHandler.hoveredObject.onKeyDown(kbInfo.event.key);
        if (consumed) {
          camera.inputs.attached.keyboard.detachControl();
        }
        break;
      case BABYLON.KeyboardEventTypes.KEYUP:
        switch (kbInfo.event.key) {
          case "Control":
            controlKeyDown = false;
            break;
          case "Shift":
            shiftKeyDown = false;
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
        var consumed = false;
        if (pickedObject) consumed = pickedObject.onKeyUp(kbInfo.event.key);
        else if (SelectionHandler.hoveredObject) consumed = SelectionHandler.hoveredObject.onKeyUp(kbInfo.event.key);
        if (consumed) {
          camera.inputs.attached.keyboard.detachControl();
        }
        break;
    }
  });

  function updateDraggedNodeHeight(obj) {
    var target_height =
      gLiftHeight +
      getSceneHeight(scene, obj.node.position, 0, obj.node) +
      obj.node.getBoundingInfo().boundingBox.extendSizeWorld.y;

    obj.node.position.y = target_height;
    //obj.updateAnimationModeTarget({ targets: obj.node.position, y: target_height }, obj.node.position.y, target_height);
  }

  function panCamera(x, y) {
    var dx = camera.getDirection(new BABYLON.Vector3(1, 0, 0));
    var dy = camera.getDirection(new BABYLON.Vector3(0, 1, 0));
    dx = dx.multiplyByFloats(x, x, x);
    dy = dy.multiplyByFloats(y, y, y);
    camera.position.addInPlace(dx);
    camera.position.addInPlace(dy);
  }

  function rotateCamera(x, y) {
    camera.cameraRotation = new BABYLON.Vector2(-y, -x);
  }

  function zoomCamera(amount) {
    var dz = camera.getDirection(new BABYLON.Vector3(0, 0, 1));
    dz = dz.multiplyByFloats(amount, amount, amount);
    camera.position.addInPlace(dz);
  }

  function rotateSelectionAround(object, angle) {
    if (!object) return;

    var world_H_axisRot = new XTransform(object.node.absolutePosition);
    var axisRot_H_world = world_H_axisRot.inversed();
    var /* The code seems to be a comment in JavaScript. The text "picked_h_new" and " */
      axisRot_H_newAxisRot = new XTransform(
        new BABYLON.Vector3.Zero(),
        BABYLON.Quaternion.FromEulerAngles(0, BABYLON.Tools.ToRadians(angle), 0)
      );
    var objects = SelectionHandler.getPlateauObjects();
    if (!SelectionHandler.isSelected(object)) objects.push(object);
    for (var o of objects) {
      if (o.locked) continue;
      var world_H_obj = XTransform.FromNodeWorld(o.node);
      var axisRot_H_obj = axisRot_H_world.multiply(world_H_obj);
      var world_h_objnew = world_H_axisRot.multiply(axisRot_H_newAxisRot).multiply(axisRot_H_obj);
      world_h_objnew.applyToNodeWorld(o.node);
    }
  }

  const touchArea = document.getElementById("renderCanvas");
  const gestureHandler = new GestureHandler(touchArea);

  {
    gestureHandler.onGestureStart((data) => {
      stopCurrentInteraction();
      gestureOn = true;
    });

    gestureHandler.onGestureUpdate((data) => {
      if (data.type == "drag") {
        if (data.number == 2) panCamera(data.delta.x * 0.015, -data.delta.y * 0.015);
        else rotateCamera(data.delta.x * 0.01, -data.delta.y * 0.01);
      } else if (data.type == "pinch") zoomCamera(data.deltaScale * -2);
    });

    gestureHandler.onGestureEnd((data) => {
      gestureOn = false;
    });
  }

  function stopCurrentInteraction() {
    if (box_selection) {
      box_selection = false;
      SelectionHandler.selbox.setVisiblity(false);
    } else if (pickedObject) {
      dir_speed = dir_speed.normalize();

      var objects = SelectionHandler.getPlateauObjects();
      if (!SelectionHandler.isSelected(pickedObject)) objects.push(pickedObject);
      for (var o of objects) {
        o.node.dragged = false;

        var under = PlateauObject.GetHovered(o.node.absolutePosition, o);
        if (under) {
          o.dropOn(under.node, false, null);
          continue;
        }

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

      var dz = DropZone.GetHovered(pickedObject.node.absolutePosition, pickedObject);
      if (dz) {
        var plateauParent = PlateauObject.GetTopMost(dz.node);
        var cb = null;
        if (plateauParent instanceof Deck) {
          var objectToDrop = pickedObject;
          cb = () => {
            plateauParent.objectDroppedOnZone(objectToDrop, dz);
          };
        }
        if (!controlKeyDown) {
          pickedObject.dropOn(dz.node, dz.forceOrientation, cb);
          console.log(pickedObject.node.name, " dropped on ", dz.node.position, dz.node.rotationQuaternion);
        }
      }
      DropZone.HideAll();

      pickedObject = null;
      if (pickedObjectGhost) {
        pickedObjectGhost.dispose(true, true);
        pickedObjectGhost = null;
      }
      Pointer.hide();
    }
  }

  scene.pointerDownPredicate = (m) => m == ground || PlateauObject.GetTopMost(m) != null;
  scene.onPointerObservable.add((pointerInfo) => {
    if (gestureOn || gestureHandler.touches.size > 1) return;
    switch (pointerInfo.type) {
      case BABYLON.PointerEventTypes.POINTERDOWN:
        if (pointerInfo.event.button == 1) mousePanning = true;
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
          if (!po || !po.node || !po.body) {
            pickedObject = null;
            break;
          }
          SelectionHandler.updateHover(null);
          pickedObject = po.checkSubPick(pointerInfo.pickInfo);
          if (!pickedObject.pickable || pickedObject.locked) {
            pickedObject = null;
            break;
          }

          if (controlKeyDown) {
            SelectionHandler.toggleSelection(pickedObject);
            break;
          } else {
            if (!SelectionHandler.isSelected(pickedObject)) SelectionHandler.removeAll();
          }

          Pointer.show();

          picked_ground_pos.copyFrom(pickedObject.node.position);
          picked_ray_hit_ground.copyFrom(
            pointerInfo.pickInfo.ray.intersectsMesh(ground, (onlyBoundingInfo = true)).pickedPoint
          );

          DropZone.ShowInRadius(
            picked_ground_pos,
            showDropZoneInRadius,
            (m) => PlateauObject.GetTopMost(m.node) != pickedObject
          );
          DropZone.CheckCurrentDrop(pickedObject.node.absolutePosition, pickedObject);
          PlateauObject.CheckCurrentDrop(pickedObject.node.absolutePosition, pickedObject);

          var objects = SelectionHandler.getPlateauObjects();
          if (!SelectionHandler.isSelected(pickedObject)) objects.push(pickedObject);
          for (var o of objects) {
            if (o.locked) continue;
            o.node.dragged = true;
            o.startAnimationMode();
            o.onPickup();
            updateDraggedNodeHeight(o);
          }
          updateDraggedNodeHeight(pickedObject);
        }
        break;
      case BABYLON.PointerEventTypes.POINTERUP:
        if (pointerInfo.event.button == 1 && mousePanning) mousePanning = false;
        if (pointerInfo.event.button != 0) break;

        stopCurrentInteraction();
        break;
      case BABYLON.PointerEventTypes.POINTERMOVE:
        if (mousePanning) {
          const delta = 0.01; // Amount of change in movement
          let x = delta * pointerInfo.event.movementX;
          let y = -delta * pointerInfo.event.movementY;
          panCamera(x, y);
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
          if (!pickedObjectGhost) {
            pickedObject.node.plateauObj = null; // just for tyhe copying time
            pickedObjectGhost = pickedObject.node.clone(pickedObject.node.name + " Ghost", null, true, false);
            pickedObject.node.plateauObj = pickedObject; // just for tyhe copying time
            pickedObjectGhost.plateauObj = null;
            pickedObjectGhost.material = pickedObject.node.material.clone("ghost", true);
            pickedObjectGhost.material.alpha = 0.3;
            pickedObjectGhost.setEnabled(false);
            //pickedObjectGhost.material = new PBRMaterial("hollow")
          }
          var base_hit = pointerInfo.pickInfo.ray.intersectsMesh(ground, (onlyBoundingInfo = true));
          if (base_hit.hit) {
            let dx =
              picked_ground_pos.x + base_hit.pickedPoint.x - picked_ray_hit_ground.x - pickedObject.node.position.x;
            let dz =
              picked_ground_pos.z + base_hit.pickedPoint.z - picked_ray_hit_ground.z - pickedObject.node.position.z;

            var objects = SelectionHandler.getPlateauObjects();
            if (!SelectionHandler.isSelected(pickedObject)) objects.push(pickedObject);
            for (var o of objects) {
              if (o.locked) continue;
              o.node.position.x += dx;
              o.node.position.z += dz;
              updateDraggedNodeHeight(o);
            }
            updateDraggedNodeHeight(pickedObject);

            var elapsed = performance.now() - last_base_hit_time;
            dir_speed.x = (base_hit.pickedPoint.x - last_base_hit.x) / elapsed;
            dir_speed.z = (base_hit.pickedPoint.z - last_base_hit.z) / elapsed;
            last_base_hit.copyFrom(base_hit.pickedPoint);
            last_base_hit_time = performance.now();
            DropZone.ShowInRadius(
              pickedObject.node.absolutePosition,
              showDropZoneInRadius,
              (m) => PlateauObject.GetTopMost(m.node) != pickedObject && m.accept(pickedObject)
            );
            var dropZ = DropZone.CheckCurrentDrop(pickedObject.node.absolutePosition, pickedObject);
            PlateauObject.CheckCurrentDrop(pickedObject.node.absolutePosition, pickedObject);
            if (pickedObjectGhost) {
              if (dropZ) {
                var pos = dropZ.node.absolutePosition.clone();
                pos.y += pickedObject.getBoundingInfos().boundingBox.extendSizeWorld.y;
                pickedObjectGhost.position.copyFrom(pos);
                if (dropZ.forceOrientation)
                  pickedObjectGhost.rotationQuaternion.copyFrom(dropZ.node.absoluteRotationQuaternion);
              }
              pickedObjectGhost.setEnabled(dropZ != null && !controlKeyDown);
            }
          }
        } else {
          var pi = scene.pickWithRay(pointerInfo.pickInfo.ray, (m) => PlateauObject.GetTopMost(m) != null);
          var po = PlateauObject.GetTopMost(pi.pickedMesh);
          SelectionHandler.updateHover(po);
          if (po) {
            g_tooltip.setTitle(po.fullTitle);
            g_tooltip.setDescription(po.fullDescription.replace("\n", "<br>"));
            g_tooltip.setUUID(po.fullAdditional);
            g_tooltip.showTooltip(pointerInfo.event.pageX, pointerInfo.event.pageY);
          } else {
            g_tooltip.hideTooltip();
            camera.inputs.attachInput(camera.inputs.attached.keyboard);
          }
        }
        break;
      case BABYLON.PointerEventTypes.POINTERWHEEL:
        if (pickedObject) {
          const angle = pointerInfo.event.deltaY > 0 ? rotationIncrement : -rotationIncrement;
          rotateSelectionAround(pickedObject, angle);
        } else zoomCamera(pointerInfo.event.deltaY * 0.02);
        break;
    }
  });

  SelectionHandler.init(scene);
  SelectionHandler.hl.addExcludedMesh(ground);

  if (scene.getNodeById("hdrSkyBox")) SelectionHandler.hl.addExcludedMesh(scene.getNodeById("hdrSkyBox"));

  //////////////////////////////////* TEST ZONE */////////////////////////////////////

  // const instance = new Dice(new BABYLON.Vector3(0, 0.6, 0));

  // BABYLON.SceneLoader.LoadAssetContainer(
  //   "models/",
  //   "pointer_00.glb",
  //   scene,
  //   function (
  //     container //BABYLON.SceneLoader.ImportMesh("", "models/", modelNameAndExtension, pathTracingScene, function (meshes)
  //   ) {
  //     // clear out the mesh object and array
  //     //meshes = container.meshes;
  //     var mesh = container.meshes[1].clone();
  //     mesh.createNormals();
  //     mesh.scaling = new BABYLON.Vector3(2.5, 2.5, 2.5);
  //     mesh.material.clearCoat.isEnabled = true;
  //     mesh.material.clearCoat.intensity = 1.0;
  //     mesh.material.albedoColor = new BABYLON.Color3(0, 1, 1, 0.5);
  //     mesh.material.transparency = 0.4;

  //     mesh.material.metallic = 0.0;
  //     mesh.material.roughness = 1;

  //     // mesh.material.subSurface.isTranslucencyEnabled = true;
  //     // mesh.material.subSurface.tintColor = BABYLON.Color3.Color3(1, 1, 0);

  //     // const instance = new PlateauObject(
  //     //   mesh,
  //     //   null,
  //     //   { friction: 0.6, restitution: 0.3 },
  //     //   new BABYLON.Vector3(0, 1.6, 0),
  //     //   1
  //     // );

  //     // var box = BABYLON.Mesh.CreateBox("box", 0.3, scene, false, BABYLON.Mesh.DEFAULTSIDE);
  //     // box.material = bodyRenderingMaterial;
  //     // instance.node.addChild(box);
  //     // box.position = new BABYLON.Vector3(0, 0.3, 0);
  //     // instance.updateBoundingInfos();
  //     // pathTracedMesh = null;
  //     // containerMeshes = [];
  //   }
  // );
  // var bag = new Bag();
  // bag.infinite = true;

  // var french_deck_atlas = new CardAtlas();
  // var deck = Deck.BuildFromCardsAtlas("Test Deck", french_deck_atlas, new BABYLON.Vector3(1, 0.4, 0));

  // var text = new TextObject("Testing Text area");
  // text.node.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(BABYLON.Tools.ToRadians(90),0,0)
  // text.node.position.y += 0.01;

  // // //var tile = ShapedObject.Circle(null, 0.4, 0.1, 30, 0.05, 3, uvFromAtlas(1,4,2), uvFromAtlas(0,4,2));
  // var tile = ShapedObject.RoundedSquare(null, 0.8, 0.4, 0.1, 0.05, 4, 0.05, 3, uvFromAtlas(1,4,2), uvFromAtlas(0,4,2));
  // //var tile = ShapedObject.Hexagon(null, 0.4, 0.1, 0.05, 3);//, uvFromAtlas(1,4,2), uvFromAtlas(0,4,2));

  // var shape = [new BABYLON.Vector3(0,0,0),new BABYLON.Vector3(0,-0.4,0),new BABYLON.Vector3(0.4,-0.4,0),new BABYLON.Vector3(0.8,0,0)]
  // //var tile = new ShapedObject(null, shape, null, 0.1, 0.05,3);//, uvFromAtlas(1,4,2), uvFromAtlas(0,4,2));

  // var mat = new BABYLON.PBRMaterial("cardBoard", scene);
  // mat.albedoTexture = new BABYLON.Texture("textures/tiles/hand_painted_tiles.png", scene, true, false);
  // mat.albedoColor = new BABYLON.Color3(0.8, 0.8, 0.8);
  // mat.metallic = 0.0;
  // mat.roughness = 0.05;
  // var mat2 = mat.clone();
  // mat2.albedoColor = BABYLON.Color3.Red();

  // tile.setMaterial(mat, mat2)
  // //var tile2 = new ShapedObject(null, shape, null, 0.1, 0,3);;//, uvFromAtlas(1,4,2), uvFromAtlas(0,4,2));
  // var tile2 = ShapedObject.RoundedSquare(null, 0.8, 0.4, 0.1, 0.05, 4, 0., 3, uvFromAtlas(1,4,2), uvFromAtlas(0,4,2));
  // tile2.setMaterial(mat, mat2)
  // tile.node.position = new BABYLON.Vector3(-0.4, 0, 0);
  // tile2.node.position = new BABYLON.Vector3(-0.4, 0, 0.7);

  //DropZone.CreateRectangularZone(1, 1, 0.01, null, new BABYLON.Vector3(-1, 0, 0.5));

  // var m = BABYLON.MeshBuilder.CreateCylinder("test", {
  //   diameter: 0.6,
  //   height: 0.1,
  //   tessellation: 32,
  // });
  // planarUVProjectXZ(m);
  // var mat = new BABYLON.PBRMaterial("cardBoard", scene);
  // mat.albedoTexture = new BABYLON.Texture("textures/tiles/hand_painted_tiles.png", scene, true, false);
  // mat.albedoColor = new BABYLON.Color3(0.8, 0.8, 0.8);
  // mat.metallic = 0.0;
  // mat.roughness = 0.05;
  // m.material = mat;

  // var po = new PlateauObject(m, null);

  // // var po2 = po.clone();
  // // po2.node.id = po2.node.node = "test2";

  //////////////////////////////////* TEST ZONE */////////////////////////////////////

  //var pdfobj = new PdfObject("https://steamusercontent-a.akamaihd.net/ugc/1481073489969110801/D4F2A221E4F891CA741DEAF96DA774CCDFF53A78/");

  // var txt = "ICI.\nJ'aime les fruits\n\n... AU SIROP!!!";
  // var txtObj = new TextObject(txt, { fontName: "Amaranth", color: BABYLON.Color3.Red().toHexString(), fontSize: 40 });
  // txtObj.node.showBoundingBox = true;
  // txtObj.node.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(BABYLON.Tools.ToRadians(90), 0, 0);
  // txtObj.node.position.y += 0.01;

  function loadingFinished() {
    setTimeout(() => {
      LoadingOverlay.remove();
    }, 1000);

    console.log("LOADING FINISHED...");
    // var uuids = new Set();
    // for (var m of scene.meshes) {
    //   if (m.dropZone) continue;
    //   var po = m.plateauObj;
    //   if (!po) continue;
    //   if (!po.uuid || po.uuid == "") {
    //     console.warn("Wrong UUID :", po.uuid, " > ", po.node.id, po.fullTitle, po.fullAdditional, po.fullDescription);
    //     continue;
    //   }

    //   if (uuids.has(po.uuid)) {
    //     console.warn(
    //       "Duplicate UUID :",
    //       po.uuid,
    //       " > ",
    //       po.node.id,
    //       po.fullTitle,
    //       po.fullAdditional,
    //       po.fullDescription
    //     );
    //     continue;
    //   }
    //   uuids.add(po.uuid);
    // }

    loadScript("dev/GS.js")
      .catch((err) => console.error(err))
      .then((sc) => {
        console.log("Script loaded:", sc);

        setup_constants();
        create_hell_deck(new BABYLON.Vector3(2.48518202226, 0, 3.20742907408));
        //do_setup()

        PlateauManager.getObjectFromName("Power Token");
      });
  }
  // Example usage:
  LoadingOverlay.init({
    blockable: true,
    debug: true,
    debugInfo: "Loading assets...",
    gradientColors: ["rgba(0, 255, 255, 0.4)", "rgba(28, 28, 28, 0.4)", "rgba(46, 46, 46, 0.4)"],
    frostEffect: true,
    progress: 0,
    pulseDuration: 5,
  });
  function progressCB(progress, total) {
    LoadingOverlay.updateProgress((progress / total) * 100);
    LoadingOverlay.updateDebugInfo(`Loading assets... ${progress}/${total}`);
  }
  // // Simulate progress updates
  // let progress = 0;
  // const interval = setInterval(() => {
  //   progress += 10;
  //   LoadingOverlay.updateProgress(progress);
  //
  //   if (progress >= 100) {
  //     clearInterval(interval);
  //     setTimeout(() => {
  //       LoadingOverlay.remove();
  //     }, 1000);
  //   }
  // }, 500);

  //var zone = new Zone(new BABYLON.Vector3(-1, 0, 0));
  var src = "https://raw.githubusercontent.com/syllebra/plateau_content/refs/heads/main/";
  //TTSImporter.importFile(src + "3303737944.json", loadingFinished); // DSA B
  //TTSImporter.importFile(src + "2225234101.json", loadingFinished, progressCB); // GS
  //TTSImporter.importFile(src + "820420328.json", loadingFinished, progressCB); // GS+Ex
  //TTSImporter.importFile(src + "3340958295.json", loadingFinished, progressCB); // DF
  //TTSImporter.importFile(src + "3372818507.json", loadingFinished, progressCB); // ED
  //TTSImporter.importFile(src + "263788054.json", loadingFinished, progressCB); // CCS
  //TTSImporter.importFile(src + "270492259.json", loadingFinished, progressCB); // Clue
  //TTSImporter.importFile(src + "3340958295.json", loadingFinished, progressCB); // DD2

  TTSImporter.importFile("/dev/TS_Save_3.json", loadingFinished, progressCB); // GS+Ex
  Pointer.load();

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
