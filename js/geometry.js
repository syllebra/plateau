function createRoundedRectangleShape(
  w = 0.572,
  h = 0.889,
  cRad = 0.05,
  cN = 4
) {
  var shape = [];

  var tmp = h;
  h = w;
  w = tmp;

  function arcFan(cx, cy, r, start, end, nb) {
    var inc = (end - start) / nb;

    for (var a = start + inc; a < end; a += inc) {
      shape.push(
        new BABYLON.Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.0)
      );
    }
  }

  shape.push(new BABYLON.Vector3(-w * 0.5, h * 0.5 - cRad, 0.0));
  shape.push(new BABYLON.Vector3(-w * 0.5, -h * 0.5 + cRad, 0.0));

  arcFan(-w * 0.5 + cRad, -h * 0.5 + cRad, cRad, Math.PI, Math.PI * 1.5, cN);

  shape.push(new BABYLON.Vector3(-w * 0.5 + cRad, -h * 0.5, 0.0));
  shape.push(new BABYLON.Vector3(w * 0.5 - cRad, -h * 0.5, 0.0));

  arcFan(w * 0.5 - cRad, -h * 0.5 + cRad, cRad, Math.PI * 1.5, Math.PI * 2, cN);

  shape.push(new BABYLON.Vector3(w * 0.5, -h * 0.5 + cRad, 0.0));
  shape.push(new BABYLON.Vector3(w * 0.5, h * 0.5 - cRad, 0.0));

  arcFan(w * 0.5 - cRad, h * 0.5 - cRad, cRad, 0, Math.PI * 0.5, cN);

  shape.push(new BABYLON.Vector3(w * 0.5 - cRad, h * 0.5, 0.0));
  shape.push(new BABYLON.Vector3(-w * 0.5 + cRad, h * 0.5, 0.0));

  arcFan(-w * 0.5 + cRad, h * 0.5 - cRad, cRad, Math.PI * 0.5, Math.PI, cN);
  return shape;
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

    uvs[i * 2] = (x - bb.minimum.x) / (bb.maximum.x-bb.minimum.x);
    if (y < 0) uvs[i * 2] = 1.0 - uvs[i * 2];
    uvs[i * 2] = uvs[i * 2] * (uv.z - uv.x) + uv.x;

    uvs[i * 2 + 1] = (z - bb.minimum.z) / (bb.maximum.z-bb.minimum.z);
    //if (y < 0) uvs[i * 2 + 1] = 1.0 - uvs[i * 2 + 1];
    uvs[i * 2 + 1] = uvs[i * 2 + 1] * (uv.w - uv.y) + uv.y;
  }

  mesh.setVerticesData(BABYLON.VertexBuffer.UVKind, uvs);
}
