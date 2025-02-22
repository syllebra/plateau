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
    var box = createCardShape(width, height, thickness, cornerRadius, cornerSegments);

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
  randomness = 2; // Angle randomness

  topDropZone = null;
  bottomDropZone = null;

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

  updateZones() {
    this.checkDropZonesUpdate();
  }

  static BuildFromCardsAtlas(name, atlas, position) {
    var deck = new Deck(name, null);

    for (var i = 0; i < atlas.nb; i++) {
      var c = new Card(null, atlas, i, atlas.back);
      deck.addCard(c);
    }

    deck.updateBoundingInfos();
    var bi = deck.getBoundingInfos();
    var sz = bi.boundingBox.extendSize;
    deck.topDropZone = DropZone.CreateRectangularZone(sz.x * 2.0, sz.z * 2.0, 0.01, deck.node);
    //deck.topDropZone.node.id = deck.topDropZone.node.name = deck.id+"_topZone"
    deck.topDropZone.acceptedClasses.add(Card);
    deck.bottomDropZone = DropZone.CreateRectangularZone(sz.x * 2.0, sz.z * 2.0, 0.01, deck.node);
    deck.bottomDropZone.acceptedClasses.add(Card);
    //deck.topDrobottomDropZonepZone.node.id = deck.bottomDropZone.node.name = deck.id+"_bottomZone"
    deck._updateCardsPhysics();
    if (position) deck.node.position.copyFrom(position);

    return deck;
  }

  static BuildFromCardsAtlases(name) {}

  addCard(card, flip = false, position = -1) {
    // Add a card inside the deck, at a given position, flipped or not
    // TODO: flip
    card.startAnimationMode();
    card.setEnabled(true, false);
    card.pickable = false;
    card.body.dispose();
    card.body = null;

    card.deck = this;
    card.flippedInDeck = flip;

    position = position >= 0 ? position : this.cards.length;
    this.cards.splice(position, 0, card);
    this.node.addChild(card.node);
  }

  shuffle() {
    console.log("Shuffling " + this.node.id);
    shuffle(this.cards);
    for (var c of this.cards) {
      var anim = c.animateRotation(
        c.node.rotationQuaternion.multiply(BABYLON.Quaternion.FromEulerAngles(0, Math.PI, 0)),
        100 + Math.floor(Math.random() * 100)
      );

      //anim.complete = () => {c.rotationAnimation = null; this._updateCardsPhysics();}
    }
    setTimeout(this._updateCardsPhysics(), 1000);
  }

  popCard(picked = null) {
    var card = null;
    var id = this.cards.findIndex((e) => e == picked);

    if (id < 0) card = this.cards.pop();
    else {
      card = picked;
      this.cards.splice(id, 1);
    }

    var world_H_card = XTransform.FromNodeWorld(card.node);
    console.log(world_H_card);
    card.deck = null;
    card.node.parent = null;
    world_H_card.applyToNodeWorld(card.node);
    card._updateAutoCollider();
    this._updateCardsPhysics();
    card.setEnabled(true, true);
    console.log(card);
    card.stopAnimationMode();
    card.pickable = true;
    return card;
  }

  _updateCardsPhysics() {
    // Update cards positions inside deck according to list
    var y = 0;
    for (var c of this.cards) {
      c.node.position = new BABYLON.Vector3(0, y, 0);
      var angle = BABYLON.Tools.ToRadians(c.flippedInDeck ? 0 : 180);
      var rnda = BABYLON.Tools.ToRadians(this.randomness * (Math.random() - 0.5));
      c.node.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(0, rnda, angle);
      y += c.thickness;
    }

    this.updateBoundingInfos();
    this._updateAutoCollider();

    if (this.topDropZone) {
      this.topDropZone.node.position = new BABYLON.Vector3(0, y, 0);
    }
    if (this.bottomDropZone) {
      this.bottomDropZone.node.position = new BABYLON.Vector3(0, 0, 0);
      this.bottomDropZone.node.rotationQuaternion = new BABYLON.Quaternion.FromEulerAngles(Math.PI, 0, 0);
    }
  }

  onKeyDown(key) {
    super.onKeyDown(key);
    switch (key) {
      case "s":
      case "S":
        this.shuffle();
        break;

      case "p":
      case "P":
        //this.popCard();
        document.querySelector(".card-panel").classList.add("open");
        break;
    }
  }

  onKeyUp(key) {
    super.onKeyUp(key);
  }

  checkSubPick(node = null) {
    if (shiftKeyDown || controlKeyDown || SelectionHandler.isSelected(this)) return this;
    return this.popCard(node && node.plateauObj ? node.plateauObj : null);
  }

  checkDropZonesUpdate(b) {
    // Check wich way the deck is currently facing (flipped for example?)
    var angle = angleDegreesBetweenTwoUnitVectors(this.node.up, BABYLON.Vector3.Up());
    var upz = angle < 90 ? this.topDropZone : this.bottomDropZone;
    var downz = angle < 90 ? this.bottomDropZone : this.topDropZone;

    upz.node.position.x = 0.0;
    downz.node.position.x = 0.3;

    // upz.canReceive = !b;
    // downz.canReceive = b;
  }

  objectDroppedOnZone(obj, zone) {
    if (obj instanceof Card)
      console.log("Card ", obj.node.id, " dropped on ", zone == this.topDropZone ? "top" : "bottom");
    var flip = false;
    this.addCard(obj, flip, zone == this.bottomDropZone ? 0 : -1); // TODO: flip
    this._updateCardsPhysics();
  }
}
