class PlateauObject {
  body = null;
  node = null;
  animations = new Map();
  rotationAnimation = null;
  auto_collider_mode = 0;

  canReceive = false;
  acceptedClasses = new Set();

  constructor(
    node,
    colliderShape = null,
    physicsMaterial = { friction: 0.6, restitution: 0.3 },
    position = null,
    auto_collider_mode = 0
  ) {
    if (position) node.position = position;
    this.node = node;
    this.updateBoundingInfos();
    if (shadowGen) shadowGen.addShadowCaster(node, true);
    node.receiveShadows = true;
    this.body = new BABYLON.PhysicsBody(node, BABYLON.PhysicsMotionType.DYNAMIC, false, scene);

    this.auto_collider_mode = auto_collider_mode;

    if (!colliderShape) {
      colliderShape = this._updateAutoCollider();
    }
    if (colliderShape) {
      colliderShape.material = physicsMaterial;
      this.body.shape = colliderShape;
    }

    this.body.disablePreStep = false;
    //}, spawnPosition = null, spawnRotation = null) {

    this.node.plateauObj = this;
    this.node.dragged = false;

    this.straightenAtPickup = true;
    this.isFlippable = true;

    this.pickable = true;
    this.locked = false;

    this.physicsEnabled = true;

    this.canReceive = false;

    this._uuid = UUID.generate();
    //this.node.showBoundingBox = true;

    gizmoManager.attachableMeshes.push(this.node);
    gizmoManager.attachToMesh(this.node);
  }

  get uuid() { return this._uuid; }
  set uuid(val) { 
    var old = this.uuid;
    this._uuid=val;
    PlateauManager.changeObjectUUID(this, old);
  }

  get fullTitle() {
    return this.node.name;
  }

  get fullDescription() {
    return this.description ? this.description : "";
  }

  get fullAdditional() {
    return this.uuid + " - <<i>" + this.constructor.name + "</i>>";
  }

  setName(name) {
    this.node.id = this.node.name = name;
  }
  setDescription(desc) {
    this.description = desc;
  }

  clone(name = null, uuid = null) {
    // Avoid recursion
    var tmp = this.node.plateauObj;
    delete this.node.plateauObj;

    let ret = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    ret.node = this.node.clone(name ? name : this.node.name + "_clone");
    ret.node.plateauObj = ret;
    this.node.plateauObj = tmp;
    ret.body = this.body.clone(ret.node);
    ret.updateBoundingInfos();

    ret._uuid = UUID.generate();
    ret.uuid = uuid ? uuid : ret._uuid; // Implicitely record this object using new uuid
    ret.clonedFrom = this.uuid;
    return ret;
  }

  dispose() {
    if (this.body) {
      this.body.dispose();
      this.body = null;
    }
    if (this.node) {
      this.node.dispose();
      this.node = null;
    }
  }

  updateBoundingInfos() {
    var dst_H_world = XTransform.FromNodeWorld(this.node).inversed();

    function getLocalBB(n, dst) {
      var world_H_n = XTransform.FromNodeWorld(n);
      var dst_H_n = dst_H_world.multiply(world_H_n);
      var nbb = n.getBoundingInfo().boundingBox;
      var n_H_min = new XTransform(nbb.minimum);
      var n_H_max = new XTransform(nbb.maximum);

      var lMin = dst_H_n.multiply(n_H_min).position;
      var lMax = dst_H_n.multiply(n_H_max).position;

      lMin.x *= n.scaling.x;
      lMin.y *= n.scaling.y;
      lMin.z *= n.scaling.z;
      lMax.x *= n.scaling.x;
      lMax.y *= n.scaling.y;
      lMax.z *= n.scaling.z;

      for (var c of n.getChildren()) {
        if (c.dropZone) continue;
        var cBB = getLocalBB(c, dst);

        lMin.x = Math.min(cBB.min.x, cBB.max.x, lMin.x);
        lMin.y = Math.min(cBB.min.y, cBB.max.y, lMin.y);
        lMin.z = Math.min(cBB.min.z, cBB.max.z, lMin.z);

        lMax.x = Math.max(cBB.min.x, cBB.max.x, lMax.x);
        lMax.y = Math.max(cBB.min.y, cBB.max.y, lMax.y);
        lMax.z = Math.max(cBB.min.z, cBB.max.z, lMax.z);
      }

      return { min: lMin.clone(), max: lMax.clone() };
    }

    var bi = this.node.getBoundingInfo();
    var bb = getLocalBB(this.node, this.node);

    var mini = bi.boundingBox.minimum.clone();
    var maxi = bi.boundingBox.maximum.clone();

    mini.x = Math.min(bb.min.x, bb.max.x, mini.x);
    mini.y = Math.min(bb.min.y, bb.max.y, mini.y);
    mini.z = Math.min(bb.min.z, bb.max.z, mini.z);

    maxi.x = Math.max(bb.min.x, bb.max.x, maxi.x);
    maxi.y = Math.max(bb.min.y, bb.max.y, maxi.y);
    maxi.z = Math.max(bb.min.z, bb.max.z, maxi.z);

    //bi.reConstruct(bb.min, bb.max, this.node.getWorldMatrix());
    bi.reConstruct(mini, maxi, this.node.getWorldMatrix());
    this.boundingInfos = bi;
    return this.boundingInfos;
  }

