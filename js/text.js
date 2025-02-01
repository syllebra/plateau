class TextObject {
  texture = null;
  node = null;
  constructor(text, options = {}) {
    var opts = {
      bold: false,
      fontSize: 48,
      fontName: "Arial",
      color: "#FFFFFF",
      flipY: false,
      backgroundColor: "transparent",
      lineSpacing: 1.2,
      //lineHeight: 0.1,
    };
    Object.assign(opts, options);

    if (!opts.hasOwnProperty("lineHeight")) opts.lineHeight = opts.fontSize * 0.005;
    var font = (opts.bold ? "bold " : "") + opts.fontSize + "px " + opts.fontName;

    //Set height for dynamic texture
    var lineHeight = opts.lineSpacing * opts.fontSize; //or set as wished

    var lines = text.split("\n");
    var numLines = lines.length;

    var DTHeight = lineHeight * numLines;

    //Use a temporary dynamic texture to calculate the length of the text on the dynamic texture canvas
    var temp = new BABYLON.DynamicTexture("DynamicTexture", 64, scene);
    var tmpctx = temp.getContext();
    tmpctx.font = font;
    var maxWidth = 0;
    var last_y_offset = 0;
    for (var l of lines) {
      var measure = tmpctx.measureText(l);
      //console.log(measure);
      last_y_offset += measure.fontBoundingBoxDescent;
      maxWidth = Math.max(measure.width + 8, maxWidth);
    }

    //DTHeight = totalHeight;

    var DTWidth = maxWidth;
    DTHeight += last_y_offset;

    //Calculate width the plane has to be
    //Set height for plane
    var planeHeight = (opts.lineHeight * DTHeight) / lineHeight;
    var ratio = planeHeight / DTHeight;
    var planeWidth = DTWidth * ratio;

    //Create dynamic texture and write the text
    var dynamicTexture = new BABYLON.DynamicTexture(
      "DynamicTexture",
      { width: DTWidth, height: DTHeight },
      scene,
      false
    );
    dynamicTexture.hasAlpha = opts.backgroundColor == "transparent";
    var mat = new BABYLON.StandardMaterial("mat", scene);
    mat.diffuseTexture = dynamicTexture;

    var y = lineHeight;
    for (var l of lines) {
      dynamicTexture.drawText(l, 2, y + 2, font, opts.color, opts.backgroundColor, opts.flipY);
      y += lineHeight;
    }

    //Create plane and set dynamic texture as material
    var plane = BABYLON.MeshBuilder.CreatePlane("plane", { width: planeWidth, height: planeHeight }, scene);
    plane.material = mat;
    plane.receiveShadows = true;

    this.texture = dynamicTexture;
    this.node = plane;
  }
}
