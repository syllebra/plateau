class SelectionBox {
  box = null;
  height = 1;
  p0 = new BABYLON.Vector3(-1, 0, -1);
  p1 = new BABYLON.Vector3(1, 0, 1);

  constructor(scene, height = 1.5) {
    this.height = height;
    const options = {
      width: 1,
      height: 1,
      depth: 1,
    };

    this.box = BABYLON.MeshBuilder.CreateBox("selection_box", options);
    var mat = new BABYLON.StandardMaterial("selection_box_material", scene);
    mat.diffuseColor = new BABYLON.Color4(0.1, 0.3, 1);
    mat.ambientColor = new BABYLON.Color3(0.1, 0.1, 0.2);
    mat.emissiveColor = new BABYLON.Color3(0.05, 0.15, 0.5);
    mat.alpha = 0.25;
    mat.backFaceCulling = false;
    this.box.material = mat;
    this.box.showBoundingBox = false;

    //this.box.position = position;
    this.update();
    this.setVisiblity(false);
  }

  update() {
    this.box.scaling = new BABYLON.Vector3(
      this.p1.x - this.p0.x,
      this.height,
      this.p1.z - this.p0.z
    );
    this.box.position = new BABYLON.Vector3(
      (this.p1.x + this.p0.x) * 0.5,
      this.p0.y + this.height * 0.5 + 0.001,
      (this.p1.z + this.p0.z) * 0.5
    );
  }

  setInitPoint(pos) {
    this.p0.copyFrom(pos);
    this.p1.copyFrom(pos);
    this.update();
  }
  setSecondPoint(pos) {
    this.p1.copyFrom(pos);
    this.update();
  }
  setVisiblity(b) {
    this.box.setEnabled(b);
  }
}

class SelectionHandler {
  static hl = null;
  static selbox = null;

  static createHighlightLayer(scene) {
    BABYLON.Effect.ShadersStore["glowBlurPostProcessPixelShader"] = `
    varying vec2 vUV;
    uniform sampler2D textureSampler;
    uniform vec2 screenSize;
    uniform vec2 direction;
    uniform float blurWidth;
    float getLuminance(vec3 color){return dot(color,vec3(0.2126,0.7152,0.0722));}
    #define CUSTOM_FRAGMENT_DEFINITIONS
    void main(void)
    {
      float weights[7];weights[0]=0.05;weights[1]=0.1;weights[2]=0.2;weights[3]=0.3;weights[4]=0.2;weights[5]=0.1;weights[6]=0.05;
      vec2 texelSize=vec2(1.0/screenSize.x,1.0/screenSize.y);
      vec2 texelStep=texelSize*direction*blurWidth;
      vec2 start=vUV-3.0*texelStep;
      vec4 baseColor=vec4(0.,0.,0.,0.);
      vec2 texelOffset=vec2(0.,0.);
      for (int i=0; i<7; i++)
      {
        vec4 texel=texture2D(textureSampler,start+texelOffset);
        baseColor.a+=texel.a*weights[i];
        float luminance=getLuminance(baseColor.rgb);
        float luminanceTexel=getLuminance(texel.rgb);
        float choice=step(luminanceTexel,luminance);
        baseColor.rgb=choice*baseColor.rgb+(1.0-choice)*texel.rgb;
        texelOffset+=texelStep;
      }
      float alpha = baseColor.a > 0.1 ? min(baseColor.a*2.5,1.0 ):0.0; 
      alpha = (alpha*alpha*alpha);
      gl_FragColor=vec4(baseColor.rgb*1.0, alpha);
      }
    `; // Add the highlight layer.
    this.hl = new BABYLON.HighlightLayer("highlight_layer", scene, {
      //mainTextureRatio:1.0,
      //alphaBlendingMode: 2,
      isStroke: false,
      innerGlow: false,
      outerGlow: true,
      blurHorizontalSize: 0.7,
      blurVerticalSize: 0.7,
    });
  }
  static init(scene) {
    this.createHighlightLayer(scene);
    this.selbox = new SelectionBox(scene);
    this.hl.addExcludedMesh(this.selbox.box);
  }

  static addMesh(mesh) {
    if (this.hl && !this.isSelected(mesh))
      this.hl.addMesh(mesh, new BABYLON.Color3(0, 1, 1));
  }

  static removeMesh(mesh) {
    if (this.hl && this.isSelected(mesh)) this.hl.removeMesh(mesh);
  }

  static removeAll() {
    if (this.hl) this.hl.removeAllMeshes();
  }

  static isSelected(mesh) {
    return this.hl.hasMesh(mesh);
  }

  static toggleSelection(mesh) {
    var isIn = this.isSelected(mesh);
    if (isIn) this.removeMesh(mesh);
    else this.addMesh(mesh);
  }
}