  getBoundingInfos() {
    return this.boundingInfos;
  }

  _updateAutoCollider() {
    if (!this.body) this.body = new BABYLON.PhysicsBody(this.node, BABYLON.PhysicsMotionType.DYNAMIC, false, scene);
    var colliderShape = this.body.shape;
    if (this.auto_collider_mode == 0) {
      var bb = this.getBoundingInfos().boundingBox;
      colliderShape = new BABYLON.PhysicsShapeBox(
        //center,
        bb.center,
        this.node.rotationQuaternion,
        new BABYLON.Vector3(bb.extendSize.x * 2.0, bb.extendSize.y * 2.0, bb.extendSize.z * 2.0),
        //sz,
        scene
      );
    } else if (this.auto_collider_mode == 1) {
      colliderShape = new BABYLON.PhysicsShapeConvexHull(this.node, scene);
    }
    this.body.shape = colliderShape;
    return colliderShape;
  }

  setEnabled(b, bPhys = undefined) {
    if (this.node) this.node.setEnabled(b);
    this.physicsEnabled = bPhys !== undefined ? bPhys : b;
    if (this.body) this.body._physicsPlugin.setPhysicsBodyEnabled(this.body, this.physicsEnabled);
  }

  startAnimationMode() {
    if (!this.body) return;
    this.body.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);
    this.body.disablePreStep = false;
    this.body.setLinearVelocity(new BABYLON.Vector3(0, 0, 0));
    this.body.setAngularVelocity(new BABYLON.Vector3(0, 0, 0));
    this.body.checkCollisions = true;
  }
  updateAnimationModeTarget(params, currentValue, targetValue, speed = 2) {
    var nbf = ((targetValue - currentValue) * 1000) / speed;

    if (this.animations.has(params.targets)) {
      // Change current animation if not finished
      let current_anim = this.animations.get(params.targets);
      if (current_anim.target == this.node) {
        current_anim.getAnimations()[0].currentValue = height;
        current_anim.getAnimations()[0].duration = nbf;
        current_anim.getAnimations()[0].restart();
      }
      //current_anim.animations[0]()[0]._keys[1].value = height;
      return;
    }

    params.easing = "linear";
    params.duration = nbf;
    let current_anim = anime(params);
    this.animations.set(params.targets, current_anim);
    let animPhysObj = this;
    //current_anim.play()
    current_anim.complete = function () {
      current_anim = null;
      animPhysObj.animations.delete(params.targets);
    };
  }

  animateRotationTo(targetQuaternion, angularspeed = 270, finishedCB = null) {
    if (!this.node) return;
    var vecUp = this.node.up;
    var destUp = new BABYLON.Vector3(0, 1, 0);
    new BABYLON.Vector3(0, 1, 0).rotateByQuaternionToRef(targetQuaternion, destUp);

    vecUp.normalize();
    destUp.normalize();
    var rotaAxis = vecUp.cross(destUp);
    var angleRad = 0.0;
    if (rotaAxis.length() > 0.00001) {
      rotaAxis.normalize();
      angleRad = Math.abs(BABYLON.Vector3.GetAngleBetweenVectors(vecUp, destUp, rotaAxis));
    } else {
      angleRad = BABYLON.Tools.ToRadians(angleDegreesBetweenTwoUnitVectors(vecUp, destUp));
    }

    var dist = BABYLON.Tools.ToDegrees(angleRad);

    var nbf = (dist * 600) / angularspeed;
    return this.animateRotation(targetQuaternion, nbf, finishedCB);
  }

  animateRotation(quat, nbf, finishedCB = null) {
    if (this.rotationAnimation) {
      let toRotate = this.rotationAnimation.animatables[0].target;
      toRotate.rotateAnimStart.copyFrom(toRotate.rotationQuaternion);
      toRotate.rotateAnimTarget.copyFrom(quat);
      toRotate.rotationAnimationFinishedCB = finishedCB;
      this.rotationAnimation.animations[0].currentValue = 0;
      this.rotationAnimation.animations[0].duration = nbf;
      this.rotationAnimation.restart();

      return this.rotationAnimation;
    }

    let toRotate = this.node;
    toRotate.rotateAnimValue = 0.0;
    toRotate.rotateAnimStart = toRotate.rotationQuaternion.clone();
    toRotate.rotateAnimTarget = quat.clone();
    toRotate.rotationAnimationFinishedCB = finishedCB;

    this.rotationAnimation = anime({
      targets: toRotate,
      rotateAnimValue: 1.0,
      //rotationQuaternion: destRot,
      easing: "linear",
      duration: nbf,
      update: function (v) {
        BABYLON.Quaternion.SlerpToRef(
          toRotate.rotateAnimStart,
          toRotate.rotateAnimTarget,
          toRotate.rotateAnimValue,
          toRotate.rotationQuaternion
        );
      },
    });

    this.rotationAnimation.complete = function () {
      toRotate.plateauObj.rotationAnimation = null;
      if (toRotate.rotationAnimationFinishedCB) toRotate.rotationAnimationFinishedCB();
    };
    return this.rotationAnimation;
  }

  animatePosition(pos, nbf, finishedCB = null) {
    if (this.positionAnimation) {
      let toMove = this.positionAnimation.animatables[0].target;
      toMove.toMoveAnimStart.copyFrom(toMove.position);
      toMove.toMoveAnimTarget.copyFrom(pos);
      toMove.positionAnimationFinishedCB = finishedCB;
      this.positionAnimation.animations[0].currentValue = 0;
      this.positionAnimation.animations[0].duration = nbf;
      this.positionAnimation.restart();

      return this.positionAnimation;
    }

    let toMove = this.node;
    toMove.positionAnimValue = 0.0;
    toMove.positionAnimStart = toMove.position.clone();
    toMove.positionAnimTarget = pos.clone();
    toMove.positionAnimationFinishedCB = finishedCB;

    this.positionAnimation = anime({
      targets: toMove,
      positionAnimValue: 1.0,
      easing: "linear",
      duration: nbf,
      update: function (v) {
        BABYLON.Vector3.SlerpToRef(
          toMove.positionAnimStart,
          toMove.positionAnimTarget,
          toMove.positionAnimValue,
          toMove.position
        );
      },
    });

    this.positionAnimation.complete = function () {
      toMove.plateauObj.positionAnimation = null;
      if (toMove.positionAnimationFinishedCB) toMove.positionAnimationFinishedCB();
    };
    return this.positionAnimation;
  }

  stopAnimationMode() {
    if (!this.body || this.locked) return;
    // TODO: Clear all current animations
    this.body.disablePreStep = true;
    this.body.setMotionType(BABYLON.PhysicsMotionType.DYNAMIC);
  }

  orientUpTo(destUp = BABYLON.Vector3.Up()) {
    if (!this.node) return;
    var destRot = new BABYLON.Quaternion(0, 0, 0, 1);
    var addrot = computeVectortoVectorRotationQuaternion(this.node.up, destUp);
    addrot.multiplyToRef(this.node.rotationQuaternion, destRot);
    this.animateRotationTo(destRot);
  }

  animateFlip(worldAxis) {
    if (!this.node) return;
    var curAngle = angleDegreesBetweenTwoUnitVectors(this.node.up, BABYLON.Vector3.Up());

    var dstUp = curAngle < 90 ? BABYLON.Vector3.Down() : BABYLON.Vector3.Up();

    var quat = computeVectortoVectorRotationQuaternion(this.node.up, dstUp, worldAxis);
    var destRot = new BABYLON.Quaternion(0, 0, 0, 1);
    quat.multiplyToRef(this.node.rotationQuaternion, destRot);
    this.animateRotationTo(destRot);
  }

  flip() {
    if (!this.node) return;
    if (!this.isFlippable) return;

    if (!this.node.dragged) return; // For now only if handled

    this.animateFlip(this.node.forward);
  }

  onPickup() {
    if (this.straightenAtPickup && !this.locked) {
      this.orientUpTo();
    }
  }

  onRelease() {}

  onKeyDown(key) {
    switch (key) {
      case "l":
      case "L":
        this.locked = !this.locked;
        return true;
        break;
      case "u":
      case "U":
        console.log(this.uuid, this.node.position, this.node.rotationQuaternion);
        navigator.permissions.query({ name: "clipboard-write" }).then((result) => {
          if (result.state === "granted" || result.state === "prompt") {
            navigator.clipboard.writeText(this.uuid);
            /* write to the clipboard now */
          }
        });
        
        return true;
        break;
      default:
        break;
    }
    return false;
  }

  onKeyUp(key) {
    return false;
  }

  static GetTopMost(node) {
    if (!node) return null;
    if (node.plateauObj && (!node.parent || !node.parent.plateauObj)) return node.plateauObj;
    return PlateauObject.GetTopMost(node.parent);
  }

  checkSubPick(pickInfo = null) {
    return this;
  }

  dropOn(destNode, animateRotation = true, finishedCB = null) {
    this.startAnimationMode();
    this.setEnabled(true, false);
    // var tr = XTransform.FromNodeWorld(destNode);
    // tr.applyToNodeWorld(this.node);
    // return;

    if (animateRotation) this.animateRotation(destNode.absoluteRotationQuaternion, 280);
    var dstPos = destNode.absolutePosition.clone();

    var bb = this.getBoundingInfos().boundingBox;
    dstPos.y -= bb.minimum.y * this.node.scaling.y;

    this.animatePosition(dstPos, 300, () => {
      if (finishedCB) finishedCB();
      var po = PlateauObject.GetTopMost(destNode);
      if (po && po.accept(this)) po.received(this);
    });
  }

  received(po) {
    console.log(this.node.name + " received " + po.node.name);
    this.setEnabled(true, true);
    this.stopAnimationMode();
  }

  updateZones() {}

  accept(obj) {
    if (!this.canReceive) return false;
    if (this.acceptedClasses.size == 0) return true;
    for (var cl of this.acceptedClasses) if (obj instanceof cl) return true;
    return false;
  }

  static GetHovered(position, obj = null) {
    var ray = new BABYLON.Ray(position, new BABYLON.Vector3(0, -10000, 0));

    var pi = scene.pickWithRay(
      ray,
      (mesh, i) => mesh.plateauObj && mesh.plateauObj != obj && mesh.plateauObj.accept(obj)
    );

    if (!pi.hit) return null;

    return pi.pickedMesh.plateauObj;
  }

  static CheckCurrentDrop(position, obj = null) {
    var hoveredpo = PlateauObject.GetHovered(position, obj);
    SelectionHandler.updateHover(hoveredpo, new BABYLON.Color3(0.4, 0.8, 0.1));
  }
}

