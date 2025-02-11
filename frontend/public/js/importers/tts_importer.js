async function loadImage(url) {
  //TODO: cache !!!
  var cached = await TTSImporter.cachedDownloadURL(url, "images");
  return new Promise((resolve, reject) => {
    let img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.crossOrigin = "Anonymous";
    img.src = cached;
  });
}

class TTSImporter {
  static SNAP_POINT_SIZE = 0.1;
  static UNIT_CONVERTER = 0.1;
  static IMPORT_SCALE = (2.54 * 14) / 20; // TODO: parametrizable scaler
  static UNIT_MULTIPLIER = TTSImporter.UNIT_CONVERTER * TTSImporter.IMPORT_SCALE;
  static FAR_POSITION = new BABYLON.Vector3(1000, 1000, 1000);
  static POS_OFFSET = new BABYLON.Vector3(0.0, -0.955 * TTSImporter.UNIT_MULTIPLIER, 0.0); // new BABYLON.Vector3(0.0, 0.0, 0.0);
  static textures = new Map();
  static meshes = new Map();

  static cacheSubDir = "";

  static failedObjects = [];

  static progressCallback = null;

  static importFile(url, callback, progressCB) {
    var json = null;
    TTSImporter.progressCallback = progressCB;
    fetch(url)
      .then((response) => response.text())
      .then((data) => {
        TTSImporter.cacheSubDir = getPageName(url);
        TTSImporter.import(JSON.parse(data)).then(() => {
          if (callback) callback();
        });
        //console.log(json);
      })
      .catch((error) => console.error(error));
  }
  static async import(jsonObj) {
    TTSImporter.failedObjects = [];
    console.log(jsonObj);
    console.log("LOADING...");

    // TTS SnapPoints > Plateau drop zones
    if (jsonObj.SnapPoints)
      for (var sp of jsonObj.SnapPoints) {
        TTSImporter.importSnapPoint(sp);
      }

    console.log("OBJECTS:", jsonObj.ObjectStates.length);

    // First import decks (which can be inside cards of contained objects)
    async function _recImportDecks(o) {
      //console.log(o);
      if (o.CustomDeck)
        await TTSImporter.importCustomDecks(o.CustomDeck).catch((err) => console.warn("Error when loading deck ", o));
      if (o.ContainedObjects) for (var oc of o.ContainedObjects) _recImportDecks(oc);
    }
    for (var o of jsonObj.ObjectStates) await _recImportDecks(o);

    console.log("Loaded Deck Atlases:", CardAtlas.all);

    const promises = [];
    for (var o of jsonObj.ObjectStates) {
      var prom = TTSImporter.importObject(o);
      prom.object = o;
      promises.push(prom);
    }

    let progress = 0;
    promises.forEach(
      (p) =>
        p.then(() => {
          progress++;
          p.finished = true;
          if (TTSImporter.progressCallback) TTSImporter.progressCallback(progress, promises.length);
          // // Debug for blocking objects
          // if (progress > promises.length - 20) {
          //   var tmp = new Set();
          //   for (var of of TTSImporter.failedObjects) if (!tmp.has(of.GUID)) tmp.add(of.GUID);
          //   for (var prom of promises)
          //     if (!prom.finished)
          //       console.log(prom.object, " not finished" + (tmp.has(prom.object.GUID) ? " - FAILED" : " pending"));
          //   //console.log("FAILED:", TTSImporter.failedObjects);
          // }
        })
      //.catch((reason) => console.error(reason, p.object))
    );

    var results = await Promise.allSettled(promises);

    console.log("LOADING FINISHED !!!");
    console.log(TTSImporter.textures);
    console.log(TTSImporter.meshes);
    console.log(CardAtlas.all);
    var nb = 0;
    for (var r of results) if (r.status != "rejected" && r.value) nb++;
    console.log("LOADED Objects:", nb, "/", jsonObj.ObjectStates.length);

    setTimeout(function () {
      for (var r of results) {
        if (r.status == "rejected" || r.value == null) {
          //console.log("Object non loaded:", )
          continue;
        }
        for (var po of r.value) {
          if (po == null) continue;

          if (po.hasOwnProperty("stopAnimationMode")) po.stopAnimationMode();
        }
      }
    }, 3000);
  }

