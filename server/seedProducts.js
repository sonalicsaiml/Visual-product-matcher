const ProductService = require("./productService");
const ImageProcessor = require("./imageProcessor");
require("dotenv").config();

async function seedProducts() {
  console.log("🌱 Starting product seeding process...");

  const productService = new ProductService();
  const imageProcessor = new ImageProcessor();

  try {
    await productService.testConnection();
    console.log("✅ Database connection established");

    await imageProcessor.initialize();
    console.log("✅ TensorFlow model loaded");

    console.log("🧹 Clearing existing product data...");
    await productService.clearAllData();

    console.log("📦 Initializing sample products...");
    const products = await productService.initializeSampleProducts();
    console.log(`✅ Created ${products.length} products`);

    console.log("🔍 Pre-extracting image features for products...");
    let processed = 0;

    for (const product of products) {
      try {
        console.log(
          `Processing ${processed + 1}/${products.length}: ${product.name}`
        );

        const features = await imageProcessor.extractFeaturesFromUrl(
          product.imageUrl
        );
        await productService.storeProductFeatures(product.id, features);

        processed++;
        console.log(`✅ Features extracted and stored for: ${product.name}`);

        // Add a small delay to avoid overwhelming the API
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.warn(`⚠️  Failed to process ${product.name}: ${error.message}`);
        continue;
      }
    }

    console.log(`\n🎉 Seeding completed successfully!`);
    console.log(`📊 Statistics:`);
    console.log(`   - Total products: ${products.length}`);
    console.log(`   - Features extracted: ${processed}`);
    console.log(
      `   - Success rate: ${Math.round((processed / products.length) * 100)}%`
    );

    console.log(`\n🧪 Testing similarity search...`);
    const testProduct = products[0];
    const testFeatures = await productService.getProductFeatures(
      testProduct.id
    );

    if (testFeatures) {
      const similarProducts = await productService.findSimilarProducts(
        testFeatures,
        0.1
      );
      console.log(
        `✅ Found ${similarProducts.length} similar products to "${testProduct.name}"`
      );

      if (similarProducts.length > 0) {
        console.log("🔝 Top matches:");
        similarProducts.slice(0, 3).forEach((product, index) => {
          console.log(
            `   ${index + 1}. ${product.name} (${
              product.matchPercentage
            }% similarity)`
          );
        });
      }
    }

    console.log(
      "\n✨ Seeding process completed! You can now start the server."
    );
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedProducts();
}

module.exports = seedProducts;
