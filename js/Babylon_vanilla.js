let canvas, engine, pathTracingScene;
let container, stats, camera;
let dice_mesh, dice_collider;

// setup the frame rate display (FPS) in the top-left corner
container = document.getElementById("container");

stats = new Stats();
stats.domElement.style.position = "absolute";
stats.domElement.style.top = "0px";
stats.domElement.style.right = "0px";
stats.domElement.style.cursor = "default";
stats.domElement.style.webkitUserSelect = "none";
stats.domElement.style.MozUserSelect = "none";
container.appendChild(stats.domElement);

canvas = document.getElementById("renderCanvas");
engine = new BABYLON.Engine(canvas, true, { stencil: true });


function addText(scene, parent, updateFn, initialText) {
  var bodiesCounter = new BABYLON.GUI.TextBlock("bodiesCounter", initialText);
  bodiesCounter.color = "white";
  bodiesCounter.resizeToFit = true;
  bodiesCounter.fontSize = "20px";
  parent.addControl(bodiesCounter);
  if (updateFn) {
    scene.onAfterRenderObservable.add(() => updateFn(bodiesCounter));
  }
  return bodiesCounter;
}

var bindBodyShape = function (mesh, shape, scene) {
  mesh.material = bodyRenderingMaterial;
  if (mesh.getDescendants && mesh.getDescendants().length) {
    mesh.getDescendants().forEach((d) => {
      d.material = bodyRenderingMaterial;
    });
  }

  var body = new BABYLON.PhysicsBody(
    mesh,
    BABYLON.PhysicsMotionType.DYNAMIC,
    false,
    scene
  );

  shape.material = physicsMaterial;
  body.shape = shape;
  // body.setMassProperties({
  //   mass: 1,
  // });
};

var CreateDiceMaterial = function (scene) {
  // Texture

  BABYLON.Effect.ShadersStore["LinesPixelShader"] = "#ifdef GL_ES\n" + "precision highp float;\n" + "#endif\n\n" + "varying vec2 vUV; \n" + "void main(void) {\n" + " gl_FragColor = vec4(vUV.x,vUV.y,-vUV.x, 1.0);\n" + "}\n" + "";
  //const customProcText = new BABYLON.CustomProceduralTexture("customtext", "Lines", 1024, scene);
  const customProcText = new BABYLON.CustomProceduralTexture("dice_dynamic_texture", "textures/dice", 256, scene);
  console.log(customProcText._uniforms)
  const mat = new BABYLON.StandardMaterial("diceMaterial");
  const texture = new BABYLON.Texture("textures/dice/D6.jpg", scene, true, false);
  const textureNorm = new BABYLON.Texture("textures/dice/D6_N.jpg", scene, true, false);
  mat.diffuseTexture = customProcText;
  mat.bumpTexture = textureNorm;
  mat.ambientColor = new BABYLON.Color3(0.1, 0.1, 0.2);

  var columns = 3;
  var rows = 2;

  const faceUV = new Array(6);

  var dx = 1 / columns;
  var dy = 1 / rows;
  faceUV[3] = new BABYLON.Vector4(0 * dx, 0 * dy, 1 * dx, 1 * dy);
  faceUV[1] = new BABYLON.Vector4(1 * dx, 0 * dy, 2 * dx, 1 * dy);
  faceUV[2] = new BABYLON.Vector4(2 * dx, 0 * dy, 3 * dx, 1 * dy);
  faceUV[0] = new BABYLON.Vector4(0 * dx, 1 * dy, 1 * dx, 2 * dy);
  faceUV[4] = new BABYLON.Vector4(1 * dx, 1 * dy, 2 * dx, 2 * dy);
  faceUV[5] = new BABYLON.Vector4(2 * dx, 1 * dy, 3 * dx, 2 * dy);
  return [mat, faceUV];
}

