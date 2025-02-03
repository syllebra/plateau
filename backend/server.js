const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

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

// Endpoint to handle external resource requests
app.post("/api/download", async (req, res) => {
  const { url, category } = req.body;

  // Validate input
  if (!url || !category) {
    return res.status(400).json({ error: "URL and category are required" });
  }

  try {
    // Create a subfolder for the category if it doesn't exist
    const categoryDir = path.join(cacheDir, category);
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }

    // Download the resource
    const response = await axios.get(url, { responseType: "arraybuffer" });

    // Determine file extension (default to .jpg if not provided)
    const fileExtension = path.extname(new URL(url).pathname) || ".jpg";
    const fileName = `${Date.now()}${fileExtension}`; // Unique filename
    const filePath = path.join(categoryDir, fileName);

    // Save the file locally
    fs.writeFileSync(filePath, response.data);

    // Return the local URL
    const localUrl = `/cache/${category}/${fileName}`;
    res.json({ localUrl });
  } catch (error) {
    console.error("Error downloading resource:", error);
    res.status(500).json({ error: "Failed to download resource" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
