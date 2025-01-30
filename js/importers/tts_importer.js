async function loadImage(url) {
  //TODO: cache !!!
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
  static UNIT_CONVERTER = 0.1;
  static IMPORT_SCALE = (2.54 * 14) / 20; // TODO: parametrizable scaler
  static UNIT_MULTIPLIER = TTSImporter.UNIT_CONVERTER * TTSImporter.IMPORT_SCALE;
  static FAR_POSITION = new BABYLON.Vector3(1000, 1000, 1000);
  static POS_OFFSET = new BABYLON.Vector3(0.0, -0.955 * TTSImporter.UNIT_MULTIPLIER, 0.0); // new BABYLON.Vector3(0.0, 0.0, 0.0);
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
    if (jsonObj.SnapPoints)
      for (var sp of jsonObj.SnapPoints) {
        TTSImporter.importSnapPoint(sp);
      }

    console.log("OBJECTS:", jsonObj.ObjectStates.length);

    const promises = [];
    for (var o of jsonObj.ObjectStates) {
      promises.push(TTSImporter.importObject(o));
    }

    var results = await Promise.all(promises);
    console.log("LOADING FINISHED !!!");
    console.log(TTSImporter.textures);
    console.log(TTSImporter.meshes);
    console.log(CardAtlas.all);
    var nb = 0;
    for (var po of results) if (po) nb++;
    console.log("LOADED Objects:", nb);

    setTimeout(function () {
      for (var objects of results) {
        if (objects == null) continue;
        for (var po of objects) {
          if (po == null) continue;

          po.stopAnimationMode();
        }
      }
    }, 3000);
  }

  static importSnapPoint(sp, parent = null, parentTTS=null) {
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
          tr.scale.y*2, // TODO: more generic
          tr.scale.z,
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

    var only  = null;//new Set(["Custom_Board"]);//, "Custom_Token"]);
    if(only && !only.has(o.Name))
      return null;

    function handleError(err, o) {
      console.warn("Error while importing", o.Name, o.Nickname, o.GUID, err);
    }
    switch (o.Name) {
      case "Custom_Model":
        plateauObj = await TTSImporter.importCustomModel(o).catch((err) => handleError(err, o));
        break;
      case "Custom_Dice":
        plateauObj = await TTSImporter.importCustomDice(o).catch((err) => handleError(err, o));
        break;
      case "Custom_Tile":
        plateauObj = await TTSImporter.importCustomTile(o).catch((err) => handleError(err, o));
        break;
      case "Custom_Token":
        //if (o.Nickname.includes("Red") || o.Nickname.includes("Green"))
        //if (o.Transform.posX < -60)
        plateauObj = await TTSImporter.importCustomToken(o).catch((err) => handleError(err, o));
        break;
      case "Custom_Board":
        plateauObj = await TTSImporter.importCustomBoard(o).catch((err) => handleError(err, o));
        break;
      case "backgammon_piece_white":
        plateauObj = await TTSImporter.importBackgammonPiece(o).catch((err) => handleError(err, o));
        break;
      case "Custom_Token_Stack":
        plateauObj = await TTSImporter.importSimpleStack(o, TTSImporter.importCustomToken).catch((err) =>
          handleError(err, o)
        );
        break;
      case "Custom_Model_Stack":
        plateauObj = await TTSImporter.importSimpleStack(o, TTSImporter.importCustomModel).catch((err) =>
          handleError(err, o)
        );
        break;
      case "Card":
        plateauObj = await TTSImporter.importCard(o).catch((err) => handleError(err, o));
        break;
      case "Deck":
        plateauObj = await TTSImporter.importDeck(o).catch((err) => handleError(err, o));
        break;
      case "Bag":
        plateauObj = await TTSImporter.importBag(o).catch((err) => handleError(err, o));
        break;
      case "Custom_Model_Infinite_Bag":
        plateauObj = await TTSImporter.importCustomModelInfiniteBag(o).catch((err) => handleError(err, o));
        break;
      case "3DText":
        await TTSImporter.import3DText(o).catch((err) => handleError(err, o));
        break;
      case "HandTrigger":
      case "ScriptingTrigger":
        console.log(o);
        break;
      default:
        console.warn(o.GUID + " => " + o.Name + " import is not implemented yet.");
        break;
    }

    if (!plateauObj) return null;

    var objects = plateauObj instanceof Array ? plateauObj : [plateauObj];

    for (var po of objects) {
      po.startAnimationMode(); // Block physics while loading

      // Common variables
      po.description = o.Description;
      po.locked = o.Locked ? o.Locked : false;

      if (o.AttachedSnapPoints) {
        for (var sp of o.AttachedSnapPoints) {
          var dz = TTSImporter.importSnapPoint(sp, po.node, o);
        }
      }
    }
    return objects;
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
    if (o.DiffuseURL && o.DiffuseURL != "") cmr.diffuse = TTSImporter.importTexture(o.DiffuseURL);
    if (o.NormalURL && o.NormalURL != "") cmr.normal = TTSImporter.importTexture(o.NormalURL);

    if (o.MeshURL && o.MeshURL != "") cmr.mesh = await TTSImporter.importMesh(o.MeshURL);
    if (o.ColliderURL && o.ColliderURL != "") cmr.colliderMesh = await TTSImporter.importMesh(o.ColliderURL);
    return cmr;
  }

  static async importCustomDice(o) {
    var texture = null;
    if (o.CustomImage?.ImageURL) texture = await TTSImporter.importTexture(o.CustomImage.ImageURL, true);
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
      case 0:
        cm = ShapedObject.Circle(null, tr.scale.x, thickness, 0.008, 3);
        cm.startAnimationMode();
        break;
      case 0:
        // cm = ShapedObject.RoundedSquare(null, tr.scale.x * 2, tr.scale.z * 2, thickness, 0.01, 3, 0.008, 3);
        // cm.startAnimationMode();
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
      frontTex = TTSImporter.importTexture(o.CustomImage.ImageURL, true);

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
      var y = (image.height-p.y) - 0.5 * image.height;
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
    //   frontTex = TTSImporter.importTexture(o.CustomImage.ImageURL, true);
    // if (o.CustomImage?.ImageSecondaryURL && o.CustomImage.ImageSecondaryURL != "")
    //   backTex = TTSImporter.importTexture(o.CustomImage.ImageSecondaryURL, true);
    // var name = o.GUID + "_" + o.Nickname;
  }

  static async importSimpleStack(o, f) {
    // Simple stack implementation
    var number = o.Number;
    var dy = 0;
    var obj = await f(o);
    var objects = [obj];
    var dec = obj.getBoundingInfos().boundingBox.extendSizeWorld.y * 2;
    for (var i = 1; i < number; i++) {
      // if(obj == null)
      //   continue;
      var clonedObj = obj.clone();
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
    w/=  o.CustomImage.WidthScale;
    h/=  o.CustomImage.WidthScale;
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

  static async importCard(o) {
    var deckName = Object.keys(o.CustomDeck)[0];

    if (!CardAtlas.all.has(deckName)) {
      var cd = o.CustomDeck ? o.CustomDeck[deckName] : null;
      if (cd) {
        if (cd.FaceURL && cd.FaceURL != "") {
          var nb = cd.NumWidth * cd.NumHeight - 1;
          
          var texture = await TTSImporter.importTextureAsync(cd.FaceURL,true);
          // Back texture is last by default
          var deckAtlas = new CardAtlas(deckName, texture, cd.NumWidth, cd.NumHeight, nb, nb);
        }
      }
    }
    var atlas = CardAtlas.all.get(deckName);

    var wPix = atlas.texture._texture.baseWidth / atlas.cols;
    var hPix = atlas.texture._texture.baseHeight / atlas.rows;
    var tr = TTSImporter._tts_transform_to_node(o.Transform);
    // tr.pos.x *= 0.1;
    // tr.pos.y = 0.001;
    var h = 7.7;
    var w = h * wPix/hPix;
    w *= tr.scale.x / 2.54;
    h *= tr.scale.z / 2.54;

    var thickness = 0.024 * tr.scale.y / 2.54;
    var cornerRadius = 0.35 * tr.scale.x / 2.54;

    var num = parseInt(String(o.CardID).replace(deckName, ""));
    var c = new Card(tr.pos, atlas, num, atlas.back, w, h, thickness, cornerRadius);
    //console.log(c.getBoundingInfos().boundingBox.extendSizeWorld.x *20+" x "+ c.getBoundingInfos().boundingBox.extendSizeWorld.z *20+" cm")
    c.node.rotationQuaternion = tr.rot;
    c.node.id = c.node.name = o.Nickname;

    // To keep ref
    c.CardID = o.CardID;
    c.uuid = o.GUID;
    return c;
  }

  static async importDeck(o) {
    var cards = [];
    if (o.ContainedObjects)
      for (var oc of o.ContainedObjects) {
        var c = await TTSImporter.importCard(oc);
        cards.push(c);
      }

    var name = o.Nickname;
    var tr = this._tts_transform_to_node(o);
    var deck = Deck.BuildFromCards(name, cards, tr.pos);
    deck.position = tr.pos;
    deck.rotationQuaternion = tr.rot;
    deck.updateZones();
    deck.node.id = deck.node.name = name;
    deck.uuid = o.GUID;
    //cards.push(deck);return cards;
    return deck;
  }

  static async importBag(o, mesh = null, collider = null) {
    var name = o.Nickname;
    var bag = new Bag(mesh, collider);
    bag.node.id = bag.node.name = name;
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
      var collection = await Promise.all(promises);
      //console.log(collection);
      for (var coll of collection)
        if (coll) {
          for (var obj of coll)
            if (obj) {
              bag.addObject(obj);
            }
        }
    }

    bag.uuid = o.GUID;
    return [bag];
    // var cards = [];
    // if (o.ContainedObjects)
    //   for (var oc of o.ContainedObjects) {
    //     var c = await TTSImporter.importCard(oc);
    //     cards.push(c);
    //   }

    // var name = o.GUID + "_" + o.Nickname;
    // var tr = this._tts_transform_to_node(o);
    // var deck = Deck.BuildFromCards(name, cards, tr.pos);
    // deck.position = tr.pos;
    // deck.rotationQuaternion = tr.rot;
    // deck.updateZones();
    // //cards.push(deck);return cards;
    // return deck;
  }

  static async importCustomModelInfiniteBag(o) {
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
      var bag = await this.importBag(o, mesh, meshCol);
      bag[0].startAnimationMode();
      bag[0].infinite = true;
      return bag;
    }
    return null;
  }

  static importTexture(url, flip = false, onLoadCallback = null, onErrorCallback = null) {
    if (!TTSImporter.textures.has(url)) {
      var tex = null;
      tex = new BABYLON.Texture(
        url,
        scene,
        true,
        !flip,
        BABYLON.Texture.TRILINEAR_SAMPLINGMODE,
        null,
        onErrorCallback
      );
      TTSImporter.textures.set(url, tex);
      if (onLoadCallback) tex.onLoadObservable.add(() => onLoadCallback(tex));
    }
    else {
      if(onLoadCallback) {
        var tex=TTSImporter.textures.get(url);
        tex.onLoadObservable.add(() => onLoadCallback(tex));
      }
    }
    return TTSImporter.textures.get(url);
  }

  static async importTextureAsync(url, flip = false) {
    //TODO: cache !!!
    return new Promise((resolve, reject) => {
      this.importTexture(url, flip, (tex) => resolve(tex), reject);
    });
  }

  static async importMesh(url) {
    if (TTSImporter.meshes.has(url)) return TTSImporter.meshes.get(url);
    BABYLON.OBJFileLoader.SKIP_MATERIALS = true;
    var tst = await BABYLON.SceneLoader.LoadAssetContainerAsync(url, null, scene, null, ".obj");
    if (!tst) return null;

    TTSImporter.meshes.set(url, tst.meshes[0]);
    return TTSImporter.meshes.get(url);
  }

  static async import3DText(o) {
    var colorHex = new BABYLON.Color3(o.Text.colorstate.r, o.Text.colorstate.g, o.Text.colorstate.b).toHexString();
    var text = new TextObject(o.Text.Text, false, o.Text.fontSize, "Amaranth", colorHex, true);
    var tr = this._tts_transform_to_node(o.Transform);
    text.node.position = tr.pos;
    text.node.rotationQuaternion = tr.rot;
    text.node.scaling = new BABYLON.Vector3(-o.Transform.scaleX, o.Transform.scaleZ, o.Transform.scaleZ);
    text.uuid = o.GUID;
    text.node.name = o.NickName;

    return null;
  }
}