  static importSnapPoint(sp, parent = null, parentTTS = null) {
    var pos = sp.Position;

    if (pos) {
      pos = new BABYLON.Vector3(pos.x, pos.y, pos.z);
      if (!parent) {
        pos = pos.multiplyByFloats(
          TTSImporter.UNIT_MULTIPLIER,
          TTSImporter.UNIT_MULTIPLIER,
          -TTSImporter.UNIT_MULTIPLIER
        );
        pos.x += TTSImporter.POS_OFFSET.x;
        pos.y += TTSImporter.POS_OFFSET.y;
        pos.z += TTSImporter.POS_OFFSET.z;
      } else {
        var tr = TTSImporter._tts_transform_to_node(parentTTS.Transform);
        pos = pos.multiplyByFloats(
          -tr.scale.x,
          tr.scale.y * 2, // TODO: more generic
          tr.scale.z
        );
      }
    }
    var rot = sp.Rotation;
    if (rot) {
      rot = BABYLON.Quaternion.FromEulerAngles(
        BABYLON.Tools.ToRadians(rot.x),
        BABYLON.Tools.ToRadians(-rot.y + 180),
        BABYLON.Tools.ToRadians(rot.z)
      );
    }
    var dz = DropZone.CreateRectangularZone(
      TTSImporter.SNAP_POINT_SIZE,
      TTSImporter.SNAP_POINT_SIZE,
      0.01,
      parent,
      pos,
      rot
    );
    dz.forceOrientation = rot == null;
    return dz;
  }

  static async importObject(o) {
    var plateauObj = null;

    var only = new Set(["Token", "Model", "Stack"]); //,"Card","Deck"]);//, "Custom_Token"]);
    only = null;
    if (only) {
      var isIncluded = false;
      for (var included of only) {
        if (o.Name.includes(included)) {
          isIncluded = true;
          break;
        }
      }
      if (!isIncluded) return null;
    }

    try {
      switch (o.Name) {
        case "Custom_Model":
          plateauObj = await TTSImporter.importCustomModel(o);
          break;
        case "Custom_Dice":
          plateauObj = await TTSImporter.importCustomDice(o);
          break;
        case "Custom_Tile":
          plateauObj = await TTSImporter.importCustomTile(o);
          break;
        case "Custom_Token":
          //if (o.Nickname.includes("Red") || o.Nickname.includes("Green"))
          //if (o.Transform.posX < -60)
          plateauObj = await TTSImporter.importCustomToken(o);
          break;
        case "Custom_Board":
          plateauObj = await TTSImporter.importCustomBoard(o);
          break;
        case "backgammon_piece_white":
          plateauObj = await TTSImporter.importBackgammonPiece(o);
          break;
        case "Custom_Token_Stack":
          plateauObj = await TTSImporter.importSimpleStack(o, TTSImporter.importCustomToken);
          break;
        case "Custom_Model_Stack":
          plateauObj = await TTSImporter.importSimpleStack(o, TTSImporter.importCustomModel);
          break;
        case "CardCustom":
        case "Card":
          plateauObj = await TTSImporter.importCard(o);
          break;
        case "DeckCustom":
        case "Deck":
          plateauObj = await TTSImporter.importDeck(o);
          break;
        case "Bag":
        case "Infinite_Bag":
        case "Custom_Model_Bag":
        case "Custom_Model_Infinite_Bag":
          plateauObj = await TTSImporter.importBag(o);
          break;
        case "3DText":
          plateauObj = await TTSImporter.import3DText(o);
          break;
        case "Notecard":
          plateauObj = await TTSImporter.importNoteCard(o);
          break;
        case "PlayerPawn":
          plateauObj = await TTSImporter.importMeshedObject(o, "models/playerpawn_01.glb");
          break;
        case "Custom_PDF":
          plateauObj = await TTSImporter.importPDF(o);
          break;
        case "HandTrigger":
        case "ScriptingTrigger":
        case "RandomizeTrigger":
          var tr = TTSImporter._tts_transform_to_node(o.Transform);
          plateauObj = new Zone(
            tr.pos,
            tr.rot,
            tr.scale,
            new BABYLON.Color3(o.ColorDiffuse.r, o.ColorDiffuse.g, o.ColorDiffuse.b)
          );
          break;
        case "Figurine_Custom":
          plateauObj = await TTSImporter.importCustomFigurine(o);
          break;
        default:
          console.warn(o.GUID + " => " + o.Name + " import is not implemented yet.");
          break;
      }
    } catch (err) {
      console.warn(err, o.Nickname, " - ", o);
      TTSImporter.failedObjects.push(o);
      //return null;
    }

    if (!plateauObj) {
      console.warn(o.Nickname, " - ", o.GUID, "returned null", o);
      TTSImporter.failedObjects.push(o);
      return null;
    }

    var objects = plateauObj instanceof Array ? plateauObj : [plateauObj];

    for (var po of objects) {
      if (po.hasOwnProperty("startAnimationMode")) po.startAnimationMode(); // Block physics while loading
      TTSImporter.genericImports(po, o);
      //console.log("Created ", po.uuid);
    }
    return objects;
  }

