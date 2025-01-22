function arcFan(cx, cy, r, start, end, nb, shape) {
  var inc = (end - start) / nb;

  for (var a = start + inc; a < end; a += inc) {
    shape.push(new BABYLON.Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.0));
  }
}

function createRoundedRectangleShape(w = 0.572, h = 0.889, cRad = 0.05, cN = 4) {
  var shape = [];

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

function createRegularShape(radius = 0.572, cN = 6) {
  var shape = [];

  var tmp = h;
  h = w;
  w = tmp;

  shape.push(new BABYLON.Vector3(-radius, 0.0, 0.0));
  arcFan(0, 0, radius, Math.PI, Math.PI * 3, cN, shape);
  //shape.reverse();

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
    var jj = i == 0 ? shape.length-1 : i - 1;
    var p2 = shape[jj];
    var d = new BABYLON.Vector3(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);
    d.normalize();
    var t = d.cross(BABYLON.Vector3.Forward());
    t.normalize();
    var p = new BABYLON.Vector3(p0.x + t.x * amount, p0.y + t.y * amount, p0.z + t.z * amount);
    ret.push(p);

    console.log(shape)
  }
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

function planarUVProjectXZ(
  mesh,
  frontUvs = new BABYLON.Vector4(0, 0, 1, 1),
  backUvs = null
) {
  const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
  const uvs = mesh.getVerticesData(BABYLON.VertexBuffer.UVKind);
  const norms = mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind);
  const numVertices = positions.length / 3;

  var bb = mesh.getBoundingInfo().boundingBox;

  if(!backUvs)
    backUvs = frontUvs.clone();

  const eps = 0.001;
  const minx = bb.minimum.x - eps;
  const minz = bb.minimum.z - eps;
  const maxx = bb.maximum.x + eps;
  const maxz = bb.maximum.z + eps;

  for (let i = 0; i < numVertices; i++) {
    const x = positions[i * 3 + 0];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];

    const ny = norms[i * 3 + 1];

    var uv = ny >= -eps ? frontUvs : backUvs;

    uvs[i * 2] = (x - minx) / (maxx - minx);
    if (ny < -eps) uvs[i * 2] = 1.0 - uvs[i * 2];
    uvs[i * 2] = uvs[i * 2] * (uv.z - uv.x) + uv.x;

    uvs[i * 2 + 1] = (z - minz) / (maxz - minz);
    //if (y < 0) uvs[i * 2 + 1] = 1.0 - uvs[i * 2 + 1];
    uvs[i * 2 + 1] = uvs[i * 2 + 1] * (uv.w - uv.y) + uv.y;
  }

  mesh.setVerticesData(BABYLON.VertexBuffer.UVKind, uvs);
}

function uvFromAtlas(num, cols, rows) {
  var row = Math.floor(num / cols);
  var col = num % cols;
  var dx = 1.0 / cols;
  var dy = 1.0 / rows;
  return new BABYLON.Vector4(dx * col, dy * row, dx * (col + 1), dy * (row + 1));
}

function extrudeShape(shape, thickness, center = false, capOpt = BABYLON.Mesh.CAP_ALL) {
  const minE = center ? -thickness * 0.5 : 0.0;
  const maxE = center ? thickness * 0.5 : thickness;
  var path = [new BABYLON.Vector3(0, maxE, 0), new BABYLON.Vector3(0, minE, 0)];
  const options = {
    shape: shape, //vec3 array with z = 0,
    path: path, //vec3 array
    // rotationFunction: rotFn,
    // scaleFunction: scaleFn,
    updatable: true,
    closeShape: true,
    cap: capOpt,
    //sideOrientation: BABYLON.Mesh.DOUBLESIDE,
    firstNormal: BABYLON.Vector3.Right()
  };

  return BABYLON.MeshBuilder.ExtrudeShapeCustom("extrudedShape", options, scene); //scene is
}

function createCardShape(w = 0.572, h = 0.889, thickness = 0.004, cRad = 0.05, cN = 4) {
  var shape = createRoundedRectangleShape(w, h, cRad, cN);
  return extrudeShape(shape, thickness, true);
}
