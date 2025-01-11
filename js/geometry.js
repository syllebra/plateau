function arcFan(cx, cy, r, start, end, nb, shape) {
  var inc = (end - start) / nb;

  for (var a = start + inc; a < end; a += inc) {
    shape.push(new BABYLON.Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.0));
  }
}

function createRoundedRectangleShape(w = 0.572, h = 0.889, cRad = 0.05, cN = 4) {
  var shape = [];

  var tmp = h;
  h = w;
  w = tmp;

  shape.push(new BABYLON.Vector3(-w * 0.5, h * 0.5 - cRad, 0.0));
  shape.push(new BABYLON.Vector3(-w * 0.5, -h * 0.5 + cRad, 0.0));

  arcFan(-w * 0.5 + cRad, -h * 0.5 + cRad, cRad, Math.PI, Math.PI * 1.5, cN, shape);

  shape.push(new BABYLON.Vector3(-w * 0.5 + cRad, -h * 0.5, 0.0));
  shape.push(new BABYLON.Vector3(w * 0.5 - cRad, -h * 0.5, 0.0));

  arcFan(w * 0.5 - cRad, -h * 0.5 + cRad, cRad, Math.PI * 1.5, Math.PI * 2, cN, shape);

  shape.push(new BABYLON.Vector3(w * 0.5, -h * 0.5 + cRad, 0.0));
  shape.push(new BABYLON.Vector3(w * 0.5, h * 0.5 - cRad, 0.0));

  arcFan(w * 0.5 - cRad, h * 0.5 - cRad, cRad, 0, Math.PI * 0.5, cN, shape);

  shape.push(new BABYLON.Vector3(w * 0.5 - cRad, h * 0.5, 0.0));
  shape.push(new BABYLON.Vector3(-w * 0.5 + cRad, h * 0.5, 0.0));

  arcFan(-w * 0.5 + cRad, h * 0.5 - cRad, cRad, Math.PI * 0.5, Math.PI, cN, shape);
  return shape;
}

function reverseShape(shape) {
  var ret = [];
  for (var i = shape.length - 1; i >= 0; i--) ret.push(shape[i]);
  return ret;
}

function expandShape(shape, amount = 0.05) {
  var ret = [];
  for (var i = 0; i < shape.length; i++) {
    var p0 = shape[i];
    var ii = i == shape.length - 1 ? 0 : i + 1;
    var p1 = shape[ii];
    var d = new BABYLON.Vector3(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z);
    d.normalize();
    var t = d.cross(BABYLON.Vector3.Forward());
    t.normalize();
    var p = new BABYLON.Vector3(shape[i].x + t.x * amount, shape[i].y + t.y * amount, shape[i].z + t.z * amount);
    ret.push(p);
  }
  console.log(ret);
  return ret;
}

function createBeveledProfile(thickness, radius, segments) {
  var shape = [];
  shape.push(new BABYLON.Vector3(0.0, 0.0, 0.0));
  arcFan(0.0, -radius, radius, Math.PI * 0.5, Math.PI, segments, shape);
  shape.push(new BABYLON.Vector3(-radius, -radius, 0.0));
  shape.push(new BABYLON.Vector3(-radius, -thickness, 0.0));
  return shape;
}

function createTileTest(w, h, thickness, cRad, cN, bRad, bN) {
  var profile = createBeveledProfile(thickness, bRad, bN);
  var topShape = createRoundedRectangleShape(w - cRad * 2, h - cRad * 2, cRad, cN);
  var bottomShape = expandShape(topShape, bRad);

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
  return newMesh;
}

function planarUVProjectXZ(
  mesh,
  frontUvs = new BABYLON.Vector4(0, 0, 1, 1),
  backUvs = new BABYLON.Vector4(0, 0, 1, 1)
) {
  const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
  const uvs = mesh.getVerticesData(BABYLON.VertexBuffer.UVKind);
  const numVertices = positions.length / 3;

  var bb = mesh.getBoundingInfo().boundingBox;

  for (let i = 0; i < numVertices; i++) {
    const x = positions[i * 3 + 0];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];

    var uv = y > 0 ? frontUvs : backUvs;
    // TODO: borders (use normals)

    uvs[i * 2] = (x - bb.minimum.x) / (bb.maximum.x - bb.minimum.x);
    if (y < 0) uvs[i * 2] = 1.0 - uvs[i * 2];
    uvs[i * 2] = uvs[i * 2] * (uv.z - uv.x) + uv.x;

    uvs[i * 2 + 1] = (z - bb.minimum.z) / (bb.maximum.z - bb.minimum.z);
    //if (y < 0) uvs[i * 2 + 1] = 1.0 - uvs[i * 2 + 1];
    uvs[i * 2 + 1] = uvs[i * 2 + 1] * (uv.w - uv.y) + uv.y;
  }

  mesh.setVerticesData(BABYLON.VertexBuffer.UVKind, uvs);
}

function uvFromAtlas(num, cols, rows) {
  var row = Math.floor(num / cols);
  var col = num % cols;
  console.log(row, col);

  var dx = 1.0 / cols;
  var dy = 1.0 / rows;
  return new BABYLON.Vector4(dx * col, dy * row, dx * (col + 1), dy * (row + 1));
}
