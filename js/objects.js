class PhysicObject {
  body = null;
  node = null;
  animations = new Map();
  rotationAnimation = null;

  constructor(
    node,
    colliderShape = null,
    physicsMaterial = { friction: 0.6, restitution: 0.3 },
    position = null,
    auto_collider_mode = 0
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
      if (auto_collider_mode == 0) {
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
      } else if (auto_collider_mode == 1) {
        colliderShape = new BABYLON.PhysicsShapeConvexHull(node, scene);
        console.log(colliderShape);
      }
    }
    colliderShape.material = physicsMaterial;
    this.body.shape = colliderShape;
    this.body.disablePreStep = false;
    //}, spawnPosition = null, spawnRotation = null) {

    this.node.plateauObj = this;
    this.node.dragged = false;

    this.straightenAtPickup = true;
    this.isFlipable = true;

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

  animateRotation(targetQuaternion, angularspeed = 270) {
    var vecUp = this.node.up;
    var destUp = new BABYLON.Vector3(0, 1, 0);
    new BABYLON.Vector3(0, 1, 0).rotateByQuaternionToRef(
      targetQuaternion,
      destUp
    );

    vecUp.normalize();
    destUp.normalize();
    var rotaAxis = vecUp.cross(destUp);
    var angleRad = 0.0;
    if (rotaAxis.length() > 0.00001) {
      rotaAxis.normalize();
      angleRad = Math.abs(
        BABYLON.Vector3.GetAngleBetweenVectors(vecUp, destUp, rotaAxis)
      );
    } else {
      angleRad = BABYLON.Tools.ToRadians(
        angleDegreesBetweenTwoUnitVectors(vecUp, destUp)
      );
    }

    var dist = BABYLON.Tools.ToDegrees(angleRad);

    var nbf = (dist * 600) / angularspeed;

    if (this.rotationAnimation) {
      let toRotate = this.rotationAnimation.animatables[0].target;
      toRotate.rotateAnimStart.copyFrom(toRotate.rotationQuaternion);
      toRotate.rotateAnimTarget.copyFrom(targetQuaternion);
      this.rotationAnimation.animations[0].currentValue = 0;
      this.rotationAnimation.animations[0].duration = nbf;
      this.rotationAnimation.restart();
      return;
    }

    let toRotate = this.node;
    toRotate.rotateAnimValue = 0.0;
    toRotate.rotateAnimStart = new BABYLON.Quaternion();
    toRotate.rotateAnimStart.copyFrom(toRotate.rotationQuaternion);
    toRotate.rotateAnimTarget = new BABYLON.Quaternion();
    toRotate.rotateAnimTarget.copyFrom(targetQuaternion);

    this.rotationAnimation = anime({
      targets: toRotate,
      rotateAnimValue: 1.0,
      //rotationQuaternion: destRot,
      easing: "linear",
      duration: nbf,
      update: function (v) {
        BABYLON.Quaternion.SlerpToRef(
          toRotate.rotateAnimStart,
          toRotate.rotateAnimTarget,
          toRotate.rotateAnimValue,
          toRotate.rotationQuaternion
        );
      },
    });

    this.rotationAnimation.complete = function () {
      toRotate.plateauObj.rotationAnimation = null;
    };
  }

  stopAnimationMode() {
    // TODO: Clear all current animations
    this.body.disablePreStep = true;
    this.body.setMotionType(BABYLON.PhysicsMotionType.DYNAMIC);
  }

  orientUpTo(destUp = BABYLON.Vector3.Up()) {
    var destRot = new BABYLON.Quaternion(0, 0, 0, 1);
    var addrot = computeVectortoVectorRotationQuaternion(this.node.up, destUp);
    addrot.multiplyToRef(this.node.rotationQuaternion, destRot);
    this.animateRotation(destRot);
  }

  animateFlip(worldAxis) {
    var curAngle = angleDegreesBetweenTwoUnitVectors(
      this.node.up,
      BABYLON.Vector3.Up()
    );

    var dstUp = curAngle < 90 ? BABYLON.Vector3.Down() : BABYLON.Vector3.Up();

    var quat = computeVectortoVectorRotationQuaternion(
      this.node.up,
      dstUp,
      worldAxis
    );
    var destRot = new BABYLON.Quaternion(0, 0, 0, 1);
    quat.multiplyToRef(this.node.rotationQuaternion, destRot);
    this.animateRotation(destRot);
  }

  flip() {
    if (!this.isFlipable) return;

    if (!this.node.dragged) return; // For now only if handled

    this.animateFlip(this.node.forward);
  }

  onPickup() {
    if (this.straightenAtPickup) {
      this.orientUpTo();
    }
  }

  onRelease() {}
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

    const pbr = new BABYLON.PBRMaterial("cardMaterial", scene);
    pbr.albedoColor = new BABYLON.Color3(0.8, 0.8, 0.8);
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

  static createCardShape(
    w = 0.572,
    h = 0.889,
    thickness = 0.004,
    cRad = 0.05,
    cN = 4,
    frontUvs = new BABYLON.Vector4(0, 0, 1, 1),
    backUvs = new BABYLON.Vector4(0, 0, 1, 1)
  ) {
    var shape = [];

    var tmp = h;
    h = w;
    w = tmp;

    function arcFan(cx, cy, r, start, end, nb) {
      var inc = (end - start) / nb;

      for (var a = start + inc; a < end; a += inc) {
        shape.push(
          new BABYLON.Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.0)
        );
      }
    }

    shape.push(new BABYLON.Vector3(-w * 0.5, h * 0.5 - cRad, 0.0));
    shape.push(new BABYLON.Vector3(-w * 0.5, -h * 0.5 + cRad, 0.0));

    arcFan(-w * 0.5 + cRad, -h * 0.5 + cRad, cRad, Math.PI, Math.PI * 1.5, cN);

    shape.push(new BABYLON.Vector3(-w * 0.5 + cRad, -h * 0.5, 0.0));
    shape.push(new BABYLON.Vector3(w * 0.5 - cRad, -h * 0.5, 0.0));

    arcFan(
      w * 0.5 - cRad,
      -h * 0.5 + cRad,
      cRad,
      Math.PI * 1.5,
      Math.PI * 2,
      cN
    );

    shape.push(new BABYLON.Vector3(w * 0.5, -h * 0.5 + cRad, 0.0));
    shape.push(new BABYLON.Vector3(w * 0.5, h * 0.5 - cRad, 0.0));

    arcFan(w * 0.5 - cRad, h * 0.5 - cRad, cRad, 0, Math.PI * 0.5, cN);

    shape.push(new BABYLON.Vector3(w * 0.5 - cRad, h * 0.5, 0.0));
    shape.push(new BABYLON.Vector3(-w * 0.5 + cRad, h * 0.5, 0.0));

    arcFan(-w * 0.5 + cRad, h * 0.5 - cRad, cRad, Math.PI * 0.5, Math.PI, cN);

    var path = [
      new BABYLON.Vector3(0, thickness * 0.5, 0),
      new BABYLON.Vector3(0, -thickness * 0.5, 0),
    ];
    const options = {
      shape: shape, //vec3 array with z = 0,
      path: path, //vec3 array
      // rotationFunction: rotFn,
      // scaleFunction: scaleFn,
      updatable: true,
      closeShape: true,
      cap: BABYLON.Mesh.CAP_ALL,
      //sideOrientation: BABYLON.Mesh.DOUBLESIDE,
    };

    let extruded = BABYLON.MeshBuilder.ExtrudeShapeCustom(
      "ext",
      options,
      scene
    ); //scene is

    const positions = extruded.getVerticesData(
      BABYLON.VertexBuffer.PositionKind
    );
    const uvs = extruded.getVerticesData(BABYLON.VertexBuffer.UVKind);
    const numVertices = positions.length / 3;
    for (let i = 0; i < numVertices; i++) {
      const x = positions[i * 3 + 0];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];

      var uv = y > 0 ? frontUvs : backUvs;
      // TODO: borders (use normals)

      uvs[i * 2] = -(x - h * 0.5) / h;
      if (y < 0) uvs[i * 2] = 1.0 - uvs[i * 2];

      uvs[i * 2] = uvs[i * 2] * (uv.z - uv.x) + uv.x;

      uvs[i * 2 + 1] = -(z - w * 0.5) / w;
      //if (y < 0) uvs[i * 2 + 1] = 1.0 - uvs[i * 2 + 1];
      uvs[i * 2 + 1] = uvs[i * 2 + 1] * (uv.w - uv.y) + uv.y;
    }

    extruded.setVerticesData(BABYLON.VertexBuffer.UVKind, uvs);

    return extruded;
  }

  constructor(
    position = null,
    num = 32,
    numBack = 54,
    width = 0.572,
    height = 0.889,
    thickness = 0.004,
    cornerRadius = 0.05,
    cornerSegments = 4
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

    var box = Card.createCardShape(
      width,
      height,
      thickness,
      cornerRadius,
      cornerSegments,
      uv(num),
      uv(numBack)
    );

    if (position) box.position.copyFrom(position);
    box.material = Card.cardMaterial; //scene.getMaterialByName("default_material");

    super(box);
    //this.straightenAtPickup = false;
  }

  onPickup() {
    if (this.straightenAtPickup) {
      // Same as standard but keep closest face up or down
      var curAngle = angleDegreesBetweenTwoUnitVectors(
        this.node.up,
        BABYLON.Vector3.Up()
      );

      var dstUp = curAngle < 90 ? BABYLON.Vector3.Up() : BABYLON.Vector3.Down();

      this.orientUpTo(dstUp);
    }
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
    pbr.clearCoat.bumpTexture = textureNorm;
    pbr.clearCoat.bumpTexture.level = 2;

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

    this.straightenAtPickup = false;
    this.isFlipable = false;
  }
}
