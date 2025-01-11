class CardAtlas {
  name = "atlas";
  material = null;
  cols = 1;
  rows = 1;
  nb = 54;
  back = 55;
  constructor(name="French Deck Atlas", texturePath="textures/cards/french_deck.png", cols=13, rows=5, nb = 54, back=54) {
    this.name = name;
    this.cols = cols;
    this.rows = rows;
    this.nb = nb;
    this.back = back;
    const texture = new BABYLON.Texture(texturePath, scene, true, false);

    const pbr = new BABYLON.PBRMaterial(name+" Material", scene);
    pbr.albedoColor = new BABYLON.Color3(0.8, 0.8, 0.8);
    pbr.metallic = 0;
    pbr.roughness = 0.5;
    pbr.albedoTexture = texture;
    this.material = pbr;
  }
}

class Card extends PhysicObject {

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

  constructor(
    position = null,
    atlas = null,
    num = 32,
    numBack = 54,
    width = 0.572,
    height = 0.889,
    thickness = 0.004,
    cornerRadius = 0.05,
    cornerSegments = 4
  ) {
    var box = Card.createCardShape(width, height, thickness, cornerRadius, cornerSegments);

    planarUVProjectXZ(
      box,
      uvFromAtlas(num, atlas.cols, atlas.rows),
      uvFromAtlas(numBack, atlas.cols, atlas.rows)
    );

    if (position) box.position.copyFrom(position);
    box.material = atlas.material; //scene.getMaterialByName("default_material");

    super(box);
    //this.straightenAtPickup = false;
  }

  onPickup() {
    if (this.straightenAtPickup) {
      // Same as standard but keep closest face up or down
      var curAngle = angleDegreesBetweenTwoUnitVectors(this.node.up, BABYLON.Vector3.Up());

      var dstUp = curAngle < 90 ? BABYLON.Vector3.Up() : BABYLON.Vector3.Down();

      this.orientUpTo(dstUp);
    }
  }
}

class Deck extends PhysicObject {
  cards = [];

  node = null;

  constructor(name = "deck") {
    this.node = new BABYLON.Mesh(name, scene);
  }

  static BuildFromCardsAtlas(name, atlas) {

  }

  static BuildFromCardsAtlases(name) {}

  addCard(card, flip, position = -1) {
    // Add a card inside the deck, at a given position, fliped or not
  }

  shuffle() {}

  _updateCardsPhysics() {
    // Update cards positions inside deck according to list
  }
}