  static genericImports(po, o) {
    // Common variables
    po.description = o.Description;
    po.locked = o.Locked ? o.Locked : false;

    if (o.AttachedSnapPoints) {
      for (var sp of o.AttachedSnapPoints) {
        var dz = TTSImporter.importSnapPoint(sp, po.node, o);
      }
    }
  }

  static _tts_transform_to_node(tr, node = null) {
    var scale = new BABYLON.Vector3(tr.scaleX, tr.scaleY, tr.scaleZ);
    scale = scale.multiplyByFloats(
      TTSImporter.UNIT_MULTIPLIER,
      TTSImporter.UNIT_MULTIPLIER,
      TTSImporter.UNIT_MULTIPLIER
    );
    var pos = new BABYLON.Vector3(tr.posX, tr.posY, tr.posZ);
    pos = pos.multiplyByFloats(TTSImporter.UNIT_MULTIPLIER, TTSImporter.UNIT_MULTIPLIER, -TTSImporter.UNIT_MULTIPLIER);
    pos.x += TTSImporter.POS_OFFSET.x;
    pos.y += TTSImporter.POS_OFFSET.y;
    pos.z += TTSImporter.POS_OFFSET.z;
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
    var cmr = await TTSImporter.importCustomMeshResources(o.CustomMesh);
    if (cmr.mesh) {
      var name = o.Nickname;

      var mesh = cmr.mesh.clone();
      TTSImporter._tts_transform_to_node(o.Transform, mesh);

      const pbr = new BABYLON.PBRMaterial(name + " Material", scene);
      pbr.albedoColor = new BABYLON.Color3(o.ColorDiffuse.r * 0.8, o.ColorDiffuse.g * 0.8, o.ColorDiffuse.b * 0.8);
      pbr.metallic = 0;
      pbr.roughness = 0.5;
      if (cmr.diffuse) pbr.albedoTexture = cmr.diffuse;
      mesh.material = pbr;

      var meshCol = null;
      // var meshCol = cmr.colliderMesh?.clone();
      // if (meshCol) {
      // TTSImporter._tts_transform_to_node(o.Transform, meshCol);
      // }
      var cm = new PlateauObject(mesh, meshCol, { friction: 0.6, restitution: 0.3 }, null, 1);
      cm.startAnimationMode();
      cm.node.id = cm.node.name = name;
      cm.uuid = o.GUID;
      return cm;
    }
    return null;
  }

  static async importBackgammonPiece(o) {
    var name = o.Nickname;

    var tr = TTSImporter._tts_transform_to_node(o.Transform);
    var height = 0.04;
    tr.pos.y -= height * 0.5;
    var cm = ShapedObject.Circle(tr.pos, 0.48 * tr.scale.x, height, 48, 0.006, 3);
    cm.node.position = tr.pos;
    cm.node.rotationQuaternion = tr.rot;

    const pbr = new BABYLON.PBRMaterial(name + " Material", scene);
    pbr.albedoColor = new BABYLON.Color3(o.ColorDiffuse.r * 0.8, o.ColorDiffuse.g * 0.8, o.ColorDiffuse.b * 0.8);
    pbr.metallic = 0;
    pbr.roughness = 0.1;
    cm.node.material = pbr;

    cm.node.id = cm.node.name = name;
    cm.uuid = o.GUID;
    return cm;
  }

  static async importCustomMeshResources(o) {
    var cmr = {};
    if (o.DiffuseURL && o.DiffuseURL != "") cmr.diffuse = await TTSImporter.importTextureAsync(o.DiffuseURL);
    if (o.NormalURL && o.NormalURL != "") cmr.normal = await TTSImporter.importTextureAsync(o.NormalURL);

    if (o.MeshURL && o.MeshURL != "") cmr.mesh = await TTSImporter.importMesh(o.MeshURL);
    if (o.ColliderURL && o.ColliderURL != "") cmr.colliderMesh = await TTSImporter.importMesh(o.ColliderURL);
    return cmr;
  }

  static async importCustomDice(o) {
    var texture = null;
    if (o.CustomImage?.ImageURL) texture = await TTSImporter.importTextureAsync(o.CustomImage.ImageURL, true);
    var name = o.Nickname;

    const pbr = new BABYLON.PBRMaterial(name + " Material", scene);
    pbr.albedoColor = new BABYLON.Color3(o.ColorDiffuse.r * 0.8, o.ColorDiffuse.g * 0.8, o.ColorDiffuse.b * 0.8);
    pbr.metallic = 0;
    pbr.roughness = 1.0;
    pbr.clearCoat.isEnabled = true;
    pbr.clearCoat.intensity = 1.0;

    if (texture) pbr.albedoTexture = texture;

    var tr = TTSImporter._tts_transform_to_node(o.Transform);
    // TODO: physics material?
    // TODO: Face orientations?
    // Note: for now does ot support non cubic dices...
    var po = new Dice(tr.pos, tr.scale.x);
    po.startAnimationMode();
    po.node.rotationQuaternion = tr.rot;
    po.node.material = pbr;
    po.node.id = po.node.name = name;
    po.uuid = o.GUID;
    return po;
  }

