class PhysicObject {
  body = null;
  node = null;
  constructor(
    node,
    colliderShape = null,
    physicsMaterial = { friction: 0.6, restitution: 0.3 },
    position = null
  ) {
    if (position) node.position = position;
    this.node = node;
    shadowGen.addShadowCaster(node);
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
  }

  setEnabled(b) {
    this.node.setEnabled(b);
    this.body._physicsPlugin.setPhysicsBodyEnabled(this.body, b);
  }
}

class Card extends PhysicObject {
  constructor(
    position = null,
    width = 0.572,
    height = 0.889,
    thickness = 0.004
  ) {
    const options = {
      // faceUV: diceUVs,
      // wrap: true,
      //size: 0.1
      width: width,
      height: thickness,
      depth: height,
    };

    var box = BABYLON.MeshBuilder.CreateBox("card", options);
    if (position) box.position.copyFrom(position);
    box.material = scene.getMaterialByName("default_material");
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
    const mat = new BABYLON.StandardMaterial("diceMaterial");
    const texture = new BABYLON.Texture(
      "textures/dice/D6.jpg",
      scene,
      true,
      false
    );
    const textureNorm = new BABYLON.Texture(
      "textures/dice/D6_N.jpg",
      scene,
      true,
      false
    );
    mat.diffuseTexture = customProcText;
    mat.bumpTexture = textureNorm;
    mat.ambientColor = new BABYLON.Color3(0.1, 0.1, 0.2);

    // var columns = 3;
    // var rows = 2;

    // const faceUV = new Array(6);

    // var dx = 1 / columns;
    // var dy = 1 / rows;
    // faceUV[3] = new BABYLON.Vector4(0 * dx, 0 * dy, 1 * dx, 1 * dy);
    // faceUV[1] = new BABYLON.Vector4(1 * dx, 0 * dy, 2 * dx, 1 * dy);
    // faceUV[2] = new BABYLON.Vector4(2 * dx, 0 * dy, 3 * dx, 1 * dy);
    // faceUV[0] = new BABYLON.Vector4(0 * dx, 1 * dy, 1 * dx, 2 * dy);
    // faceUV[4] = new BABYLON.Vector4(1 * dx, 1 * dy, 2 * dx, 2 * dy);
    // faceUV[5] = new BABYLON.Vector4(2 * dx, 1 * dy, 3 * dx, 2 * dy);

    this.diceMaterial = mat;
    return mat;
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