var AddBody = function (scene, position, shadowGen, viewer, W = 0.16, H = 0.16, D = 0.16) {

  const options = {
    faceUV: diceUVs,
    wrap: true,
    //size: 0.1
    width: W,
    height: H,
    depth: D
  };

  var box = BABYLON.MeshBuilder.CreateBox("dice", options);
  box.position = position;
  box.showBoundingBox = false;

  shadowGen.addShadowCaster(box);

  var boxShape = new BABYLON.PhysicsShapeBox(
    new BABYLON.Vector3(0, 0, 0),
    BABYLON.Quaternion.Identity(),
    new BABYLON.Vector3(W, H, D),
    scene
  );

  bindBodyShape(box, boxShape, scene);
  box.material = bodyRenderingMaterial;//diceMaterial;

  if (viewer) {
    viewer.showBody(box.physicsBody);
  }

  box.physicsBody.disablePreStep = false;


  return box;
};

var AddCard = function (scene, position, shadowGen, viewer) {
  AddBody(scene, position, shadowGen, viewer, W = .572, H = .004, D = .889);
}

var AddDice = function (scene, position, shadowGen, viewer, s = 0.14) {
  s = Math.random() * 0.2 + 0.1
  // var dice = AddBody(scene, position, shadowGen, viewer, W=s, H=s, D=s);
  var dice = dice_mesh.clone("dice");
  dice.showBoundingBox = false;
  console.log(dice)
  dice.scaling = new BABYLON.Vector3(s * 0.05, s * 0.05, s * 0.05);
  dice.position = position;
  shadowGen.addShadowCaster(dice);
  // var boxShape = new BABYLON.PhysicsShapeBox(
  //   new BABYLON.Vector3(0, 0, 0),
  //   BABYLON.Quaternion.Identity(),
  //   new BABYLON.Vector3(s, s, s),
  //   scene
  // );

  //var coll = dice_collider.clone("dice_collider");
  dice_collider.scaling.copyFrom(dice.scaling);
  var boxShape = new BABYLON.PhysicsShapeConvexHull(
    dice_collider,   // mesh from which to produce the convex hull
    scene   // scene of the shape
  );

  bindBodyShape(dice, boxShape, scene);
  dice.material = bodyRenderingMaterial;//diceMaterial;

  if (viewer) {
    viewer.showBody(dice.physicsBody);
  }

  dice.physicsBody.disablePreStep = false;

  dice.material = diceMaterial;
}

var WorldBuild = function (ground, groundShape, scene, shadowGen) {
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
};

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
  WorldBuild(ground, groundShape, scene, shadowGen);
  if (viewer)
    viewer.showBody(ground.physicsBody);
  return ground;
};

class SelectionBox {
  box = null;
  height = 1;
  p0= new BABYLON.Vector3(-1,0,-1)
  p1= new BABYLON.Vector3(1,0,1)

  constructor(scene, height = 1.5) {
    this.height = height;
    const options = {
      width: 1,
      height: 1,
      depth: 1
    };

    this.box = BABYLON.MeshBuilder.CreateBox("selection_box", options);
    var mat = new BABYLON.StandardMaterial("selection_box_material", scene);
    mat.diffuseColor = new BABYLON.Color4(0.1, 0.3, 1);
    mat.ambientColor = new BABYLON.Color3(0.1, 0.1, 0.2);
    mat.emissiveColor = new BABYLON.Color3(0.05, 0.15, 0.5);
    mat.alpha = 0.25;
    mat.backFaceCulling = false;
    this.box.material = mat;
    this.box.showBoundingBox = false;
    
    //this.box.position = position;
    this.update()
    this.setVisiblity(false)
  }

  update() {
    this.box.scaling = new BABYLON.Vector3(this.p1.x-this.p0.x, this.height, this.p1.z-this.p0.z);
    this.box.position = new BABYLON.Vector3((this.p1.x+this.p0.x)*0.5, this.p0.y+this.height*0.5+0.001, (this.p1.z+this.p0.z)*0.5);
  }

