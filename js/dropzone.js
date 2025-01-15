class DropZone {
  static {
    registerPreload(async () => {
      {
        DropZone.createDropZoneMaterial();
      }
    });
  }
  static defaultMaterial = null;
  static async createDropZoneMaterial() {
    const pbr = new BABYLON.PBRMaterial("dropZoneMaterial", scene);

    pbr.metallic = 0;
    pbr.roughness = 1.0;

    var txt = new BABYLON.Texture("textures/others/selection.png", scene, true, false);
    pbr.albedoColor = new BABYLON.Color3(1, 0, 0);
    pbr.albedoTexture = txt;
    pbr.alpha = 0.6;
    // pbr.emissiveColor = new BABYLON.Color3(1, 0.5, 0.5);
    // pbr.emissiveTexture = txt;
    pbr.backFaceCulling = true;
    this.defaultMaterial = pbr;
    return pbr;
  }

  static ShowInRadius(position, radius) {
    for (var z of this.all) {
      var p0 = z.node.absolutePosition.clone();
      var p1 = position.clone();
      p0.y = 0;
      p1.y = 0;
      var inRadius = BABYLON.Vector3.Distance(p0, p1) < radius;
      if (inRadius && !z.node.isEnabled()) z.setEnabled(true);
      if (!inRadius && z.node.isEnabled()) z.setEnabled(false);
    }
  }

  static HideAll() {
    for (var z of this.all) {
      z.setEnabled(false);
    }
  }

  static all = new Set();
  canReceive = true;
  node = null;

  constructor() {
    DropZone.all.add(this);
  }

  static FromNode(node) {
    var z = new DropZone();
    z.node = node;
    z.node.dropZone = this;
    z.setEnabled(false);
    return z;
  }

  static CreateRectangularZone(
    width = 1.0,
    height = 1.0,
    thickness = 0.01,
    parent = null,
    localPosition = BABYLON.Vector3.Zero(),
    localRotation = BABYLON.Quaternion.Identity()
  ) {
    //const plane = BABYLON.MeshBuilder.CreatePlane("plane", { width: width, height: height }, scene);
    var plane = createCardShape(width, height, thickness, 0.04, 4);
    planarUVProjectXZ(plane);
    plane.parent = parent;
    plane.position = localPosition;
    plane.rotationQuaternion = localRotation;
    plane.material = this.defaultMaterial;
    return this.FromNode(plane);
  }

  setEnabled(b) {
    if (this.node) this.node.setEnabled(b);
  }
}
