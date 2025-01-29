class DropZone {
  static {
    registerPreload(async () => {
      {
        DropZone.createDropZoneMaterial();
      }
    });
  }
  static defaultMaterial = null;
  static hoveredMaterial = null;
  static async createDropZoneMaterial() {
    const pbr = new BABYLON.PBRMaterial("dropZoneMaterial", scene);

    pbr.metallic = 0;
    pbr.roughness = 1.0;

    var txt = new BABYLON.Texture("textures/others/selection.png", scene, true, false);
    pbr.albedoColor = new BABYLON.Color3(0.5, 0.0, 0.5);
    pbr.albedoTexture = txt;
    pbr.alpha = 0.6;
    // pbr.emissiveColor = new BABYLON.Color3(1, 0.5, 0.5);
    // pbr.emissiveTexture = txt;
    pbr.backFaceCulling = true;
    this.defaultMaterial = pbr;
    this.hoveredMaterial = pbr.clone();
    this.hoveredMaterial.albedoColor = new BABYLON.Color3(0.5, 1, 0.5);
    return pbr;
  }

  static ShowInRadius(position, radius, predicate = null) {
    for (var z of this.all) {
      if (predicate && !predicate(z)) {
        if (z.isEnabled()) z.setEnabled(false);
        continue;
      }
      var p0 = z.node.absolutePosition.clone();
      var p1 = position.clone();
      p0.y = 0;
      p1.y = 0;
      var inRadius = BABYLON.Vector3.Distance(p0, p1) < radius;

      if (inRadius) {
        var po = PlateauObject.GetTopMost(z.node);
        if (po) po.updateZones();
      }

      if (inRadius && !z.isEnabled()) z.setEnabled(true);
      if (!inRadius && z.isEnabled()) z.setEnabled(false);
    }
  }

  static CheckCurrentDrop(position, obj = null) {
    var dz = DropZone.GetHovered(position, obj);
    for (var z of this.all) {
      if (z.node) z.node.material = z == dz ? this.hoveredMaterial : this.defaultMaterial;
    }
  }

  static HideAll() {
    for (var z of this.all) {
      z.setEnabled(false);
    }
  }

  static all = new Set();
  canReceive = true;
  acceptedClasses = new Set();
  forceOrientation = false;
  node = null;

  constructor() {
    DropZone.all.add(this);
  }

  clone(parent = null) {
    let ret = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    //ret.node = parent;
    ret.node = this.node.clone();
    ret.node.dropZone = ret;
    ret.node.parent = parent;
    ret.node.position = this.node.position.clone();
    ret.node.rotationQuaternion = this.node.rotationQuaternion.clone();
    ret.setEnabled(false);
    DropZone.all.add(ret);
  }

  dispose() {
    DropZone.all.delete(this);
    this.node.dispose();
  }

  static FromNode(node) {
    var z = new DropZone();
    z.node = node;
    z.node.dropZone = z;
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

  static GetHovered(position, obj = null) {
    var ray = new BABYLON.Ray(position, new BABYLON.Vector3(0, -10000, 0));

    var pi = scene.pickWithRay(
      ray,
      (mesh, i) => mesh.dropZone && mesh.dropZone.isEnabled() && mesh != Pointer.pointer && mesh.dropZone.accept(obj)
    );
    if (!pi.hit) return null;
    return pi.pickedMesh.dropZone;
  }

  setEnabled(b) {
    if (this.node) this.node.setEnabled(b);
  }

  isEnabled(b) {
    return this.node && this.node.isEnabled();
  }

  accept(obj) {
    if (!this.canReceive) return false;
    if (this.acceptedClasses.size == 0) return true;
    for (var cl of this.acceptedClasses) if (obj instanceof cl) return true;
    return false;
  }
}
