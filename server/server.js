
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
require("dotenv").config();

const ImageProcessor = require("./imageProcessor");
const ProductService = require("./productService");

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced CORS configuration
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://visual-product-matcher-5fcboegv7-sonalis-projects-71ecc787.vercel.app",
    ], // Add your actual domain
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static(path.join(__dirname, "../public")));

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed."));
    }
  },
});

// Initialize services (lazy loading for serverless)
let imageProcessor = null;
let productService = null;

const initializeServices = async () => {
  if (!imageProcessor) {
    imageProcessor = new ImageProcessor();
    await imageProcessor.initialize();
  }
  if (!productService) {
    productService = new ProductService();
    await productService.testConnection();
  }
};

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Visual Product Matcher API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Serve main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Get all products
app.get("/api/products", async (req, res) => {
  try {
    await initializeServices();
    const products = await productService.getAllProducts();
    res.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch products",
    });
  }
});

// Search by uploaded image
app.post("/api/search/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image file provided",
      });
    }

    await initializeServices();

    console.log("Processing uploaded image...");
    const features = await imageProcessor.extractFeatures(req.file.buffer);

    console.log("Searching for similar products...");
    const similarProducts = await productService.findSimilarProducts(features);

    res.json({
      success: true,
      data: similarProducts,
      uploadedImage: `data:${
        req.file.mimetype
      };base64,${req.file.buffer.toString("base64")}`,
      count: similarProducts.length,
    });
  } catch (error) {
    console.error("Error processing uploaded image:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process image: " + error.message,
    });
  }
});

// Search by image URL
app.post("/api/search/url", async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: "No image URL provided",
      });
    }

    await initializeServices();

    console.log("Processing image from URL:", imageUrl);
    const features = await imageProcessor.extractFeaturesFromUrl(imageUrl);

    console.log("Searching for similar products...");
    const similarProducts = await productService.findSimilarProducts(features);

    res.json({
      success: true,
      data: similarProducts,
      uploadedImage: imageUrl,
      count: similarProducts.length,
    });
  } catch (error) {
    console.error("Error processing image URL:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process image URL: " + error.message,
    });
  }
});

// Get products by category
app.get("/api/products/category/:category", async (req, res) => {
  try {
    await initializeServices();
    const { category } = req.params;
    const products = await productService.getProductsByCategory(category);

    res.json({
      success: true,
      data: products,
      category: category,
      count: products.length,
    });
  } catch (error) {
    console.error("Error fetching products by category:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch products by category",
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Error:", error);

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "File too large. Maximum size is 5MB.",
      });
    }
  }

  res.status(500).json({
    success: false,
    error: error.message || "Internal server error",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

// For local development
if (require.main === module) {
  const startServer = async () => {
    try {
      console.log("Initializing services for local development...");
      await initializeServices();

      app.listen(PORT, () => {
        console.log(`🚀 Visual Product Matcher server running on port ${PORT}`);
        console.log(`📱 Frontend: http://localhost:${PORT}`);
        console.log(`🔗 API Health: http://localhost:${PORT}/api/health`);
        console.log(`📊 Products API: http://localhost:${PORT}/api/products`);
      });
    } catch (error) {
      console.error("Failed to start server:", error);
      process.exit(1);
    }
  };

  startServer();
}

// Export for Vercel

module.exports = app;
