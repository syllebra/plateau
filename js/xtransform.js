class XTransform {
  position = new BABYLON.Vector3(0.0, 0.0, 0.0);
  rotation = new BABYLON.Quaternion(0.0, 0.0, 0.0, 1.0);

  constructor(position = null, rotation = null) {
    if (position) this.position.copyFrom(position);
    if (rotation) this.rotation.copyFrom(rotation);
  }

  // transformPosition(iPosition) {
  //     let vec = Vector3.Zero();
  //     iPosition.rotateByQuaternionToRef(this.rotation, vec);
  //     vec.addInPlace(this.position);
  //     return vec;
  // }
  static FromNode(node) {
    var result = new XTransform();
    result.position.copyFrom(node.position);
    result.rotation.copyFrom(node.rotationQuaternion);
  }

  multiply(xTransform) {
    var result = new XTransform();
    this.rotation.multiplyToRef(xTransform.rotation, result.rotation);
    xTransform.position.rotateByQuaternionToRef(this.rotation, result.position);
    result.position.addInPlace(this.position);
    return result;
  }

  inverse() {
    var rot = new BABYLON.Quaternion();
    this.rotation.inverseToRef(rot);
    var position = new BABYLON.Vector3();
    this.position.rotateByQuaternionToRef(this.rotation, position);
    position.x = -position.x;
    position.y = -position.y;
    position.z = -position.z;
    return new XTransform(position, rotation);
  }

  applyToNode(node) {
    node.position.copyFrom(this.position);
    node.rotationQuaternion.copyFrom(this.rotation);
  }
}

function angleDegreesBetweenTwoUnitVectors(v0, v1) {
  var dot = v0.dot(v1);
  if (dot <= -1) return 180.0;
  if (dot >= 1) return 0;
  var angleRad = Math.abs(Math.acos(dot));
  return BABYLON.Tools.ToDegrees(angleRad);
}

function computeVectortoVectorRotationQuaternion(
  v0,
  v1,
  defaultAxisRot = BABYLON.Vector3.Forward()
) {
  var ret = new BABYLON.Quaternion(0, 0, 0, 1);

  v0.normalize();
  v1.normalize();
  var rotaAxis = v0.cross(v1);
  if (rotaAxis.length() > 0.00001) {
    rotaAxis.normalize();
    var angleRad = BABYLON.Vector3.GetAngleBetweenVectors(v0, v1, rotaAxis);
  } else {
    rotaAxis.copyFrom(defaultAxisRot);
    angleRad = BABYLON.Tools.ToRadians(
      angleDegreesBetweenTwoUnitVectors(v0, v1)
    );
  }
  BABYLON.Quaternion.RotationAxisToRef(rotaAxis, -angleRad, ret);
  ret.normalize();
  ret.invertInPlace();

  return ret;
}
