class Dice extends PlateauObject {
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
    const customProcText = new BABYLON.CustomProceduralTexture("dice_dynamic_texture", "textures/dice", 256, scene);
    console.log(customProcText._uniforms);
    const pbr = new BABYLON.PBRMaterial("diceMaterial", scene);

    pbr.metallic = 0;
    pbr.roughness = 1.0;

    pbr.clearCoat.isEnabled = true;
    pbr.clearCoat.intensity = 1.0;

    const textureNorm = new BABYLON.Texture("textures/dice/D6_N.jpg", scene, true, false);
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
    const container = await BABYLON.loadAssetContainerAsync("models/" + modelNameAndExtension, scene);
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

    Dice.diceColliderMesh.scaling.copyFrom(dice.scaling);
    var diceShape = new BABYLON.PhysicsShapeConvexHull(
      Dice.diceColliderMesh, // mesh from which to produce the convex hull
      scene // scene of the shape
    );

    super(dice, diceShape);
    this.updateBoundingInfos();

    if (position) dice.position.copyFrom(position);

    this.straightenAtPickup = false;
    this.isFlippable = false;
  }

  get preferedFrontVector() {
    return BABYLON.Vector3.Down();
  }
  get preferedUpVector() {
    return BABYLON.Vector3.Forward();
  }
}