class MeshObjectUtils {
  static library = new Map();

  static async loadCached(meshURL, clone = true) {
    if (this.library.has(meshURL)) {
      var mesh = this.library.get(meshURL);
      return clone ? mesh.clone() : mesh;
    }
    var container = await BABYLON.loadAssetContainerAsync(meshURL, scene);
    var mesh = container.meshes[1];
    this.library.set(meshURL, mesh);
    mesh.setEnabled(false); // Hide for library
    if (clone) mesh = mesh.clone();
    return clone ? mesh.clone() : mesh;
  }

  static async Create(meshURL, scale = BABYLON.Vector3.One(), clone = true) {
    var mesh = await this.loadCached(meshURL);
    mesh.setEnabled(true);
    mesh.scaling.copyFrom(scale);
    return new PlateauObject(mesh, null, { friction: 0.6, restitution: 0.3 }, null, 1);
  }
}


class PlateauManager {
  static Objects = new Map(); // UUID to PlateauObject
  
  static getObject(uuid) {
    return this.Objects.has(uuid) ? this.Objects.get(uuid) : null;
  }
  static addObject(po) {
    if( PlateauManager.Objects.has(po.uuid))
      throw new Error("Doubling UUID!");
    PlateauManager.Objects.set(po.uuid, po);
  }

  static changeObjectUUID(po, lastuuid) {
    if( PlateauManager.Objects.has(lastuuid))
      PlateauManager.Objects.delete(lastuuid);
    PlateauManager.addObject(po);
  }

  static getObjectFromName(partial_name) {
    var ret = [];
    this.Objects.forEach((v,k,m) => {
      //console.log(k ,"=>", v);
      if(v.fullTitle.includes(partial_name))
        ret.push(v);
    })
    return ret;
  }

}