const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = 3000;

let no_download = true;

// Serve static files from the frontend's "public" directory
const frontendPublicDir = path.join(__dirname, "..", "frontend", "public");
app.use(express.static(frontendPublicDir));

// Middleware to parse JSON bodies
app.use(express.json());

// Ensure the "cache" directory exists
const cacheDir = path.join(frontendPublicDir, "cache");
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

// Helper function to generate a unique filename from a URL
function generateFilenameFromUrl(url, default_ext = ".jpg") {
  // Create a hash of the URL
  const hash = crypto.createHash("sha256").update(url).digest("hex");
  // Extract the file extension from the URL (default to .jpg if not provided)
  const fileExtension = path.extname(new URL(url).pathname) || default_ext;
  // Combine the hash and file extension
  return `${hash}${fileExtension}`;
}

// Endpoint to handle external resource requests
app.post("/api/download", async (req, res) => {
  const { url, subdir, category, default_ext } = req.body;
  //console.log(url,subdir,category, default_ext);

  // Validate input
  if (!url || !subdir || !category) {
    return res.status(400).json({ error: "URL, subdir and category are required" });
  }

  try {
    // Create a subfolder for the category if it doesn't exist
    const categoryDir = path.join(cacheDir, subdir, category);
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }

    // Generate a unique filename from the URL
    const fileName = generateFilenameFromUrl(url, default_ext);
    const filePath = path.join(categoryDir, fileName);

    // Check if the file already exists
    if (fs.existsSync(filePath)) {
      // If the file exists, return the local URL without re-downloading
      const localUrl = `/cache/${subdir}/${category}/${fileName}`;
      return res.json({ localUrl });
    }
    if(no_download)
      return res.json({"/textures/default.jpg"});

    // Download the resource
    console.log("Downloading ", url, "...");
    const response = await axios.get(url, { responseType: "arraybuffer" });

    // Save the file locally
    fs.writeFileSync(filePath, response.data);
    console.log("... Done");
    // Return the local URL
    const localUrl = `/cache/${category}/${fileName}`;
    res.json({ localUrl });
  } catch (error) {
    console.error("Error downloading resource:", error);
    return res.status(500).json({ error: "Failed to download resource" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
