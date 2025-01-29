class TextObject {
  texture = null;
  node = null;
  constructor(text, bold = false, font_size = 48, fontName = "Arial", color="#FFFFFF", flipY = false) {
    //Set font
    // var font_size = 48;
    // var font = "bold " + font_size + "px Arial";
    var font = (bold ? "bold " : "") + font_size + "px " + fontName;
     
    //Set height for plane
    var planeHeight = 0.3;

    //Set height for dynamic texture
    var DTHeight = 1.5 * font_size; //or set as wished

    //Calcultae ratio
    var ratio = planeHeight / DTHeight;

    //Use a temporay dynamic texture to calculate the length of the text on the dynamic texture canvas
    var temp = new BABYLON.DynamicTexture("DynamicTexture", 64, scene);
    var tmpctx = temp.getContext();
    tmpctx.font = font;
    var DTWidth = tmpctx.measureText(text).width + 8;

    //Calculate width the plane has to be
    var planeWidth = DTWidth * ratio;

    //Create dynamic texture and write the text
    var dynamicTexture = new BABYLON.DynamicTexture(
      "DynamicTexture",
      { width: DTWidth, height: DTHeight },
      scene,
      false
    );
    dynamicTexture.hasAlpha = true;
    var mat = new BABYLON.StandardMaterial("mat", scene);
    mat.diffuseTexture = dynamicTexture;
    dynamicTexture.drawText(text, null, null, font, color, "transparent", flipY);

    //Create plane and set dynamic texture as material
    var plane = BABYLON.MeshBuilder.CreatePlane("plane", { width: planeWidth, height: planeHeight }, scene);
    plane.material = mat;
    plane.receiveShadows = true;

    this.texture = dynamicTexture;
    this.node = plane;
  }
}
