function exportStateJSON(fileName) {
  data = {};
  PlateauManager.Objects.forEach((v, k, m) => {
    data[k] = v.state;
  });
  console.log(data);
  //   // Convert Object to JSON
  var jsonObject = JSON.stringify(data);

  var blob = new Blob([jsonObject], { type: "text/csv;charset=utf-8;" });
  if (navigator.msSaveBlob) {
    // IE 10+
    navigator.msSaveBlob(blob, fileName);
  } else {
    var link = document.createElement("a");
    if (link.download !== undefined) {
      // feature detection
      // Browsers that support HTML5 download attribute
      var url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}

var importStateJSON = function () {
  var element = document.createElement("div");
  element.innerHTML = '<input type="file">';
  var fileInput = element.firstChild;

  fileInput.addEventListener("change", function () {
    var file = fileInput.files[0];

    if (file.name.match(/\.(txt|json)$/)) {
      var reader = new FileReader();

      reader.onload = function () {
        var data = JSON.parse(reader.result);
        console.log(data);

        if (beforeImport) beforeImport();
        var toSet = [];
        //data.forEach((v, k, m) => {
        for (var k in data) {
          if (Object.prototype.hasOwnProperty.call(data, k)) {
            // do stuff
            var v = data[k];
            var po = PlateauManager.getObject(k);
            if (!po) {
              if (v.clonedFrom) {
                var origin = PlateauManager.getObject(v.clonedFrom);
                if (!origin) console.warn("Unable to clone:", k, " from ", v.clonedFrom);
                else {
                  po = origin.clone();
                  po.uuid = k;
                  po.state = v;
                }
              } else {
                // Trying to recreate from type...
                var cls = getClass(v.type);
                console.warn("Unable to find:", k);
                if (cls?.RecreateFromState) {
                  po = cls.RecreateFromState(v, k);
                }
              }
            } else {
              po.state = v;
            }
            if (po) toSet.push(po);
          }
        }

        window.setTimeout(() => {
          toSet.forEach((po) => {
            if (po.stopAnimationMode) po.stopAnimationMode();
          });
        }, 2000);
      };

      reader.readAsText(file);
    } else {
      alert("File not supported, .txt or .json files only");
    }
  });

  fileInput.click();
};
