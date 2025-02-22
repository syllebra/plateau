class PdfObject extends ShapedObject {
  texture = null;
  renderCanvas = [];
  pdf = null;
  currentPage = 0;
  url = null;

  constructor(url, pageNumber = 1, planeWidth = 2.1, planeHeight = 2.97, thickness = 0.01) {
    // var url =
    //   "https://steamusercontent-a.akamaihd.net/ugc/1481073489969110801/D4F2A221E4F891CA741DEAF96DA774CCDFF53A78/";

    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) pdfjsLib.GlobalWorkerOptions.workerSrc = "js/ext/pdf.worker.min.mjs";

    var topShape = createRectangleShape(planeWidth, planeHeight);
    super(null, topShape, null, thickness, 0, 0);

    this.url = url;

    var pdfObj = this;
    var pbr = new BABYLON.PBRMaterial("pdf", scene);
    pbr.albedoColor = new BABYLON.Color3(1, 1, 1);
    pbr.metallic = 0.0;
    pbr.roughness = 0.6;
    pdfObj.node.material = pbr;
    pdfObj.node.receiveShadows = true;

    // Asynchronous download of PDF
    var loadingTask = pdfjsLib.getDocument(url);
    console.log("PDF loading...");
    loadingTask.promise.then(
      function (pdf) {
        pdfObj.pdf = pdf;
        for (var i = 0; i < pdf.numPages; i++) pdfObj.renderCanvas.push(null);
        console.log("PDF loaded:", pdf.numPages, "pages");
        pdfObj.loadPage(pageNumber);
      },
      function (reason) {
        // PDF loading error
        console.error(reason);
      }
    );

    this.buttonsNode = null;
    this.createButtons();
  }

  createButtons() {
    var bb = this.getBoundingInfos().boundingBox;
    this.buttonsNode = new BABYLON.TransformNode("Buttons");
    this.buttonsNode.setParent(this.node);
    this.buttonsNode.position = BABYLON.Vector3.Zero();
    this.buttonsNode.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(-Math.PI * 0.5, 0, 0);
    this.buttonsNode.position.z = bb.minimum.z - 0.25;

    // Create the 3D UI manager
    var manager = scene.manager ? scene.manager : new BABYLON.GUI.GUI3DManager(scene);
    var panel = new BABYLON.GUI.PlanePanel();
    manager.addControl(panel);
    var addButton = function (panel, text, onclick = null) {
      var button = new BABYLON.GUI.HolographicButton("reset");
      panel.addControl(button);

      button.onPointerUpObservable.add(function () {
        if (onclick) onclick();
      });

      var text1 = new BABYLON.GUI.TextBlock();
      text1.fontFamily = "Amaranth";
      text1.text = text;
      text1.color = "white";
      text1.fontSize = 45;
      button.content = text1;
      // button.mesh.material = button.mesh.material.clone();
      button.mesh.material.albedoColor = BABYLON.Color3.Black();
      button.mesh.material.alpha = 0.3;
      return button;
    };

    var keepRef = this;

    panel.linkToTransformNode(this.buttonsNode);
    panel.columns = 3;
    panel.position.x = 0;
    panel.scaling = BABYLON.Vector3.One().multiplyByFloats(0.5, 0.5, 0.5);

    var prev = addButton(panel, "<", () => keepRef.previousPage());
    var next = addButton(panel, ">", () => keepRef.nextPage());
    var open = addButton(panel, "Open", () => {
      window.open(this.url, "_blank").focus();
    });

    this.buttonsNode.setEnabled(false);
  }

  get preferedFrontVector() {
    return this.node.up;
  }
  get preferedUpVector() {
    return this.node.forward;
  }

  previousPage() {
    this.loadPage(this.currentPage == 1 ? this.pdf.numPages : this.currentPage - 1);
  }
  nextPage() {
    this.loadPage(this.currentPage == this.pdf.numPages ? 1 : this.currentPage + 1);
  }
  onKeyDown(key) {
    var consumed = super.onKeyDown(key);
    switch (key) {
      case "PageDown":
      case "ArrowLeft":
      case "ArrowDown":
        this.previousPage();
        break;
      case "PageUp":
      case "ArrowRight":
      case "ArrowUp":
        this.nextPage();
        break;
      default:
        return consumed;
    }
    return true;
  }

  loadPage(pageNumber = 1, logging = false) {
    if (logging) console.log("Loading page:", pageNumber);
    //TODO animation
    this.node.material.albedoColor.r = 0.2;
    var pdfObj = this;
    this.currentPage = pageNumber;
    this.pdf.getPage(pageNumber).then(function (page) {
      var scale = 1.5;
      var viewport = page.getViewport({ scale: scale });

      // Prepare canvas using PDF page dimensions
      //var canvas = document.getElementById('the-canvas');
      if (!pdfObj.renderCanvas[pdfObj.currentPage - 1])
        pdfObj.renderCanvas[pdfObj.currentPage - 1] = document.createElement("canvas"); //document.getElementById("pdf_renderer");
      var context = pdfObj.renderCanvas[pdfObj.currentPage - 1].getContext("2d");
      pdfObj.renderCanvas[pdfObj.currentPage - 1].height = viewport.height;
      pdfObj.renderCanvas[pdfObj.currentPage - 1].width = viewport.width;

      // Render PDF page into canvas context
      var renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      var renderTask = page.render(renderContext);
      renderTask.promise.then(() => {
        //var pdfMat = new BABYLON.BackgroundMaterial("PDF", scene);
        if (pdfObj.texture) pdfObj.texture.dispose();
        pdfObj.texture = new BABYLON.Texture(
          pdfObj.renderCanvas[pdfObj.currentPage - 1].toDataURL(),
          scene,
          true,
          false,
          BABYLON.Texture.TRILINEAR_SAMPLINGMODE
        );
        pdfObj.node.material.albedoTexture = pdfObj.texture;

        if (logging) console.log("Page loaded:", pdfObj.currentPage);
        pdfObj.node.material.albedoColor.r = 0.8;
      });
    });
  }

  onHoverEnter() {
    this.buttonsNode.setEnabled(true);
  }
  onHoverLeave() {
    this.buttonsNode.setEnabled(false);
  }
}
