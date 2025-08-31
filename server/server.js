const express = require("express");
const cors = require("cors");
const multer = require("multer");
require("dotenv").config();

const ImageProcessor = require("./imageProcessor");
const ProductService = require("./productService");

const app = express();
const imageProcessor = new ImageProcessor();
const productService = new ProductService();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Only JPEG, PNG, WebP allowed."));
  },
});

// ✅ Lazy TensorFlow & DB init
let initialized = false;
async function ensureInit() {
  if (!initialized) {
    console.log("🔹 Initializing TensorFlow & DB...");
    await imageProcessor.initialize();
    await productService.testConnection();
    initialized = true;
  }
}

// Routes
app.get("/api/health", async (req, res) => {
  await ensureInit();
  res.json({
    success: true,
    message: "Visual Product Matcher API running",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/products", async (req, res) => {
  try {
    await ensureInit();
    const { page = 1, limit = 20, category } = req.query;
    const products = await productService.getAllProducts({
      page,
      limit,
      category,
    });
    res.json({
      success: true,
      data: products.items,
      count: products.total,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get("/api/products/category/:category", async (req, res) => {
  try {
    await ensureInit();
    const { category } = req.params;
    const products = await productService.getProductsByCategory(category);
    res.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post("/api/search/upload", upload.single("image"), async (req, res) => {
  try {
    await ensureInit();
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, error: "No file uploaded" });

    const features = await imageProcessor.extractFeatures(req.file.buffer);
    const similar = await productService.findSimilarProducts(features);
    res.json({
      success: true,
      data: similar,
      uploadedImage: `data:${
        req.file.mimetype
      };base64,${req.file.buffer.toString("base64")}`,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post("/api/search/url", async (req, res) => {
  try {
    await ensureInit();
    const { imageUrl } = req.body;
    if (!imageUrl)
      return res.status(400).json({ success: false, error: "No URL provided" });

    const features = await imageProcessor.extractFeaturesFromUrl(imageUrl);
    const similar = await productService.findSimilarProducts(features);
    res.json({
      success: true,
      data: similar,
      uploadedImage: imageUrl,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ✅ Export handler for Vercel
module.exports = app;