  static async importCustomTile(o) {
    var frontTex = null;
    var backTex = null;
    if (o.CustomImage?.ImageURL && o.CustomImage.ImageURL != "")
      frontTex = await TTSImporter.importTextureAsync(o.CustomImage.ImageURL, true);
    if (o.CustomImage?.ImageSecondaryURL && o.CustomImage.ImageSecondaryURL != "")
      backTex = await TTSImporter.importTextureAsync(o.CustomImage.ImageSecondaryURL, true);
    var name = o.Nickname;

    var tr = TTSImporter._tts_transform_to_node(o.Transform);
    var thickness = o.CustomImage.CustomTile.Thickness * TTSImporter.UNIT_MULTIPLIER;
    var cm = null;
    switch (o.CustomImage.CustomTile.Type) {
      case 0:
        cm = ShapedObject.RoundedSquare(
          null,
          (tr.scale.x * 2 * frontTex._texture.baseWidth) / frontTex._texture.baseHeight,
          tr.scale.z * 2,
          thickness,
          0.01,
          3,
          0.008,
          3
        );
        cm.startAnimationMode();
        break;
      case 1:
        cm = ShapedObject.Hexagon(null, tr.scale.x, thickness, 0.008, 3);
        cm.startAnimationMode();
        break;
      case 2:
        var segs = Math.ceil(tr.scale.x * Math.PI * 2 * 25);
        cm = ShapedObject.Circle(null, tr.scale.x, thickness, segs, 0.008, 3);
        cm.startAnimationMode();
        break;
      case 3:
        cm = ShapedObject.RoundedSquare(null, tr.scale.x * 2, tr.scale.z * 2, thickness, 0.01, 3, 0.008, 3);
        cm.startAnimationMode();
        break;
      default:
        console.warn("Custom tile type not implemented yet:" + o.GUID + " => " + o.CustomImage.CustomTile.Type);
        console.log(o);
    }
    cm.node.position = tr.pos;
    cm.node.rotationQuaternion = tr.rot;

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
    if (o.PhysicsMaterial)
      cm.body.material = { friction: o.PhysicsMaterial.DynamicFriction, restitution: o.PhysicsMaterial.Bounciness };
    //var meshCol = null;
    // var meshCol = cmr.colliderMesh?.clone();
    // if (meshCol) {
    // TTSImporter._tts_transform_to_node(o.Transform, meshCol);
    // }
    //var cm = new PlateauObject(mesh, meshCol, { friction: 0.6, restitution: 0.3 }, null, 1);
    cm.node.id = cm.node.name = name;
    cm.uuid = o.GUID;
    return cm;
  }

  static async importCustomToken(o) {
    var frontTex = null;
    //    var backTex = null;
    if (o.CustomImage?.ImageURL && o.CustomImage.ImageURL != "")
      frontTex = await TTSImporter.importTextureAsync(o.CustomImage.ImageURL, true);

    var name = o.Nickname;

    //TODO: simplify threshold
    // polygon is now an array of {x,y} objects. Have fun!

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
      var y = image.height - p.y - 0.5 * image.height;
      y *= tr.scale.z * k;
      poly.push(new BABYLON.Vector3(x, y, 0.0));
    }
    poly.reverse();

    cm = new ShapedObject(null, poly, null, thickness, 0, 1);
    cm.startAnimationMode();
    cm.node.position = tr.pos;
    cm.node.rotationQuaternion = tr.rot;

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

    cm.node.id = cm.node.name = name;
    cm.uuid = o.GUID;
    return cm;

