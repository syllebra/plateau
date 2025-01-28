class Bag extends PlateauObject {
  static {
    registerPreload(async () => {
      {
        await Bag.loadMeshes();
      }
    });
  }

  static bagMesh = null;
  static async loadMeshes() {
    var modelNameAndExtension = "pouch_01.glb";
    const container = await BABYLON.loadAssetContainerAsync("models/" + modelNameAndExtension, scene);
    this.bagMesh = container.meshes[1];
    //var orig = this.bagMesh.material;
    // var pbr = new BABYLON.PBRMaterial("bagMaterial", scene);
    // console.log(orig);
    // pbr.albedoTexture = orig.albedoTexture;
    // pbr.metallic = 0;
    // pbr.roughness = 1.0;

    //this.bagMesh.material = pbr;
    //this.diceColliderMesh = container.meshes[2];
  }

  objects = [];
  constructor(model = null, collider = null, position = null) {
    if (model == null) model = Bag.bagMesh.clone("bag");
    super(model, collider, { friction: 0.6, restitution: 0.0 }, position, 1);

    this.canReceive = true;
  }

  addObject(po, position = -1) {
    // Add an object inside the bag, at a given position
    po.startAnimationMode();
    po.setEnabled(false, false);
    po.pickable = false;

    po.node.position = new BABYLON.Vector3(1000, 1000, 1000); //this.node.position;
    //po.node.rotationQuaternion = this.node.rotationQuaternion;

    position = position >= 0 ? position : this.objects.length;
    this.objects.splice(position, 0, po);
    //this.objects.addChild(po.node);
  }

  received(po) {
    console.log(po.node.name + " put in bag " + this.node.name);
    this.addObject(po);
  }

  popObject() {
    var obj = this.objects.pop();
    if (obj) {
      obj.setEnabled(true, true);
      //      obj.stopAnimationMode();
      obj.pickable = true;

      var bs0 = this.getBoundingInfos().boundingSphere;
      var bs1 = obj.getBoundingInfos().boundingSphere;
      console.log(obj.getBoundingInfos());
      var pos = bs0.centerWorld;
      pos.y += bs0.radiusWorld + bs1.radiusWorld;
      obj.node.position.copyFrom(pos);
    }
    return obj;
  }

  checkSubPick(pickInfo = null) {
    if (shiftKeyDown || controlKeyDown || SelectionHandler.isSelected(this)) return this;
    var pop = this.popObject();
    return pop ? pop : this;
  }
}
