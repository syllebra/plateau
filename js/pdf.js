class PdfObject extends ShapedObject {
  texture = null;
  renderCanvas = [];
  pdf = null;
  currentPage = 0;

  constructor(url, pageNumber = 1, planeWidth = 2.1, planeHeight = 2.97, thickness = 0.01) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "js/ext/pdf.worker.min.mjs";
    // var url =
    //   "https://steamusercontent-a.akamaihd.net/ugc/1481073489969110801/D4F2A221E4F891CA741DEAF96DA774CCDFF53A78/";

    var topShape = createRectangleShape(planeWidth, planeHeight);
    super(null, topShape, null, thickness);

    var pdfObj = this;
    var pbr = new BABYLON.PBRMaterial("default_material", scene);
    pbr.albedoColor = new BABYLON.Color3(0.8, 0.8, 0.8);
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
        for(var i = 0; i<pdf.numPages;i++)
            pdfObj.renderCanvas.push(null);
        console.log("PDF loaded:", pdf.numPages, "pages");
        pdfObj.loadPage(pageNumber);
      },
      function (reason) {
        // PDF loading error
        console.error(reason);
      }
    );

    return pdfObj;
  }

  onKeyDown(key) {
    var consumed = super.onKeyDown(key);
    switch (key) {
      case "PageDown":
      case "ArrowLeft":
      case "ArrowDown":
        this.loadPage(this.currentPage == 1 ? this.pdf.numPages : this.currentPage - 1);
        break;
      case "PageUp":
      case "ArrowRight":
      case "ArrowUp":
        this.loadPage(this.currentPage == this.pdf.numPages ? 1 : this.currentPage + 1);
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
      if (!pdfObj.renderCanvas[pdfObj.currentPage-1]) pdfObj.renderCanvas[pdfObj.currentPage-1] = document.createElement("canvas"); //document.getElementById("pdf_renderer");
      var context = pdfObj.renderCanvas[pdfObj.currentPage-1].getContext("2d");
      pdfObj.renderCanvas[pdfObj.currentPage-1].height = viewport.height;
      pdfObj.renderCanvas[pdfObj.currentPage-1].width = viewport.width;

      // Render PDF page into canvas context
      var renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      var renderTask = page.render(renderContext);
      renderTask.promise.then(() => {
        //var pdfMat = new BABYLON.BackgroundMaterial("PDF", scene);
        if (pdfObj.texture) pdfObj.texture.dispose();
        pdfObj.texture = new BABYLON.Texture(pdfObj.renderCanvas[pdfObj.currentPage-1].toDataURL(), scene, true, false);
        pdfObj.node.material.albedoTexture = pdfObj.texture;

        if (logging) console.log("Page loaded:", pdfObj.currentPage);
        pdfObj.node.material.albedoColor.r = 0.8;
      });
    });
  }
}