    // var frontTex = null;
    // var backTex = null;
    // if (o.CustomImage?.ImageURL && o.CustomImage.ImageURL != "")
    //   frontTex = await TTSImporter.importTextureAsync(o.CustomImage.ImageURL, true);
    // if (o.CustomImage?.ImageSecondaryURL && o.CustomImage.ImageSecondaryURL != "")
    //   backTex = await TTSImporter.importTextureAsync(o.CustomImage.ImageSecondaryURL, true);
    // var name = o.GUID + "_" + o.Nickname;
  }

  static async importCustomFigurine(o) {
    if (!o.CustomImage) return;
    var frontTex = null;
    var backTex = null;
    if (o.CustomImage?.ImageURL && o.CustomImage.ImageURL != "")
      frontTex = await TTSImporter.importTextureAsync(o.CustomImage.ImageURL, false);
    // if (o.CustomImage?.ImageSecondaryURL && o.CustomImage.ImageSecondaryURL != "")
    //   backTex = await TTSImporter.importTextureAsync(o.CustomImage.ImageSecondaryURL, true);

    var name = o.Nickname;

    var tr = TTSImporter._tts_transform_to_node(o.Transform);

    var image = await loadImage(o.CustomImage.ImageURL);
    var hf = 6;
    var wf = (hf * image.width) / image.height;
    //TODO: BackImage

    // //TODO: card scale
    wf *= tr.scale.x / 2.54;
    hf *= tr.scale.z / 2.54;

    var standee = await MeshObjectUtils.loadCached("models/standee_01.glb", true);
    console.log(standee.material);
    var planeFront = BABYLON.MeshBuilder.CreatePlane("plane", { width: wf, height: hf }, scene);
    planeFront.position.y = hf * 0.5 + 0.06;

    standee.sideOrientation = planeFront.sideOrientation;
    var all = BABYLON.Mesh.MergeMeshes([standee, planeFront], true, false, false, true, true);
    all.subMeshes[1].materialIndex = 1;

    // TODO: separate colliders.
    var cm = new PlateauObject(all, null, { friction: 0.6, restitution: 0.1 }, null, 1);
    cm.updateBoundingInfos();

    const pbr = new BABYLON.PBRMaterial(name + " Standee Material", scene);
    pbr.albedoColor = new BABYLON.Color3(o.ColorDiffuse.r * 0.8, o.ColorDiffuse.g * 0.8, o.ColorDiffuse.b * 0.8);
    pbr.metallic = 0.6;
    pbr.roughness = 0.15;
    pbr.backFaceCulling = false;

    const pbrFront = new BABYLON.PBRMaterial(name + " Front card Material", scene);
    pbrFront.albedoTexture = frontTex;
    pbrFront.metallic = 0;
    pbrFront.roughness = 0.8;
    pbrFront.backFaceCulling = false;

    all.material = new BABYLON.MultiMaterial(name + " Material", scene);
    all.material.subMaterials.push(pbr);
    all.material.subMaterials.push(pbrFront);

    cm.startAnimationMode();
    cm.node.position = tr.pos;
    cm.node.rotationQuaternion = tr.rot;
    //cm.node.scaling = tr.scale;

    cm.node.id = cm.node.name = name;
    cm.uuid = o.GUID;
    return cm;
  }

  static async importSimpleStack(o, f) {
    // Simple stack implementation
    var number = o.Number;
    var dy = 0;
    var obj = await f(o);
    this.genericImports(obj, o);
    var objects = [obj];
    var dec = obj.getBoundingInfos().boundingBox.extendSizeWorld.y * 2;
    for (var i = 1; i < number; i++) {
      // if(obj == null)
      //   continue;
      var clonedObj = obj.clone(null, o.GUID + "-" + i.pad(4));
      clonedObj.node.position = obj.node.position.clone();
      clonedObj.node.position.y += dy;
      dy += dec;
      objects.push(clonedObj);
    }
    return objects;
  }

  static async importCustomBoard(o) {
    var frontTex = null;
    if (o.CustomImage?.ImageURL && o.CustomImage.ImageURL != "")
      frontTex = await TTSImporter.importTextureAsync(o.CustomImage.ImageURL, true);
    var name = o.Nickname;

    var cm = null;

    var tr = TTSImporter._tts_transform_to_node(o.Transform);

    var h = 67;
    var w = (h * frontTex._texture.baseWidth) / frontTex._texture.baseHeight;
    w *= tr.scale.x / 2.54;
    h *= tr.scale.z / 2.54;
    var thickness = 2 * tr.scale.y;
    //console.log(o.CustomImage.WidthScale)
    w /= o.CustomImage.WidthScale;
    h /= o.CustomImage.WidthScale;
    //w *= o.CustomImage.WidthScale;

    cm = ShapedObject.Square(null, w, h, thickness);
    cm.startAnimationMode();
    var tr = TTSImporter._tts_transform_to_node(o.Transform);
    cm.node.position = tr.pos;
    cm.node.rotationQuaternion = tr.rot;

    const pbr = new BABYLON.PBRMaterial(name + " Material", scene);
    pbr.albedoColor = new BABYLON.Color3(o.ColorDiffuse.r * 0.8, o.ColorDiffuse.g * 0.8, o.ColorDiffuse.b * 0.8);
    pbr.metallic = 0;
    pbr.roughness = 0.15;

    if (frontTex) pbr.albedoTexture = frontTex;
    cm.setMaterial(pbr);
    if (o.PhysicsMaterial)
      cm.body.material = { friction: o.PhysicsMaterial.DynamicFriction, restitution: o.PhysicsMaterial.Bounciness };
    cm.node.id = cm.node.name = name;
    cm.uuid = o.GUID;
    return cm;
  }

  static async importCustomDecks(cds) {
    for (var id in cds) {
      var deckName = String(id);
      if (CardAtlas.all.has(deckName)) continue;
      var cd = cds[id];
      if (cd.FaceURL && cd.FaceURL != "") {
        var nb = cd.NumWidth * cd.NumHeight - 1;

        var texture = await TTSImporter.importTextureAsync(cd.FaceURL, true).catch((err) =>
          console.error("Unable to load Deck Texture", o)
        );
        if (!texture) console.error("Unable to load Deck Texture", o);
        // Back texture is last by default
        var deckAtlas = new CardAtlas(deckName, texture, cd.NumWidth, cd.NumHeight, nb, nb);
      }
    }
  }

  static async importCard(o, force_tr = null) {
    if (o.CustomDeck) await TTSImporter.importCustomDecks(o.CustomDeck);

    var deckName = String(o.CardID).substring(0, String(o.CardID).length - 2);

    var atlas = CardAtlas.all.get(deckName);

    var wPix = atlas.texture._texture.baseWidth / atlas.cols;
    var hPix = atlas.texture._texture.baseHeight / atlas.rows;
    var tr = TTSImporter._tts_transform_to_node(o.Transform);
    // tr.pos.x *= 0.1;
    // tr.pos.y = 0.001;
    var h = 7.7;
    var w = (h * wPix) / hPix;
    var scale = force_tr ? force_tr.scale : tr.scale;
    w *= scale.x / 2.54;
    h *= scale.z / 2.54;

    var thickness = (0.024 * scale.y) / 2.54;
    var cornerRadius = (0.35 * scale.x) / 2.54;

    var num = parseInt(String(o.CardID).replace(deckName, ""));
    var c = new Card(force_tr ? force_tr.pos : tr.pos, atlas, num, atlas.back, w, h, thickness, cornerRadius);
    //console.log(c.getBoundingInfos().boundingBox.extendSizeWorld.x *20+" x "+ c.getBoundingInfos().boundingBox.extendSizeWorld.z *20+" cm")
    c.node.rotationQuaternion = force_tr ? force_tr.rot : tr.rot;
    c.node.id = c.node.name = "(" + o.CardID + ")" + o.Nickname;

    // To keep ref
    c.CardID = o.CardID;
    c.uuid = o.GUID;
    return c;
  }

  static async importDeck(o) {
    if (o.CustomDeck) await TTSImporter.importCustomDecks(o.CustomDeck);

    var tr = this._tts_transform_to_node(o.Transform);

    var cards = [];
    if (o.ContainedObjects) {
      for (var oc of o.ContainedObjects) {
        var c = await TTSImporter.importCard(oc, tr);
        c.startAnimationMode(); // Block physics while loading
        TTSImporter.genericImports(c, oc);
        //if (!oc.GUID || oc.GUID == "")
        c.uuid = o.GUID + "-" + cards.length.pad(6);
        //c.uuid = o.GUID + "-" + oc.CardID;
        cards.push(c);
      }
    }

    var name = o.Nickname;

    var deck = Deck.BuildFromCards(name, cards, tr.pos);
    deck.startAnimationMode();
    deck.position = tr.pos;
    deck.rotationQuaternion = tr.rot;
    deck.updateZones();
    deck.node.id = deck.node.name = name;
    deck.uuid = o.GUID;
    //cards.push(deck);return cards;
    return deck;
  }

  static async importBag(o) {
    var name = o.Nickname;

    var mesh = null;
    var collider = null;

    if (o.CustomMesh) {
      var cmr = await TTSImporter.importCustomMeshResources(o.CustomMesh);
      if (cmr.mesh) {
        mesh = cmr.mesh.clone();
        TTSImporter._tts_transform_to_node(o.Transform, mesh);

        const pbr = new BABYLON.PBRMaterial(name + " Material", scene);
        pbr.albedoColor = new BABYLON.Color3(o.ColorDiffuse.r * 0.8, o.ColorDiffuse.g * 0.8, o.ColorDiffuse.b * 0.8);
        pbr.metallic = 0;
        pbr.roughness = 0.5;
        if (cmr.diffuse) pbr.albedoTexture = cmr.diffuse;
        mesh.material = pbr;
        // var collider = cmr.colliderMesh?.clone();
        // if (collider) {
        // TTSImporter._tts_transform_to_node(o.Transform, collider);
        // }
      }
    }

    var name = o.Nickname;
    var bag = new Bag(mesh, collider);
    bag.startAnimationMode();

    var tr = this._tts_transform_to_node(o.Transform);
    if (o.ColorDiffuse) {
      var mat = bag.node.material.clone(name + "_Material");
      mat.albedoColor = new BABYLON.Color3(o.ColorDiffuse.r, o.ColorDiffuse.g, o.ColorDiffuse.b);
      bag.node.material = mat;
    }

    bag.node.position = tr.pos;
    bag.node.rotationQuaternion = tr.rot;

    if (o.ContainedObjects) {
      const promises = [];
      for (var oc of o.ContainedObjects) {
        promises.push(TTSImporter.importObject(oc));
      }
      console.log("Populating bag", o.Nickname, o.GUID, " with ", promises.length, " objects.");

      var collection = await Promise.all(promises);
      //console.log(collection);
      for (var coll of collection)
        if (coll) {
          for (var obj of coll)
            if (obj) {
              bag.addObject(obj);
            }
        }
      console.log(
        "Finished populating bag",
        o.Nickname,
        o.GUID,
        " with ",
        bag.objects.length,
        "/",
        promises.length,
        " objects."
      );
    }

    bag.infinite = o.Name.includes("Infinite");

    bag.node.id = bag.node.name = o.Nickname;
    bag.uuid = o.GUID;
    return bag;
  }

  static _importTexture(url, flip = false, onLoadCallback = null, onErrorCallback = null) {
    if (!TTSImporter.textures.has(url)) {
      var tex = null;
      tex = new BABYLON.Texture(url, scene, true, !flip, BABYLON.Texture.TRILINEAR_SAMPLINGMODE, null, onErrorCallback);
      TTSImporter.textures.set(url, tex);
      tex.onLoadObservable.add(() => {
        tex.loaded = true;
      });
      if (onLoadCallback) tex.onLoadObservable.add(() => onLoadCallback(tex));
    } else {
      if (onLoadCallback) {
        var tex = TTSImporter.textures.get(url);
        if (tex.loaded) onLoadCallback(tex);
        else tex.onLoadObservable.add(() => onLoadCallback(tex));
      }
    }
    return TTSImporter.textures.get(url);
  }

  static async importTextureAsync(url, flip = false) {
    var cached = await TTSImporter.cachedDownloadURL(url, "images").catch((err) => {
      console.error("Unable to cache ", url);
      throw new Error(err);
    });
    return new Promise((resolve, reject) => {
      this._importTexture(
        cached,
        flip,
        (tex) => resolve(tex),
        (m, e) => {
          console.error("Unable to load ", url);
          reject(m);
        }
      );
    });
  }

  static async importMesh(url) {
    // Specific pastebin fix
    if (url.includes("pastebin.com") && !url.includes("/raw")) url = url.replace("pastebin.com", "pastebin.com/raw");

    if (TTSImporter.meshes.has(url)) return TTSImporter.meshes.get(url);
    BABYLON.OBJFileLoader.SKIP_MATERIALS = true;
    var cached = await TTSImporter.cachedDownloadURL(url, "models", ".obj");
    var tst = await BABYLON.SceneLoader.LoadAssetContainerAsync(cached, null, scene, null, ".obj");
    if (!tst) return null;

    // var resp = await fetch(url);
    // var data = await resp.text();
    // //console.log(data);

    // var loader = new OBJLoader();
    // var meshNames = [];
    // var meshes = [];
    // await loader.importMesh(meshNames, scene, data, null, meshes, null, null)
    // console.log(meshNames)
    // console.log(meshes)

    TTSImporter.meshes.set(url, tst.meshes[0]);
    return TTSImporter.meshes.get(url);
  }

  static async importMeshedObject(o, url) {
    var tr = this._tts_transform_to_node(o.Transform);
    var po = await MeshObjectUtils.Create(url);
    po.node.material = po.node.material.clone();
    po.node.material.albedoColor = new BABYLON.Color3(
      o.ColorDiffuse.r * 0.8,
      o.ColorDiffuse.g * 0.8,
      o.ColorDiffuse.b * 0.8
    );
    po.node.position = tr.pos;
    po.node.rotationQuaternion = tr.rot;
    po.node.id = po.node.name = o.Nickname;
    po.uuid = o.GUID;
    return po;
  }

  static async import3DText(o) {
    var colorHex = new BABYLON.Color3(o.Text.colorstate.r, o.Text.colorstate.g, o.Text.colorstate.b).toHexString();
    var opts = {
      fontSize: o.Text.fontSize,
      fontName: "Amaranth",
      color: colorHex,
      flipY: true,
      //lineHeight: 0.3, // TODO: measure
    };

    var text = new TextObject(o.Text.Text, opts);
    var tr = this._tts_transform_to_node(o.Transform);
    text.node.position = tr.pos;
    text.node.rotationQuaternion = tr.rot;
    text.node.scaling = new BABYLON.Vector3(-o.Transform.scaleX, o.Transform.scaleY, o.Transform.scaleZ);
    text.uuid = o.GUID;
    text.node.name = o.Nickname;

    return text;
  }

  static async importNoteCard(o) {
    console.log(o);

    var tr = this._tts_transform_to_node(o.Transform);

    var h = (10 * tr.scale.x) / 2.54;
    var w = (17.5 * tr.scale.z) / 2.54;
    var thickness = (0.2 * tr.scale.y) / 2.54;

    var po = ShapedObject.Square(null, w, h, thickness);
    po.node.position = tr.pos;
    po.node.rotationQuaternion = tr.rot.multiply(BABYLON.Quaternion.FromEulerAngles(0, Math.PI, 0));

    var pbr = new BABYLON.PBRMaterial("default_material", scene);
    pbr.albedoColor = new BABYLON.Color3(o.ColorDiffuse.r * 0.8, o.ColorDiffuse.g * 0.8, o.ColorDiffuse.b * 0.8);
    pbr.metallic = 0.0;
    pbr.roughness = 1.0;

    var colorHex = new BABYLON.Color3.Black().toHexString();
    // TODO: background image
    var opts = {
      fontSize: 64,
      fontName: "Amaranth",
      color: colorHex,
      backgroundColor: "#ffffff",
      flipY: false,
      //lineHeight: 0.3, // TODO: measure
    };
    var tx = TextObject.BuildTexture((o.Nickname ? o.Nickname : "NOTE") + "\n" + o.Description, opts);

    pbr.albedoTexture = tx.texture;

    po.node.material = pbr;
    po.node.receiveShadows = true;

    po.uuid = o.GUID;
    po.node.name = o.Nickname;

    return po;
  }

  static async getPDFPageSizeAsync(url, pageNum) {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) pdfjsLib.GlobalWorkerOptions.workerSrc = "js/ext/pdf.worker.min.mjs";

    var loadingTask = pdfjsLib.getDocument(url);
    var pdf = await loadingTask.promise;

    var page = await pdf.getPage(pageNum);
    var scale = 1.5;
    var viewport = page.getViewport({ scale: scale });
    return [viewport.width, viewport.height];
  }

  static async importPDF(o) {
    var url = "";
    if (o.CustomPDF?.PDFUrl) url = o.CustomPDF.PDFUrl;

    var name = "PDF" + o.Nickname;

    var cached = await TTSImporter.cachedDownloadURL(url, "pdf", ".pdf");

    var psize = await TTSImporter.getPDFPageSizeAsync(cached, o.CustomPDF.PDFPage + 1);
    var tr = TTSImporter._tts_transform_to_node(o.Transform);
    // tr.pos.x *= 0.1;
    // tr.pos.y = 0.001;
    var h = 10;
    var w = (h * psize[0]) / psize[1];
    w *= tr.scale.x / 2.54;
    h *= tr.scale.z / 2.54;

    var thickness = (0.5 * tr.scale.y) / 2.54;
    var po = new PdfObject(cached, o.CustomPDF.PDFPage + 1, w, h, thickness);
    po.startAnimationMode();

    po.node.position = tr.pos;
    po.node.rotationQuaternion = tr.rot;

    po.node.material.albedoColor = new BABYLON.Color3(
      o.ColorDiffuse.r * 0.8,
      o.ColorDiffuse.g * 0.8,
      o.ColorDiffuse.b * 0.8
    );
    po.node.id = po.node.name = name;
    po.uuid = o.GUID;
    return po;
  }

  static async cachedDownloadURL(url, category, default_ext = ".jpg") {

    var isLocal = (new URL(document.baseURI).origin === new URL(url, document.baseURI).origin);
    if (isLocal) return url;

    var subdir = TTSImporter.cacheSubDir;
    const response = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, subdir, category, default_ext }),
    }).catch((error) => {
      throw new Error("Unable to cache ", url, error);
    });
    const data = await response.json();
    //console.log(url, "=> ", data);
    if (response.ok) {
      return data.localUrl;
    } else {
      //console.warn("Unable to cache ", url);
      throw new Error("Unable to cache ", url);
    }
  }
}
