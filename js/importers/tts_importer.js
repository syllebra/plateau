async function loadImage(url) {
  return new Promise((resolve, reject) => {
    let img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.crossOrigin = "Anonymous";
    img.src = url;
  });
}

class TTSImporter {
  static SNAP_POINT_SIZE = 0.1;
  static UNIT_MULTIPLIER = (0.1 * 2.54 * 14) / 20; // TODO: parametrizable scaler
  static FAR_POSITION = new BABYLON.Vector3(1000, 1000, 1000);
  static POS_OFFSET = new BABYLON.Vector3(0.0, -0.254, 0.0);
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

    const promises = [];
    for (var o of jsonObj.ObjectStates) {
      promises.push(this.importObject(o));
    }

    var objects = await Promise.all(promises);
    console.log("LOADING FINISHED !!!");
    console.log(this.textures);
    console.log(this.meshes);
    var nb = 0;
    for (var po of objects)
      if(po) nb++;
    console.log("LOADED Objects:", nb);

    setTimeout( function () {
    for (var po of objects) {
      if (po == null) continue;
      po.stopAnimationMode();
    }
  }, 3000);
    
  }

  static async importObject(o) {
    var plateauObj = null;
    switch (o.Name) {
      case "Custom_Model":
        plateauObj = await this.importCustomModel(o);
        break;
      case "Custom_Dice":
        plateauObj = await this.importCustomDice(o);
        break;
      case "Custom_Tile":
        plateauObj = await this.importCustomTile(o);
        break;
      case "Custom_Token":
        plateauObj = await this.importCustomToken(o);
        break;
      // case "Custom_Board":
      //   console.log(o);
      //   break;
      // case "backgammon_piece_white":
      //   console.log(o);
      //   break;
      default:
        console.warn(o.GUID+" => "+o.Name+" import is not implemented yet.")
        break;
    }

    if (plateauObj) {
      plateauObj.startAnimationMode();
      // TODO: common parameters
      plateauObj.description = o.Description;
    }

    return plateauObj;
  }

  static _tts_transform_to_node(tr, node = null) {
    var scale = new BABYLON.Vector3(tr.scaleX, tr.scaleY, tr.scaleZ);
    scale = scale.multiplyByFloats(this.UNIT_MULTIPLIER, this.UNIT_MULTIPLIER, this.UNIT_MULTIPLIER);
    var pos = new BABYLON.Vector3(tr.posX, tr.posY, tr.posZ);
    pos = pos.multiplyByFloats(this.UNIT_MULTIPLIER, this.UNIT_MULTIPLIER, -this.UNIT_MULTIPLIER);
    pos.x += this.POS_OFFSET.x;
    pos.y += this.POS_OFFSET.y;
    pos.z += this.POS_OFFSET.z;
    var rot = BABYLON.Quaternion.FromEulerAngles(
      BABYLON.Tools.ToRadians(tr.rotX),
      BABYLON.Tools.ToRadians(-tr.rotY + 180),
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
        cm.startAnimationMode();
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

      if (texture) pbr.albedoTexture = texture;

      var tr = this._tts_transform_to_node(o.Transform);
      // TODO: physics material?
      // TODO: Face orientations?
      // Note: for now does ot support non cubic dices...
      var po = new Dice(tr.pos, tr.scale.x);
      po.startAnimationMode();
      po.node.rotationQuaternion = tr.rot;
      po.node.material = pbr;
      po.node.id = po.node.name = name;

      return po;
    } catch (e) {
      console.warn("Error occurred while creating ", name, e);
      return null;
    }
    return null;
  }

  static async importCustomTile(o) {
    var frontTex = null;
    var backTex = null;
    if (o.CustomImage?.ImageURL && o.CustomImage.ImageURL != "")
      frontTex = this.importTexture(o.CustomImage.ImageURL, true);
    if (o.CustomImage?.ImageSecondaryURL && o.CustomImage.ImageSecondaryURL != "")
      backTex = this.importTexture(o.CustomImage.ImageSecondaryURL, true);
    var name = o.GUID + "_" + o.Nickname;

    try {
      var tr = this._tts_transform_to_node(o.Transform);
      var thickness = o.CustomImage.CustomTile.Thickness * this.UNIT_MULTIPLIER;
      var cm = null;
      switch (o.CustomImage.CustomTile.Type) {
        case 0:
          cm = ShapedObject.RoundedSquare(null, tr.scale.x * 2, tr.scale.z * 2, thickness, 0.01, 3, 0.008, 3);
          cm.startAnimationMode();
          break;
        default:
          console.warn("Custom tile type not implemented yet:" + o.GUID + " => " + o.CustomImage.CustomTile.Type);
      }
      cm.node.position = tr.pos;

      const pbr = new BABYLON.PBRMaterial(name + " Material", scene);
      pbr.albedoColor = new BABYLON.Color3(o.ColorDiffuse.r * 0.8, o.ColorDiffuse.g * 0.8, o.ColorDiffuse.b * 0.8);
      pbr.metallic = 0;
      pbr.roughness = 0.15;

      var backMat = null;
      if (backTex) {
        backMat = pbr.clone(pbr.name + "_back");
        backMat.albedoTexture = backTex;
      }
      if (frontTex) pbr.albedoTexture = frontTex;
      cm.setMaterial(pbr, backMat);
      cm.body.material = { friction: o.PhysicsMaterial.DynamicFriction, restitution: o.PhysicsMaterial.Bounciness };
      //var meshCol = null;
      // var meshCol = cmr.colliderMesh?.clone();
      // if (meshCol) {
      // this._tts_transform_to_node(o.Transform, meshCol);
      // }
      //var cm = new PlateauObject(mesh, meshCol, { friction: 0.6, restitution: 0.3 }, null, 1);
      cm.node.id = cm.node.name = name;
      return cm;
    } catch (e) {
      console.warn("Error occurred while creating ", name, e);
      return null;
    }
    return null;
  }

  static async importCustomToken(o) {
    console.log(o);
    var frontTex = null;
    //    var backTex = null;
    if (o.CustomImage?.ImageURL && o.CustomImage.ImageURL != "")
      frontTex = this.importTexture(o.CustomImage.ImageURL, true);

    var name = o.GUID + "_" + o.Nickname;

    //TODO: simplyfy threshold
    // polygon is now an array of {x,y} objects. Have fun!
    try {
      var image = await loadImage(o.CustomImage.ImageURL);

      var polygon = getImageOutline(image);

      var tr = TTSImporter._tts_transform_to_node(o.Transform);
      var thickness = o.CustomImage.CustomToken.Thickness * TTSImporter.UNIT_MULTIPLIER;
      var cm = null;
      var poly = [];

      // The reversed engineered is that output area should be 88 (in TTS space)
      var k = Math.sqrt(88 / (image.width * image.height)) / 2.54;
      for (var p of polygon) {
        var x = p.x - 0.5 * image.width;
        x *= tr.scale.x * k;
        var y = p.y - 0.5 * image.height;
        y *= tr.scale.z * k;
        poly.push(new BABYLON.Vector3(x, y, 0.0));
      }

      cm = new ShapedObject(null, poly, null, thickness, 0, 1);
      cm.startAnimationMode();
      cm.node.position = tr.pos;
      cm.node.rotationQuaternion = tr.rot;

      var sx = cm.getBoundingInfos().boundingBox.extendSizeWorld.x * 2;
      var sz = cm.getBoundingInfos().boundingBox.extendSizeWorld.z * 2;

      const pbr = new BABYLON.PBRMaterial(name + " Material", scene);
      pbr.albedoColor = new BABYLON.Color3(o.ColorDiffuse.r * 0.8, o.ColorDiffuse.g * 0.8, o.ColorDiffuse.b * 0.8);
      pbr.metallic = 0;
      pbr.roughness = 0.15;

      var backMat = null;
      // if(backTex) {
      //   backMat = pbr.clone(pbr.name+"_back");
      //   backMat.albedoTexture = backTex;
      // }
      if (frontTex) pbr.albedoTexture = frontTex;
      cm.setMaterial(pbr, backMat);
      //cm.body.material = { friction: o.PhysicsMaterial.DynamicFriction, restitution: o.PhysicsMaterial.Bounciness };
      //var meshCol = null;
      // var meshCol = cmr.colliderMesh?.clone();
      // if (meshCol) {
      // this._tts_transform_to_node(o.Transform, meshCol);
      // }
      //var cm = new PlateauObject(mesh, meshCol, { friction: 0.6, restitution: 0.3 }, null, 1);
      cm.node.id = cm.node.name = name;
      return cm;
    } catch (e) {
      console.warn("Error occurred while creating ", name, e);
      return null;
    }

    // var frontTex = null;
    // var backTex = null;
    // if (o.CustomImage?.ImageURL && o.CustomImage.ImageURL != "")
    //   frontTex = this.importTexture(o.CustomImage.ImageURL, true);
    // if (o.CustomImage?.ImageSecondaryURL && o.CustomImage.ImageSecondaryURL != "")
    //   backTex = this.importTexture(o.CustomImage.ImageSecondaryURL, true);
    // var name = o.GUID + "_" + o.Nickname;

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

      this.meshes.set(url, tst.meshes[0]);
      return this.meshes.get(url);
    } catch {
      return null;
    }
  }
}
