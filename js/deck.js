class CardAtlas {
  name = "atlas";
  material = null;
  cols = 1;
  rows = 1;
  nb = 54;
  back = 55;
  constructor(
    name = "French Deck Atlas",
    texturePath = "textures/cards/french_deck.png",
    cols = 13,
    rows = 5,
    nb = 54,
    back = 54
  ) {
    this.name = name;
    this.cols = cols;
    this.rows = rows;
    this.nb = nb;
    this.back = back;
    const texture = new BABYLON.Texture(texturePath, scene, true, false);

    const pbr = new BABYLON.PBRMaterial(name + " Material", scene);
    pbr.albedoColor = new BABYLON.Color3(0.8, 0.8, 0.8);
    pbr.metallic = 0;
    pbr.roughness = 0.5;
    pbr.albedoTexture = texture;
    this.material = pbr;
  }
}

class Card extends PlateauObject {
  static createCardShape(w = 0.572, h = 0.889, thickness = 0.004, cRad = 0.05, cN = 4) {
    var shape = createRoundedRectangleShape(w, h, cRad, cN);

    var path = [new BABYLON.Vector3(0, thickness * 0.5, 0), new BABYLON.Vector3(0, -thickness * 0.5, 0)];
    const options = {
      shape: shape, //vec3 array with z = 0,
      path: path, //vec3 array
      // rotationFunction: rotFn,
      // scaleFunction: scaleFn,
      updatable: true,
      closeShape: true,
      cap: BABYLON.Mesh.CAP_ALL,
      //sideOrientation: BABYLON.Mesh.DOUBLESIDE,
    };

    let extruded = BABYLON.MeshBuilder.ExtrudeShapeCustom("ext", options, scene); //scene is

    return extruded;
  }

  atlas = null;
  num = 32;
  back = 54;

  deck = null;
  flippedInDeck = false;

  thickness = 0.002;

  constructor(
    position = null,
    atlas = null,
    num = 32,
    numBack = 54,
    width = 0.572,
    height = 0.889,
    thickness = 0.0024,
    cornerRadius = 0.05,
    cornerSegments = 4
  ) {
    var box = Card.createCardShape(width, height, thickness, cornerRadius, cornerSegments);

    planarUVProjectXZ(box, uvFromAtlas(num, atlas.cols, atlas.rows), uvFromAtlas(numBack, atlas.cols, atlas.rows));

    box.material = atlas.material; //scene.getMaterialByName("default_material");

    super(box);

    this.atlas = atlas;
    this.num = num;
    this.back = numBack;

    if (position) box.position.copyFrom(position);

    this.thickness = thickness;

    //this.straightenAtPickup = false;
  }

  // _updateAutoCollider() {
  //   return null;
  // }

  onPickup() {
    if (this.straightenAtPickup) {
      // Same as standard but keep closest face up or down
      var curAngle = angleDegreesBetweenTwoUnitVectors(this.node.up, BABYLON.Vector3.Up());

      var dstUp = curAngle < 90 ? BABYLON.Vector3.Up() : BABYLON.Vector3.Down();

      this.orientUpTo(dstUp);
    }
  }
}

class Deck extends PlateauObject {
  cards = [];

  constructor(name = "deck", position) {
    // var box = BABYLON.Mesh.CreateBox("box", 6.0, scene, false, BABYLON.Mesh.DEFAULTSIDE);

    // const options = {
    //   width: 1,
    //   height: 1,
    //   depth: 1,
    // };

    // var.box = BABYLON.MeshBuilder.CreateBox("selection_box", options);

    var node = new BABYLON.Mesh(name, scene);
    if (position) node.position.copyFrom(position);

    super(node);
  }

  static BuildFromCardsAtlas(name, atlas, position) {
    var deck = new Deck(name, null);

    for (var i = 0; i < atlas.nb; i++) {
      var c = new Card(null, atlas, i, atlas.back);
      deck.addCard(c);
    }
    deck._updateCardsPhysics();
    if (position) deck.node.position.copyFrom(position);

    return deck;
  }

  static BuildFromCardsAtlases(name) {}

  addCard(card, flip = false, position = -1) {
    // Add a card inside the deck, at a given position, flipped or not
    // TODO: position and flip
    card.startAnimationMode();
    card.setEnabled(true, false);
    card.pickable = false;
    card.body.dispose();
    card.body = null;

    card.deck = this;
    card.flippedInDeck = flip;

    //card.node.showBoundingBox = false;
    this.cards.push(card);
    this.node.addChild(card.node);
  }

  shuffle() {
    console.log("Shuffling " + this.node.id);
    shuffle(this.cards);
    this._updateCardsPhysics();
  }

  _updateCardsPhysics() {
    // Update cards positions inside deck according to list
    var y = 0;
    for (var c of this.cards) {
      c.node.position = new BABYLON.Vector3(0, y, 0);
      var angle = BABYLON.Tools.ToRadians(c.flippedInDeck ? 0 : 180); //TODO: flip?
      c.node.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(0, 0, angle);
      y += c.thickness;
    }
    this.updateBoundingInfos();
    this.body.shape = this._updateAutoCollider();
  }

  onKeyDown(key) {
    super.onKeyDown(key);
    switch (key) {
      case "s":
      case "S":
        this.shuffle();
        break;
    }
  }

  onKeyUp(key) {
    super.onKeyUp(key);
  }
}
