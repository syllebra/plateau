class Pointer {
  static pointer = null;
  static pointerClone = null;
  static pointerSphere = null;
  static createFromMesh(meshSrc) {
    var mesh = meshSrc.clone("pointer");
    mesh.createNormals();
    mesh.scaling = new BABYLON.Vector3(2.5, 2.5, 2.5);
    mesh.material.clearCoat.isEnabled = true;
    mesh.material.clearCoat.intensity = 1.0;
    mesh.material.albedoColor = new BABYLON.Color3(0, 1, 1, 0.5);
    mesh.material.transparency = 0.4;

    mesh.material.metallic = 0.0;
    mesh.material.roughness = 1;
    if (shadowGen) shadowGen.addShadowCaster(mesh, true);
    Pointer.pointer = mesh;

    Pointer.pointerClone = Pointer.pointer.clone("pointerHollow");
    Pointer.pointerClone.setEnabled(false);

    const matc = new BABYLON.StandardMaterial("pointerHollow", scene);
    matc.depthFunction = BABYLON.Constants.ALWAYS;
    matc.disableColorWrite = true;
    matc.disableDepthWrite = true;

    Pointer.pointerClone.material = matc;
    Pointer.pointerClone.renderingGroupId = 1;

    // scene.onBeforeRenderObservable.add(() => {
    //   this.pointerClone.position.copyFrom(Pointer.pointer.position);
    // });

    Pointer.pointerSphere = BABYLON.MeshBuilder.CreateSphere("pointerSphere", { diameter: 0.03, segments: 8 }, scene);
    Pointer.pointerSphere.setEnabled(false);
    Pointer.pointerSphere.material = Pointer.pointer.material;
    if (shadowGen) shadowGen.addShadowCaster(Pointer.pointerSphere, true);
  }

  static isPointerPart(mesh) {
    return mesh && (mesh == Pointer.pointer || mesh == Pointer.pointerClone || mesh == Pointer.pointerSphere);
  }
  static load() {
    BABYLON.SceneLoader.LoadAssetContainer(
      "models/",
      "pointer_00.glb",
      scene,
      function (
        container //BABYLON.SceneLoader.ImportMesh("", "models/", modelNameAndExtension, pathTracingScene, function (meshes)
      ) {
        Pointer.createFromMesh(container.meshes[1]);
        Pointer.hide();
      }
    );
  }

  static show() {
    if (this.pointer) {
      this.pointer.setEnabled(true);
      this.pointerClone.setEnabled(true);
      this.pointerSphere.setEnabled(true);
      SelectionHandler.hl.addMesh(this.pointerClone, new BABYLON.Color3(0, 1, 1));
    }
  }
  static hide() {
    if (this.pointer) {
      this.pointer.setEnabled(false);
      this.pointerClone.setEnabled(false);
      this.pointerSphere.setEnabled(false);
      SelectionHandler.hl.removeMesh(this.pointerClone);
    }
  }

  static setVisible(b) {
    if (b) Pointer.show();
    else Pointer.hide();
  }

  static move(pos, sphereDec = 0) {
    if (this.pointer) this.pointer.position.copyFrom(pos);
    if (this.pointerClone) this.pointerClone.position.copyFrom(pos);
    if (this.pointerSphere) {
      this.pointerSphere.position.copyFrom(pos);
      this.pointerSphere.position.y += sphereDec + 0.015;
    }
  }
}
