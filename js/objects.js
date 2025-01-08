class PhysicObject {
  body = null;
  node = null;
  animations = new Map();

  constructor(
    node,
    colliderShape = null,
    physicsMaterial = { friction: 0.6, restitution: 0.3 },
    position = null
  ) {
    if (position) node.position = position;
    this.node = node;
    if (shadowGen) shadowGen.addShadowCaster(node);
    this.body = new BABYLON.PhysicsBody(
      node,
      BABYLON.PhysicsMotionType.DYNAMIC,
      false,
      scene
    );

    if (!colliderShape) {
      var bb = node.getBoundingInfo().boundingBox;
      console.log(bb);
      colliderShape = new BABYLON.PhysicsShapeBox(
        bb.center,
        BABYLON.Quaternion.Identity(),
        new BABYLON.Vector3(
          bb.extendSize.x * 2.0,
          bb.extendSize.y * 2.0,
          bb.extendSize.z * 2.0
        ),
        scene
      );
    }
    colliderShape.material = physicsMaterial;
    this.body.shape = colliderShape;
    this.body.disablePreStep = false;
    //}, spawnPosition = null, spawnRotation = null) {

    this.node.plateauObj = this;
    this.node.dragged = false;

    gizmoManager.attachableMeshes.push(this.node);
    gizmoManager.attachToMesh(this.node);
  }

  setEnabled(b) {
    this.node.setEnabled(b);
    this.body._physicsPlugin.setPhysicsBodyEnabled(this.body, b);
  }

  startAnimationMode() {
    //camera.detachControl(canvas);
    this.body.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);
    this.body.disablePreStep = false;
    this.body.setLinearVelocity(new BABYLON.Vector3(0, 0, 0));
    this.body.setAngularVelocity(new BABYLON.Vector3(0, 0, 0));
    this.body.checkCollisions = true;
  }
  updateAnimationModeTarget(params, currentValue, targetValue, speed = 2) {
    var nbf = ((targetValue - currentValue) * 1000) / speed;

    if (this.animations.has(params.targets)) {
      // Change current animation if not finished
      let current_anim = this.animations.get(params.targets);
      if (current_anim.target == this.node) {
        current_anim.getAnimations()[0].currentValue = height;
        current_anim.getAnimations()[0].duration = nbf;
        current_anim.getAnimations()[0].restart();
      }
      //current_anim.animations[0]()[0]._keys[1].value = height;
      return;
    }

    params.easing = "linear";
    params.duration = nbf;
    let current_anim = anime(params);
    this.animations.set(params.targets, current_anim);
    let animPhysObj = this;
    //current_anim.play()
    current_anim.complete = function () {
      current_anim = null;
      animPhysObj.animations.delete(params.targets);
    };
  }
  stopAnimationMode() {
    // TODO: Clear all current animations
    this.body.disablePreStep = true;
    this.body.setMotionType(BABYLON.PhysicsMotionType.DYNAMIC);
  }
}

class Card extends PhysicObject {
  static {
    registerPreload(async () => {
      {
        Card.createCardMaterial();
      }
    });
  }

  static cardMaterial = null;
  static async createCardMaterial() {
    const texture = new BABYLON.Texture(
      "textures/cards/french_deck.png",
      scene,
      true,
      false
    );

    const pbr = new BABYLON.PBRMaterial("diceMaterial", scene);

    pbr.metallic = 0;
    pbr.roughness = 0.5;
    pbr.albedoTexture = texture;

    // Metadata
    pbr.cols = 13;
    pbr.rows = 5;
    pbr.nb = 55;

    this.cardMaterial = pbr;
    return pbr;
  }

