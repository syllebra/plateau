class Zone {
  node = null;
  constructor(
    pos = BABYLON.Vector3.Zero(),
    rot = BABYLON.Quaternion.Identity(),
    scale = BABYLON.Vector3.One(),
    color = BABYLON.Color3.Blue()
  ) {
    this.node = BABYLON.MeshBuilder.CreateBox("box", {}, scene); //scene is optional and
    var mat = new BABYLON.StandardMaterial("box_material", scene);
    mat.diffuseColor = color;
    mat.ambientColor = new BABYLON.Color3(0.1, 0.1, 0.2);
    mat.emissiveColor = new BABYLON.Color3(color.r * 0.5, color.g * 0.5, color.b * 0.5);
    mat.alpha = 0.15;
    mat.backFaceCulling = false;
    this.node.material = mat;
    this.node.showBoundingBox = true;

    this.node.position = pos;
    this.node.rotationQuaternion = rot;
    this.node.scaling = scale;
  }
}