  setInitPoint(pos) {
    this.p0.copyFrom(pos);
    this.p1.copyFrom(pos);
    this.update();
  }
  setSecondPoint(pos) {
    this.p1.copyFrom(pos);
    this.update();
  }
  setVisiblity(b) {
    this.box.setEnabled(b);
  }
}


class SelectionHandler {
  static hl = null;
  static selbox = null;


  static createHighlightLayer(scene) {
    BABYLON.Effect.ShadersStore["glowBlurPostProcessPixelShader"] =
      `
    varying vec2 vUV;
    uniform sampler2D textureSampler;
    uniform vec2 screenSize;
    uniform vec2 direction;
    uniform float blurWidth;
    float getLuminance(vec3 color){return dot(color,vec3(0.2126,0.7152,0.0722));}
    #define CUSTOM_FRAGMENT_DEFINITIONS
    void main(void)
    {
      float weights[7];weights[0]=0.05;weights[1]=0.1;weights[2]=0.2;weights[3]=0.3;weights[4]=0.2;weights[5]=0.1;weights[6]=0.05;
      vec2 texelSize=vec2(1.0/screenSize.x,1.0/screenSize.y);
      vec2 texelStep=texelSize*direction*blurWidth;
      vec2 start=vUV-3.0*texelStep;
      vec4 baseColor=vec4(0.,0.,0.,0.);
      vec2 texelOffset=vec2(0.,0.);
      for (int i=0; i<7; i++)
      {
        vec4 texel=texture2D(textureSampler,start+texelOffset);
        baseColor.a+=texel.a*weights[i];
        float luminance=getLuminance(baseColor.rgb);
        float luminanceTexel=getLuminance(texel.rgb);
        float choice=step(luminanceTexel,luminance);
        baseColor.rgb=choice*baseColor.rgb+(1.0-choice)*texel.rgb;
        texelOffset+=texelStep;
      }
      float alpha = baseColor.a > 0.1 ? min(baseColor.a*2.5,1.0 ):0.0; 
      alpha = (alpha*alpha*alpha);
      gl_FragColor=vec4(baseColor.rgb*1.0, alpha);
      }
    `  // Add the highlight layer.
    this.hl = new BABYLON.HighlightLayer("highlight_layer", scene, {
      //mainTextureRatio:1.0,
      //alphaBlendingMode: 2,
      isStroke: false,
      innerGlow: false,
      outerGlow: true,
      blurHorizontalSize: 0.7,
      blurVerticalSize: 0.7,
    }
    )
  }
  static init(scene) {
    this.createHighlightLayer(scene);
    this.selbox = new SelectionBox(scene);
    this.hl.addExcludedMesh(this.selbox.box);
  }

  static addMesh(mesh) {
    if (this.hl && !this.isSelected(mesh))
      this.hl.addMesh(mesh, new BABYLON.Color3(0, 1, 1));
  }

  static removeMesh(mesh) {
    if (this.hl && this.isSelected(mesh))
      this.hl.removeMesh(mesh);
  }

  static removeAll() {
    if (this.hl)
      this.hl.removeAllMeshes();
  }

  static isSelected(mesh) {
    return this.hl.hasMesh(mesh);
  }

  static toggleSelection(mesh) {
    var isIn = this.isSelected(mesh);
    if(isIn)
      this.removeMesh(mesh);
    else
      this.addMesh(mesh);
  }
}



