class ShapedObject extends PlateauObject {
  constructor(
    position = null,
    topShape,
    topShapePhysics = null,
    thickness,
    bevelRad,
    bevelN,
    topUVs = new BABYLON.Vector4(0, 0, 1, 1),
    bottomUVs = new BABYLON.Vector4(1, 0, 0, 1),
    separatedMaterials = true
  ) {
    function flipShapeY(shape) {
      var flipped = [];
      for (var i = 0; i < shape.length; i++) {
        flipped[i] = shape[i].clone();
        flipped[i].y = -flipped[i].y;
      }
      return flipped;
    }
    var topShapeMirror = flipShapeY(topShape);

    var topBevel = null;

    if (bevelRad > 0) {
      var profile = createBeveledProfile(thickness, bevelRad, bevelN);
      //var topShape = createRoundedRectangleShape(w - cRad * 2, h - cRad * 2, cRad, cN);
      //var topShape = createRegularShape(w * 0.5, 60);
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
      var top = new BABYLON.PolygonMeshBuilder("", topShapeMirror, scene).build();

      bevels.position = new BABYLON.Vector3(0, thickness, 0);
      top.position = new BABYLON.Vector3(0, thickness, 0);
      //top.rotationQuaternion = new BABYLON.Quaternion.FromEulerAngles(0, BABYLON.Tools.ToRadians(0), 0);
      bevels.rotationQuaternion = new BABYLON.Quaternion.FromEulerAngles(BABYLON.Tools.ToRadians(-90), 0, 0);

      topBevel = BABYLON.Mesh.MergeMeshes([top, bevels], true);
    } else {
      topBevel = extrudeShape(topShapeMirror.reverse(), thickness, false, BABYLON.Mesh.CAP_START);
    }

    var bottomShape = expandShape(topShapeMirror, -bevelRad);
    var bottom = new BABYLON.PolygonMeshBuilder("", bottomShape, scene).build();
    bottom.flipFaces();
    flipNormals(bottom);

    planarUVProjectXZ(topBevel, topUVs);
    planarUVProjectXZ(bottom, bottomUVs,bottomUVs, true);

    const newMesh = BABYLON.Mesh.MergeMeshes(
      [topBevel, bottom],
      true,
      false,
      false,
      separatedMaterials,
      separatedMaterials
    );

    var collider = null;
    var physShape = topShapePhysics ? flipShapeY(topShapePhysics) : bottomShape;
    var colliderBuild = extrudeShape(physShape.reverse(), thickness, false, BABYLON.Mesh.CAP_ALL);
    collider = new BABYLON.PhysicsShapeConvexHull(
      colliderBuild, // mesh from which to produce the convex hull
      scene // scene of the shape
    );
    colliderBuild.dispose()

    super(newMesh, collider, { friction: 0.6, restitution: 0.3 }, position, 1); // TODO: simpler collider
    this.updateBoundingInfos();
    if (separatedMaterials) newMesh.subMeshes[1].materialIndex = 1;

    if (position) this.node.position.copyFrom(position);

    // this.straightenAtPickup = false;
    // this.isFlippable = false;
  }

  setMaterial(topMat, bottomMat = null) {
    if (bottomMat == null || bottomMat == topMat) {
      this.node.material = topMat;
      return;
    }
    if (!this.node.material || !this.node.material.subMaterials)
      this.node.material = new BABYLON.MultiMaterial(this.node.id + "_Mat", scene);

    this.node.material.subMaterials.push(topMat);
    this.node.material.subMaterials.push(bottomMat ? bottomMat : topMat);
  }

  //TODO: use bottom shape as param instead....
  static Hexagon(
    position,
    radius,
    thickness,
    bevelRad,
    bevelN,
    topUVs = new BABYLON.Vector4(0, 0, 1, 1),
    bottomUVs = new BABYLON.Vector4(1, 0, 0, 1)
  ) {
    var topShape = createRegularShape(radius - bevelRad, 6);
    return new ShapedObject(position, topShape, null, thickness, bevelRad, bevelN, topUVs, bottomUVs);
  }

  static Square(
    position,
    w,
    h,
    thickness,
    topUVs = new BABYLON.Vector4(0, 0, 1, 1),
    bottomUVs = new BABYLON.Vector4(1, 0, 0, 1)
  ) {
    var topShape = createRectangleShape(w, h);
    return new ShapedObject(position, topShape, null, thickness, 0, 0, topUVs, bottomUVs);
  }

  static RoundedSquare(
    position,
    w,
    h,
    thickness,
    cRad,
    cN,
    bevelRad,
    bevelN,
    topUVs = new BABYLON.Vector4(0, 0, 1, 1),
    bottomUVs = new BABYLON.Vector4(1, 0, 0, 1)
  ) {
    var topShape = createRoundedRectangleShape(w - bevelRad * 2, h - bevelRad * 2, cRad, cN);
    var physShape = createRoundedRectangleShape(w, h, cRad, Math.ceil(cN/3));
    return new ShapedObject(position, topShape, physShape, thickness, bevelRad, bevelN, topUVs, bottomUVs);
  }

  static Circle(
    position,
    radius,
    thickness,
    cN,
    bevelRad,
    bevelN,
    topUVs = new BABYLON.Vector4(0, 0, 1, 1),
    bottomUVs = new BABYLON.Vector4(1, 0, 0, 1)
  ) {
    var topShape = createRegularShape(radius - bevelRad, cN);
    var phys = createRegularShape(radius, Math.ceil(cN/3));
    return new ShapedObject(position, topShape, phys, thickness, bevelRad, bevelN, topUVs, bottomUVs);
  }
}
