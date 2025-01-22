class TTSImporter {
  static SNAP_POINT_SIZE = 0.1;
  static UNIT_MULTIPLIER = 0.1;
  static FAR_POSITION = new BABYLON.Vector3(1000, 1000, 1000);

  static textures = new Map();
  static meshes = new Map();

  static importFile(url) {
    var json = null;
    fetch(url)
      .then((response) => response.text())
      .then((data) => {
        TTSImporter.import(JSON.parse(data));
        //console.log(json);
      })
      .catch((error) => console.error(error));
  }
  static async import(jsonObj) {
    console.log(jsonObj);
    console.log("LOADING...");
    // TTS SnapPoints > Plateau drop zones
    for (var sp of jsonObj.SnapPoints) {
      var pos = sp.Position;
      if (pos) {
        pos = new BABYLON.Vector3(
          pos.x * this.UNIT_MULTIPLIER,
          pos.y * this.UNIT_MULTIPLIER,
          pos.z * this.UNIT_MULTIPLIER
        );
      }
      var rot = sp.Rotation;
      if (rot) {
        rot = BABYLON.Quaternion.FromEulerAngles(
          BABYLON.Tools.ToRadians(rot.x),
          BABYLON.Tools.ToRadians(rot.y),
          BABYLON.Tools.ToRadians(rot.z)
        );
      }
      var dz = DropZone.CreateRectangularZone(this.SNAP_POINT_SIZE, this.SNAP_POINT_SIZE, 0.01, null, pos, rot);
      dz.forceOrientation = rot == null;
    }

    // for (var o of jsonObj.ObjectStates) {
    //   this.importObject(o);
    // }

    const promises = [];
    for (var o of jsonObj.ObjectStates) {
      promises.push(this.importObject(o));
    }

    await Promise.all(promises);
    console.log("LOADING FINISHED !!!");
    console.log(this.textures);
    console.log(this.meshes);
  }

  static async importObject(o) {
    var plateauObj = null;
    switch (o.Name) {
      case "Custom_Model":
        //plateauObj = await this.importCustomModel(o);
        break;
      case "Custom_Dice":
        plateauObj = await this.importCustomDice(o);
        break;
    }

    if (plateauObj) {
      // TODO: common parameters
    }

    return plateauObj;
  }

  static _tts_transform_to_node(tr, node = null) {
    var pos = new BABYLON.Vector3(tr.posX, tr.posY, tr.posZ);
    pos = pos.multiplyByFloats(this.UNIT_MULTIPLIER, this.UNIT_MULTIPLIER, this.UNIT_MULTIPLIER);
    var scale = new BABYLON.Vector3(tr.scaleX, tr.scaleY, tr.scaleZ);
    scale = scale.multiplyByFloats(this.UNIT_MULTIPLIER, this.UNIT_MULTIPLIER, this.UNIT_MULTIPLIER);
    var rot = BABYLON.Quaternion.FromEulerAngles(
      BABYLON.Tools.ToRadians(tr.rotX),
      BABYLON.Tools.ToRadians(tr.rotY),
      BABYLON.Tools.ToRadians(tr.rotZ)
    );
    if (node) {
      node.position = pos;
      node.rotationQuaternion = rot;
      node.scaling = scale;
    }

    return { pos: pos, rot: rot, scale: scale };
  }

  static async importCustomModel(o) {
    var cmr = await this.importCustomMeshResources(o.CustomMesh);
    if (cmr.mesh) {
      var name = o.GUID + "_" + o.Nickname;
      try {
        var mesh = cmr.mesh.clone();
        this._tts_transform_to_node(o.Transform, mesh);
        console.log(mesh);

        const pbr = new BABYLON.PBRMaterial(name + " Material", scene);
        pbr.albedoColor = new BABYLON.Color3(o.ColorDiffuse.r * 0.8, o.ColorDiffuse.g * 0.8, o.ColorDiffuse.b * 0.8);
        pbr.metallic = 0;
        pbr.roughness = 0.5;
        if (cmr.diffuse) pbr.albedoTexture = cmr.diffuse;
        mesh.material = pbr;

        var meshCol = null;
        // var meshCol = cmr.colliderMesh?.clone();
        // if (meshCol) {
        // this._tts_transform_to_node(o.Transform, meshCol);
        // }
        var cm = new PlateauObject(mesh, meshCol, { friction: 0.6, restitution: 0.3 }, null, 1);
        cm.node.id = cm.node.name = name;
        return cm;
      } catch (e) {
        console.warn("Error occurred while creating ", name, e);
        return null;
      }
    }
    return null;
  }

  static async importCustomMeshResources(o) {
    var cmr = {};
    if (o.DiffuseURL && o.DiffuseURL != "") cmr.diffuse = this.importTexture(o.DiffuseURL);
    if (o.NormalURL && o.NormalURL != "") cmr.normal = this.importTexture(o.NormalURL);

    if (o.MeshURL && o.MeshURL != "") cmr.mesh = await this.importMesh(o.MeshURL);
    if (o.ColliderURL && o.ColliderURL != "") cmr.colliderMesh = await this.importMesh(o.ColliderURL);
    return cmr;
  }

  static async importCustomDice(o) {
    console.log(o);
    var texture = null;
    if (o.CustomImage?.ImageURL) texture = await this.importTexture(o.CustomImage.ImageURL, true);
    var name = o.GUID + "_" + o.Nickname;
    try {
      const pbr = new BABYLON.PBRMaterial(name + " Material", scene);
      pbr.albedoColor = new BABYLON.Color3(o.ColorDiffuse.r * 0.8, o.ColorDiffuse.g * 0.8, o.ColorDiffuse.b * 0.8);
      pbr.metallic = 0;
      pbr.roughness = 1.0;
      pbr.clearCoat.isEnabled = true;
      pbr.clearCoat.intensity = 1.0;
      console.log(texture);
      if (texture) pbr.albedoTexture = texture;

      var tr = this._tts_transform_to_node(o.Transform);
      // TODO: physics material?
      // TODO: Face orientations?
      // Note: for now does ot support non cubic dices...
      var po = new Dice(tr.pos, tr.scale.x);
      po.node.rotationQuaternion = tr.rot;
      po.node.material = pbr;
      po.node.id = po.node.name = name;

      console.log("NEW OBJECT:", po.node);
      return po;
    } catch (e) {
      console.warn("Error occurred while creating ", name, e);
      return null;
    }
    return null;
  }

  static importTexture(url, flip = false) {
    if (!this.textures.has(url)) {
      var tex = null;
      if (flip) tex = new BABYLON.Texture(url, scene, true, false);
      else tex = new BABYLON.Texture(url, scene);
      this.textures.set(url, tex);
    }
    return this.textures.get(url);
  }

  static async importMesh(url) {
    if (this.meshes.has(url)) return this.meshes[url];
    try {
      var tst = await BABYLON.SceneLoader.LoadAssetContainerAsync(url, null, scene, null, ".obj");
      if (!tst) return null;

      //console.log("tst:", tst.meshes.length);
      this.meshes.set(url, tst.meshes[0]);
      return this.meshes.get(url);
    } catch {
      return null;
    }
  }
}