var createScene = async function () {
  // This creates a basic Babylon Scene object (non-mesh)
  var scene = new BABYLON.Scene(engine);
  scene.useRightHandedSystem = true;
    
  // This creates and positions a free camera (non-mesh)
  camera = new BABYLON.UniversalCamera(
    "camera1",
    new BABYLON.Vector3(0, 1, -3),
    scene
  );

  // This targets the camera to scene origin
  camera.setTarget(BABYLON.Vector3.Zero());

  // This attaches the camera to the canvas
  camera.attachControl(canvas, true);
  camera.inputs.attached.mouse.buttons = [2]
  
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
  dirLight.intensity = 0.2;
  var shadowGen = new BABYLON.ShadowGenerator(1024, dirLight);
  shadowGen.bias = 0.01
  shadowGen.usePercentageCloserFiltering = true;

  var advancedTexture =
    BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

  var panel = new BABYLON.GUI.StackPanel();
  panel.spacing = 5;
  advancedTexture.addControl(panel);
  panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
  panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  panel.paddingLeftInPixels = 10;
  panel.paddingTopInPixels = 10;
  panel.width = "30%";

  // initialize plugin
  const havokInstance = await HavokPhysics();
  // pass the engine to the plugin
  const hk = new BABYLON.HavokPlugin(true, havokInstance);
  scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), hk);
  var physicsEngine = scene.getPhysicsEngine();
  console.log(physicsEngine)

  //physicsEngine.setTimeStep((1/100))// * scene.getAnimationRatio())

  var viewer = null;// new BABYLON.Debug.PhysicsViewer(scene);

  physicsMaterial = { friction: 0.6, restitution: 0.3 };
  bodyRenderingMaterial = new BABYLON.StandardMaterial("mat", scene);
  bodyRenderingMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.3, 1);
  bodyRenderingMaterial.ambientColor = new BABYLON.Color3(0.1, 0.1, 0.2);

  [diceMaterial, diceUVs] = CreateDiceMaterial(scene);


  const viewerCheckbox = AddToggle("Debug Viewer", panel);
  viewerCheckbox.isChecked = false;
  viewerCheckbox.onIsCheckedChangedObservable.add((value) => {
    if (value) {
      viewer = new BABYLON.Debug.PhysicsViewer(scene);
      for (let mesh of scene.meshes) {
        if (viewer && mesh.physicsBody) {
          viewer.showBody(mesh.physicsBody);
        }
      }
    } else {
      viewer.dispose();
      viewer = null;
    }
  });


  var modelNameAndExtension = 'dice.glb'

  const container = await BABYLON.loadAssetContainerAsync("models/" + modelNameAndExtension, scene);
  console.log(container.meshes)
  dice_mesh = container.meshes[1];
  dice_collider = container.meshes[2];

  // body/shape on box
  var ground = BoxWorld(scene, new BABYLON.Vector3(0, 0, 0), 40, viewer, shadowGen);
  const instance = AddDice(
    scene,
    new BABYLON.Vector3(0, 0.6, 0),
    shadowGen,
    viewer
  );

  const addDiceBtn = AddBtn("Add a dice", panel, () => {
    const newBody = AddDice(
      scene,
      new BABYLON.Vector3(0, 0.6, 0),
      shadowGen,
      viewer
    );
  });
  const addCardBtn = AddBtn("Add a card", panel, () => {
    const newBody = AddCard(
      scene,
      new BABYLON.Vector3(0, 0.6, 0),
      shadowGen,
      viewer
    );
  });

  addText(scene, panel, (bodiesCounter) => {
    const n = hk.numBodies;
    bodiesCounter.text = `bodies: ${n}`;
  });

  const sceneInstrumentation = new BABYLON.SceneInstrumentation(scene);
  sceneInstrumentation.captureFrameTime = true;
  sceneInstrumentation.capturePhysicsTime = true;

  addText(scene, panel, (c) => {
    const ft = sceneInstrumentation.frameTimeCounter.lastSecAverage;
    c.text = `absolute fps: ${(1000 / ft).toFixed(2)}`;
  });

  addText(scene, panel, (c) => {
    const pt = sceneInstrumentation.physicsTimeCounter.lastSecAverage;
    c.text = `physics time: ${pt.toFixed(2)} ms`;
  });


  function getSceneHeight(scene, position, test_radius = 0., avoid = null) {
    const N = 16;
    var max_height = 0;

    var ray = new BABYLON.Ray(position, new BABYLON.Vector3(0, -10000, 0));
    var height_pick_info = scene.pickWithRay(ray = ray, predicate = (mesh, i) => (mesh != avoid));

    max_height = height_pick_info.hit ? height_pick_info.pickedPoint.y : 0.;

    if (test_radius > 0.) {
      for (var a = 0.0; a < Math.PI * 2; a += Math.PI * 2. / N) {
        var dx = - Math.cos(a) * test_radius;
        var dy = Math.sin(a) * test_radius;
        var ray_start = new BABYLON.Vector3(position.x + dx, position.y, position.z + dy);
        ray = new BABYLON.Ray(ray_start, new BABYLON.Vector3(0, -10000, 0));
        height_pick_info = scene.pickWithRay(ray = ray, predicate = (mesh, i) => (mesh != avoid));
        if (height_pick_info.hit && height_pick_info.pickedPoint.y > max_height)
          max_height = height_pick_info.pickedPoint.y;
      }

    }

    return max_height
  }

  var timestamp = 0, speedMax = 0, mouse_speed = 0;

  function updateMouseSpeed(e) {
    var now = Date.now();

    var dt = now - timestamp;
    var dx = e.movementX;
    var dy = e.movementY;

    var distance = Math.sqrt(dx * dx + dy * dy);
    var direction = Math.atan2(dy, dx);

    //speed is zero when mouse was still (dt hold a long pause)
    mouse_speed = parseInt(distance / dt * 100);
    var speedX = Math.round(dx / dt * 100);
    var speedY = Math.round(dy / dt * 100);

    //reset if speed is zero, otherwise set max of any speed
    speedMax = !mouse_speed ? 0 : mouse_speed > speedMax ? mouse_speed : speedMax;
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
    var nbf = (height - obj.position.y) * 1000 / ySpeed;


    if (current_anim && current_anim.target == obj) {
      current_anim.getAnimations()[0].currentValue = height;
      current_anim.getAnimations()[0].duration = nbf;
      current_anim.getAnimations()[0].restart();
      //current_anim.animations[0]()[0]._keys[1].value = height;
      return
    }

    current_anim = anime({
      targets: obj.position,
      y: height,
      easing: 'linear',//'easeInElastic(1, .6)',
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
    }
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
            controlKeyDown = true
            break;
        }
        break;
      case BABYLON.KeyboardEventTypes.KEYUP:
        switch (kbInfo.event.key) {
          case "Control":
            controlKeyDown = false
            break;
        }
        break;
    }
  });

  scene.onPointerObservable.add((pointerInfo) => {
    
    switch (pointerInfo.type) {
      case BABYLON.PointerEventTypes.POINTERDOWN:
        if(pointerInfo.event.button!=0)
          break;
        if (!pointerInfo.pickInfo.hit)
          break;
        if(pointerInfo.pickInfo.pickedMesh == ground) {
          if(!controlKeyDown)
            SelectionHandler.removeAll();
          SelectionHandler.selbox.setVisiblity(true);
          SelectionHandler.selbox.setInitPoint(pointerInfo.pickInfo.pickedPoint);
          //camera.detachControl(canvas);
          box_selection = true;
        }
        else
        if (pointerInfo.pickInfo.pickedMesh != ground) {
          speedMax = 0;
          
          if(!pointerInfo.pickInfo.pickedMesh.physicsBody)
            break;

          if(controlKeyDown) {
            SelectionHandler.toggleSelection(pointerInfo.pickInfo.pickedMesh);
            break;
          }
          else{
            if(!SelectionHandler.isSelected(pointerInfo.pickInfo.pickedMesh))
              SelectionHandler.removeAll();
          }


          picked = pointerInfo.pickInfo.pickedMesh;

          picked_ground_pos.copyFrom(picked.position);
          picked_ray_hit_ground.copyFrom(pointerInfo.pickInfo.ray.intersectsMesh(ground, onlyBoundingInfo = true).pickedPoint);

          console.log("picked", pointerInfo.pickInfo, picked_ground_pos, picked_ray_hit_ground)

          //camera.detachControl(canvas);
          picked.physicsBody.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);
          picked.physicsBody.disablePreStep = false;
          console.log(picked.physicsBody)
          picked.physicsBody.setLinearVelocity(new BABYLON.Vector3(0, 0, 0));
          picked.physicsBody.setAngularVelocity(new BABYLON.Vector3(0, 0, 0));
          picked.physicsBody.checkCollisions = true;
          var target_height = 0.3 + getSceneHeight(scene, picked.position, 0.1, picked);
          //picked.position.y = target_height;
          changeAnimTarget(picked, target_height);
        }
        break;
      case BABYLON.PointerEventTypes.POINTERUP:
        if(pointerInfo.event.button!=0)
          break;

        if(box_selection) {
          //SelectionHandler.selbox.setSecondPoint(pointerInfo.pickInfo.ray.intersectsMesh(ground, onlyBoundingInfo = true).pickedPoint);
          box_selection = false;
          //camera.attachControl(canvas, true);
          SelectionHandler.selbox.setVisiblity(false);
        }
        else
        if (picked) {
          picked.physicsBody.disablePreStep = true;
          picked.physicsBody.setMotionType(BABYLON.PhysicsMotionType.DYNAMIC);
          //picked.physicsBody.applyForce(dir_speed, picked.position);
          dir_speed = dir_speed.normalize();
          var power = picked.physicsBody.getMassProperties().mass * 1.5 * mouse_speed;
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
        updateMouseSpeed(pointerInfo.event);
        if (box_selection) {
          SelectionHandler.selbox.setSecondPoint(pointerInfo.pickInfo.ray.intersectsMesh(ground, onlyBoundingInfo = true).pickedPoint);
          var sel_bb = SelectionHandler.selbox.box.getBoundingInfo().boundingBox;
          
          for (var m of scene.meshes) {
            if (m == SelectionHandler.selbox.box || m == ground)
              continue;
            var m_bb = m.getBoundingInfo().boundingBox;
            //let max = childMeshes[0].getBoundingInfo().boundingBox.maximumWorld;)
            if (BABYLON.BoundingBox.Intersects(sel_bb, m_bb)) {
                SelectionHandler.addMesh(m);
            }
            else
            if(!controlKeyDown)
              SelectionHandler.removeMesh(m);            
          }
        }
        else
        if (picked) {
          var base_hit = pointerInfo.pickInfo.ray.intersectsMesh(ground, onlyBoundingInfo = true)
          if (base_hit.hit) {
            var target_height = 0.3 + getSceneHeight(scene, picked.position, 0.1, picked);
            //picked.position.y = target_height;
            changeAnimTarget(picked, target_height);

            // if(anim)
            //   anim.stop()
            // console.log("pickedPoint",base_hit.pickedPoint)
            // console.log("picked_ground_pos",picked_ground_pos)
            // console.log("picked_ray_hit_ground",picked_ray_hit_ground)
            // BABYLON.Animation.CreateAndStartAnimation("pickup_move_x", picked, "position.x", phys_step * 2, phys_step * 0.1, picked.position.x, base_hit.pickedPoint.x, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            // BABYLON.Animation.CreateAndStartAnimation("pickup_move_z", picked, "position.z", phys_step * 2, phys_step * 0.1, picked.position.z, base_hit.pickedPoint.z, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            picked.position.x = picked_ground_pos.x + base_hit.pickedPoint.x - picked_ray_hit_ground.x;
            picked.position.z = picked_ground_pos.z + base_hit.pickedPoint.z - picked_ray_hit_ground.z;
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

      stats.update();
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

