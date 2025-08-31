const tf = require("@tensorflow/tfjs-node");
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

      this.model = await tf.loadLayersModel(
        "https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json"
      );

      console.log("✅ TensorFlow.js model loaded successfully");
      this.isInitialized = true;

     
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
    try {
     
      const processedBuffer = await sharp(imageBuffer)
        .resize(224, 224)
        .removeAlpha()
        .raw()
        .toBuffer();

     
      const tensor = tf.tensor3d(
        new Uint8Array(processedBuffer),
        [224, 224, 3]
      );

     
      const normalized = tensor.div(255.0);

     
      const batched = normalized.expandDims(0);

     
      tensor.dispose();
      normalized.dispose();

      return batched;
    } catch (error) {
      console.error("Error preprocessing image:", error);
      throw new Error("Failed to preprocess image");
    }
  }

  async extractFeatures(imageBuffer) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      
      const processedImage = await this.preprocessImage(imageBuffer);

    
      const features = this.model.predict(processedImage);

      const featureArray = await features.data();

      processedImage.dispose();
      features.dispose();

      return Array.from(featureArray);
    } catch (error) {
      console.error("Error extracting features:", error);
      throw new Error("Failed to extract image features");
    }
  }

  async extractFeaturesFromUrl(imageUrl) {
    try {
      console.log("Downloading image from URL:", imageUrl);

      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 10000,
        headers: {
          "User-Agent": "Visual-Product-Matcher/1.0",
        },
      });

      if (!response.data) {
        throw new Error("No image data received from URL");
      }

      const imageBuffer = Buffer.from(response.data);

      
      const metadata = await sharp(imageBuffer).metadata();
      if (
        !metadata.format ||
        !["jpeg", "png", "webp"].includes(metadata.format)
      ) {
        throw new Error(
          "Unsupported image format. Please use JPEG, PNG, or WebP."
        );
      }

      console.log(
        `✅ Image downloaded successfully: ${metadata.width}x${metadata.height} ${metadata.format}`
      );

      return await this.extractFeatures(imageBuffer);
    } catch (error) {
      console.error("Error processing image from URL:", error);
      if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
        throw new Error(
          "Unable to access the image URL. Please check the URL and try again."
        );
      } else if (error.response && error.response.status === 404) {
        throw new Error("Image not found at the provided URL.");
      } else if (error.message.includes("timeout")) {
        throw new Error(
          "Request timeout. Please try with a different image URL."
        );
      }
      throw error;
    }
  }

 
  cosineSimilarity(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
      throw new Error("Vectors must have the same length");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
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
        .raw()
        .toBuffer({ resolveWithObject: true });

      const histogram = {
        r: new Array(256).fill(0),
        g: new Array(256).fill(0),
        b: new Array(256).fill(0),
      };

      for (let i = 0; i < data.length; i += 3) {
        histogram.r[data[i]]++;
        histogram.g[data[i + 1]]++;
        histogram.b[data[i + 2]]++;
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
