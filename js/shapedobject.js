class ShapedObject extends PlateauObject {
  constructor(position = null, topShape, thickness, bevelRad, bevelN) {
    var profile = createBeveledProfile(thickness, bevelRad, bevelN);
    //var topShape = createRoundedRectangleShape(w - cRad * 2, h - cRad * 2, cRad, cN);
    //var topShape = createRegularShape(w * 0.5, 60);
    var bottomShape = expandShape(topShape, bevelRad);

    const options = {
      shape: profile, //vec3 array with z = 0,
      path: topShape, //vec3 array
      // rotationFunction: rotFn,
      // scaleFunction: scaleFn,
      updatable: true,
      closeShape: false,
      closePath: true,
      //cap: BABYLON.Mesh.CAP_ALL,
      //sideOrientation: BABYLON.Mesh.DOUBLESIDE,
      firstNormal: BABYLON.Vector3.Right(),
    };

    var bevels = BABYLON.MeshBuilder.ExtrudeShapeCustom("ext", options, scene); //scene is
    var top = new BABYLON.PolygonMeshBuilder("", topShape, scene).build();
    var bottom = new BABYLON.PolygonMeshBuilder("", bottomShape, scene).build();
    bottom.flipFaces();

    bevels.position = new BABYLON.Vector3(0, thickness, 0);
    top.position = new BABYLON.Vector3(0, thickness, 0);

    bevels.rotationQuaternion = new BABYLON.Quaternion.FromEulerAngles(BABYLON.Tools.ToRadians(-90), 0, 0);
    const newMesh = BABYLON.Mesh.MergeMeshes([bottom, bevels, top], true);
    planarUVProjectXZ(newMesh, uvFromAtlas(2, 4, 2), uvFromAtlas(0, 4, 2));

    super(newMesh, null, { friction: 0.6, restitution: 0.3 }, position, 1); // TODO: simpler collider
    this.updateBoundingInfos();

    if (position) this.node.position.copyFrom(position);

    // this.straightenAtPickup = false;
    // this.isFlippable = false;
  }

  static Hexagon(position, radius, thickness, bevelRad, bevelN) {
    var topShape = createRegularShape(radius, 6);
    return new ShapedObject(position, topShape, thickness, bevelRad, bevelN);
  }

  static RoundedSquare(position, w, h, thickness, cRad, cN, bevelRad, bevelN) {
    var topShape = createRoundedRectangleShape(w - cRad * 2, h - cRad * 2, cRad, cN);
    return new ShapedObject(position, topShape, thickness, bevelRad, bevelN);
  }

  static Circle(position, radius, thickness, cN, bevelRad, bevelN) {
    var topShape = createRegularShape(radius, cN);
    return new ShapedObject(position, topShape, thickness, bevelRad, bevelN);
  }
}
