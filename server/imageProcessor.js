const tf = require("@tensorflow/tfjs");
const sharp = require("sharp");
const axios = require("axios");

class ImageProcessor {
  constructor() {
    this.model = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log("Loading TensorFlow.js MobileNet model...");

      // Use a more reliable model URL
      this.model = await tf.loadLayersModel(
        "https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json"
      );

      console.log("✅ TensorFlow.js model loaded successfully");
      this.isInitialized = true;

      // Warm up the model
      const dummyInput = tf.zeros([1, 224, 224, 3]);
      const warmupPrediction = this.model.predict(dummyInput);
      warmupPrediction.dispose();
      dummyInput.dispose();

      console.log("✅ Model warmed up and ready");
    } catch (error) {
      console.error("❌ Failed to initialize TensorFlow model:", error);
      throw error;
    }
  }

  async preprocessImage(imageBuffer) {
    let tensor = null;
    let normalized = null;

    try {
      // Process image with Sharp
      const processedBuffer = await sharp(imageBuffer)
        .resize(224, 224, { fit: "cover" })
        .removeAlpha()
        .raw()
        .toBuffer();

      // Create tensor from processed buffer
      tensor = tf.tensor3d(new Uint8Array(processedBuffer), [224, 224, 3]);

      // Normalize pixel values to [0, 1]
      normalized = tensor.div(255.0);

      // Add batch dimension
      const batched = normalized.expandDims(0);

      return batched;
    } catch (error) {
      console.error("Error preprocessing image:", error);
      throw new Error("Failed to preprocess image");
    } finally {
      // Clean up intermediate tensors
      if (tensor) tensor.dispose();
      if (normalized) normalized.dispose();
    }
  }

  async extractFeatures(imageBuffer) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    let processedImage = null;
    let features = null;

    try {
      // Preprocess the image
      processedImage = await this.preprocessImage(imageBuffer);

      // Extract features using the model
      features = this.model.predict(processedImage);

      // Convert to array
      const featureArray = await features.data();

      return Array.from(featureArray);
    } catch (error) {
      console.error("Error extracting features:", error);
      throw new Error("Failed to extract image features");
    } finally {
      // Clean up tensors
      if (processedImage) processedImage.dispose();
      if (features) features.dispose();
    }
  }

  async extractFeaturesFromUrl(imageUrl) {
    try {
      console.log("Downloading image from URL:", imageUrl);

      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 15000, // Increased timeout
        maxRedirects: 5,
        headers: {
          "User-Agent": "Visual-Product-Matcher/1.0",
          Accept: "image/*",
        },
      });

      if (!response.data) {
        throw new Error("No image data received from URL");
      }

      const imageBuffer = Buffer.from(response.data);

      // Validate image
      try {
        const metadata = await sharp(imageBuffer).metadata();
        if (
          !metadata.format ||
          !["jpeg", "png", "webp", "gif", "tiff"].includes(metadata.format)
        ) {
          throw new Error(
            "Unsupported image format. Please use JPEG, PNG, WebP, GIF, or TIFF."
          );
        }

        console.log(
          `✅ Image downloaded successfully: ${metadata.width}x${metadata.height} ${metadata.format}`
        );
      } catch (sharpError) {
        throw new Error("Invalid or corrupted image file");
      }

      return await this.extractFeatures(imageBuffer);
    } catch (error) {
      console.error("Error processing image from URL:", error);

      if (error.code === "ENOTFOUND") {
        throw new Error(
          "Unable to resolve the image URL. Please check the URL."
        );
      } else if (error.code === "ECONNREFUSED") {
        throw new Error("Connection refused. The server may be down.");
      } else if (error.response?.status === 404) {
        throw new Error("Image not found at the provided URL (404).");
      } else if (error.response?.status === 403) {
        throw new Error("Access denied to the image URL (403).");
      } else if (
        error.code === "ECONNABORTED" ||
        error.message.includes("timeout")
      ) {
        throw new Error(
          "Request timeout. Please try with a different image URL."
        );
      } else if (error.message.includes("Unsupported image format")) {
        throw error;
      }

      throw new Error(`Failed to process image: ${error.message}`);
    }
  }

  // Cosine similarity calculation
  cosineSimilarity(vectorA, vectorB) {
    if (!vectorA || !vectorB) {
      return 0;
    }

    if (vectorA.length !== vectorB.length) {
      throw new Error("Vectors must have the same length");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      const a = vectorA[i] || 0;
      const b = vectorB[i] || 0;

      dotProduct += a * b;
      normA += a * a;
      normB += b * b;
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  async extractColorHistogram(imageBuffer) {
    try {
      const { data, info } = await sharp(imageBuffer)
        .resize(100, 100)
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const histogram = {
        r: new Array(256).fill(0),
        g: new Array(256).fill(0),
        b: new Array(256).fill(0),
      };

      // Calculate histogram
      for (let i = 0; i < data.length; i += 3) {
        if (data[i] !== undefined) histogram.r[data[i]]++;
        if (data[i + 1] !== undefined) histogram.g[data[i + 1]]++;
        if (data[i + 2] !== undefined) histogram.b[data[i + 2]]++;
      }

      // Normalize histograms
      const totalPixels = info.width * info.height;
      for (let i = 0; i < 256; i++) {
        histogram.r[i] /= totalPixels;
        histogram.g[i] /= totalPixels;
        histogram.b[i] /= totalPixels;
      }

      return histogram;
    } catch (error) {
      console.error("Error extracting color histogram:", error);
      return null;
    }
  }

  async calculateEnhancedSimilarity(
    features1,
    features2,
    histogram1,
    histogram2
  ) {
    const featureSimilarity = this.cosineSimilarity(features1, features2);

    let colorSimilarity = 0;
    if (histogram1 && histogram2) {
      const rSim = this.cosineSimilarity(histogram1.r, histogram2.r);
      const gSim = this.cosineSimilarity(histogram1.g, histogram2.g);
      const bSim = this.cosineSimilarity(histogram1.b, histogram2.b);
      colorSimilarity = (rSim + gSim + bSim) / 3;
    }

    return featureSimilarity * 0.8 + colorSimilarity * 0.2;
  }

  dispose() {
    if (this.model) {
      this.model.dispose();
      console.log("✅ TensorFlow model disposed");
    }
  }
}

module.exports = ImageProcessor;