  constructor(
    position = null,
    num = 32,
    numBack = 54,
    width = 0.572,
    height = 0.889,
    thickness = 0.004
  ) {
    console.log(
      Card.cardMaterial.cols,
      Card.cardMaterial.rows,
      Card.cardMaterial.nb
    );

    function uv(num) {
      var row = Math.floor(num / Card.cardMaterial.cols);
      var col = num % Card.cardMaterial.cols;
      console.log(row, col);

      var dx = 1.0 / Card.cardMaterial.cols;
      var dy = 1.0 / Card.cardMaterial.rows;
      return new BABYLON.Vector4(
        dx * col,
        dy * row,
        dx * (col + 1),
        dy * (row + 1)
      );
    }

    var faceUV = new Array(6);
    faceUV[0] = new BABYLON.Vector4(0, 0, 0, 0);
    faceUV[1] = new BABYLON.Vector4(0, 0, 0, 0);
    faceUV[2] = new BABYLON.Vector4(0, 0, 0, 0);
    faceUV[3] = new BABYLON.Vector4(0, 0, 0, 0);
    faceUV[4] = uv(num);
    faceUV[5] = uv(numBack);

    const options = {
      // faceUV: diceUVs,
      // wrap: true,
      //size: 0.1
      width: height, //width,
      height: thickness,
      depth: width, //height,
      faceUV: faceUV,
    };

    var box = BABYLON.MeshBuilder.CreateBox("card", options);
    if (position) box.position.copyFrom(position);
    box.material = Card.cardMaterial; //scene.getMaterialByName("default_material");

    super(box);
  }
}

class Dice extends PhysicObject {
  static {
    registerPreload(async () => {
      {
        Dice.createDiceMaterial();
        await Dice.loadMeshes();
      }
    });
  }

  static async createDiceMaterial() {
    // Texture
    BABYLON.Effect.ShadersStore["LinesPixelShader"] =
      "#ifdef GL_ES\n" +
      "precision highp float;\n" +
      "#endif\n\n" +
      "varying vec2 vUV; \n" +
      "void main(void) {\n" +
      " gl_FragColor = vec4(vUV.x,vUV.y,-vUV.x, 1.0);\n" +
      "}\n" +
      "";
    //const customProcText = new BABYLON.CustomProceduralTexture("customtext", "Lines", 1024, scene);
    const customProcText = new BABYLON.CustomProceduralTexture(
      "dice_dynamic_texture",
      "textures/dice",
      256,
      scene
    );
    console.log(customProcText._uniforms);
    const pbr = new BABYLON.PBRMaterial("diceMaterial", scene);

    pbr.metallic = 0;
    pbr.roughness = 1.0;

    pbr.clearCoat.isEnabled = true;
    pbr.clearCoat.intensity = 1.0;

    const textureNorm = new BABYLON.Texture(
      "textures/dice/D6_N.jpg",
      scene,
      true,
      false
    );
    pbr.albedoTexture = customProcText;
    pbr.bumpTexture = textureNorm;
    pbr.bumpTexture.level = 1;

    this.diceMaterial = pbr;
    return pbr;
  }

  static async loadMeshes() {
    var modelNameAndExtension = "dice.glb";
    const container = await BABYLON.loadAssetContainerAsync(
      "models/" + modelNameAndExtension,
      scene
    );
    console.log(container.meshes);
    this.diceMesh = container.meshes[1];
    this.diceColliderMesh = container.meshes[2];
  }

  static diceMaterial = null;
  static diceMesh = null;
  static diceColliderMesh = null;

  constructor(position = null, size = 0.14) {
    var dice = Dice.diceMesh.clone("dice");
    dice.material = Dice.diceMaterial;
    dice.scaling = new BABYLON.Vector3(size * 0.05, size * 0.05, size * 0.05);
    if (position) dice.position.copyFrom(position);

    Dice.diceColliderMesh.scaling.copyFrom(dice.scaling);
    var diceShape = new BABYLON.PhysicsShapeConvexHull(
      Dice.diceColliderMesh, // mesh from which to produce the convex hull
      scene // scene of the shape
    );

    super(dice, diceShape);
  }
}
