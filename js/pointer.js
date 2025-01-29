class Pointer {
  static pointer = null;
  static load() {
    BABYLON.SceneLoader.LoadAssetContainer(
      "models/",
      "pointer_00.glb",
      scene,
      function (
        container //BABYLON.SceneLoader.ImportMesh("", "models/", modelNameAndExtension, pathTracingScene, function (meshes)
      ) {
        // clear out the mesh object and array
        //meshes = container.meshes;
        var mesh = container.meshes[1].clone();
        mesh.createNormals();
        mesh.scaling = new BABYLON.Vector3(2.5, 2.5, 2.5);
        mesh.material.clearCoat.isEnabled = true;
        mesh.material.clearCoat.intensity = 1.0;
        mesh.material.albedoColor = new BABYLON.Color3(0, 1, 1, 0.5);
        mesh.material.transparency = 0.4;

        mesh.material.metallic = 0.0;
        mesh.material.roughness = 1;

        if(shadowGen) shadowGen.addShadowCaster(mesh, true);
        Pointer.pointer = mesh;
        Pointer.hide();
      }
    );
  }

  static show() {
    if (this.pointer) this.pointer.setEnabled(true);
  }
  static hide() {
    if (this.pointer) this.pointer.setEnabled(false);
  }
  static move(pos) {
    if (this.pointer) this.pointer.position.copyFrom(pos);
  }
}
