const { Redis } = require("@upstash/redis");
const ImageProcessor = require("./imageProcessor");

class ProductService {
  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    this.imageProcessor = new ImageProcessor();
    this.productsKey = "products:all";
    this.featuresPrefix = "features:";
  }

  async testConnection() {
    try {
      await this.redis.ping();
      console.log("✅ Upstash Redis connection successful");
      return true;
    } catch (error) {
      console.error("❌ Failed to connect to Upstash Redis:", error);
      throw new Error("Database connection failed");
    }
  }

  async getAllProducts() {
    try {
      const products = await this.redis.get(this.productsKey);
      if (!products || products.length === 0) {
        console.log("No products found, initializing with sample data...");
        await this.initializeSampleProducts();
        return await this.redis.get(this.productsKey);
      }
      return products;
    } catch (error) {
      console.error("Error fetching products:", error);
      throw new Error("Failed to fetch products from database");
    }
  }

  async addProduct(product) {
    try {
      const products = (await this.getAllProducts()) || [];
      const newProduct = {
        id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...product,
        createdAt: new Date().toISOString(),
      };

      products.push(newProduct);
      await this.redis.set(this.productsKey, products);

      console.log(`✅ Added product: ${newProduct.name}`);
      return newProduct;
    } catch (error) {
      console.error("Error adding product:", error);
      throw new Error("Failed to add product to database");
    }
  }

  async storeProductFeatures(productId, features) {
    try {
      await this.redis.set(`${this.featuresPrefix}${productId}`, features);
    } catch (error) {
      console.error(`Error storing features for product ${productId}:`, error);
    }
  }

  async getProductFeatures(productId) {
    try {
      return await this.redis.get(`${this.featuresPrefix}${productId}`);
    } catch (error) {
      console.error(`Error getting features for product ${productId}:`, error);
      return null;
    }
  }

  async findSimilarProducts(queryFeatures, minSimilarity = 0.1) {
    try {
      const products = await this.getAllProducts();
      if (!products || products.length === 0) {
        return [];
      }

      const similarities = [];

      for (const product of products) {
        try {
          let productFeatures = await this.getProductFeatures(product.id);

          // If features don't exist, extract them from the product image
          if (!productFeatures) {
            console.log(`Extracting features for product: ${product.name}`);
            try {
              productFeatures =
                await this.imageProcessor.extractFeaturesFromUrl(
                  product.imageUrl
                );
              await this.storeProductFeatures(product.id, productFeatures);
            } catch (error) {
              console.warn(
                `Failed to extract features for product ${product.id}:`,
                error.message
              );
              continue;
            }
          }

          // Calculate similarity
          const similarity = this.imageProcessor.cosineSimilarity(
            queryFeatures,
            productFeatures
          );

          if (similarity >= minSimilarity) {
            similarities.push({
              ...product,
              similarity: Math.round(similarity * 100) / 100,
              matchPercentage: Math.round(similarity * 100),
            });
          }
        } catch (error) {
          console.warn(
            `Error processing product ${product.id}:`,
            error.message
          );
          continue;
        }
      }

      // Sort by similarity score (descending)
      similarities.sort((a, b) => b.similarity - a.similarity);

      console.log(`Found ${similarities.length} similar products`);
      return similarities.slice(0, 20); // Return top 20 matches
    } catch (error) {
      console.error("Error finding similar products:", error);
      throw new Error("Failed to find similar products");
    }
  }

  async getProductsByCategory(category) {
    try {
      const products = await this.getAllProducts();
      return products.filter(
        (product) => product.category.toLowerCase() === category.toLowerCase()
      );
    } catch (error) {
      console.error("Error fetching products by category:", error);
      throw new Error("Failed to fetch products by category");
    }
  }

  async initializeSampleProducts() {
    const sampleProducts = [
      // Electronics
      {
        id: "prod_1",
        name: "iPhone 15 Pro",
        category: "Electronics",
        price: 999,
        description: "Latest Apple smartphone with titanium design",
        imageUrl:
          "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500&h=500&fit=crop",
      },
      {
        id: "prod_2",
        name: "MacBook Air M2",
        category: "Electronics",
        price: 1199,
        description: "Thin and light laptop with Apple M2 chip",
        imageUrl:
          "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500&h=500&fit=crop",
      },
      {
        id: "prod_3",
        name: "AirPods Pro",
        category: "Electronics",
        price: 249,
        description: "Wireless earbuds with active noise cancellation",
        imageUrl:
          "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=500&h=500&fit=crop",
      },
      {
        id: "prod_4",
        name: "Samsung Galaxy S24",
        category: "Electronics",
        price: 899,
        description: "Android flagship with AI features",
        imageUrl:
          "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&h=500&fit=crop",
      },
      {
        id: "prod_5",
        name: "Dell XPS 13",
        category: "Electronics",
        price: 1099,
        description: "Premium ultrabook with InfinityEdge display",
        imageUrl:
          "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&h=500&fit=crop",
      },
      {
        id: "prod_6",
        name: "Sony WH-1000XM5",
        category: "Electronics",
        price: 399,
        description: "Premium noise-canceling headphones",
        imageUrl:
          "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop",
      },
      {
        id: "prod_7",
        name: 'iPad Pro 12.9"',
        category: "Electronics",
        price: 1099,
        description: "Professional tablet with M2 chip",
        imageUrl:
          "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&h=500&fit=crop",
      },
      {
        id: "prod_8",
        name: "Nintendo Switch OLED",
        category: "Electronics",
        price: 349,
        description: "Portable gaming console with OLED screen",
        imageUrl:
          "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=500&h=500&fit=crop",
      },
      {
        id: "prod_9",
        name: "Canon EOS R5",
        category: "Electronics",
        price: 3899,
        description: "Professional mirrorless camera",
        imageUrl:
          "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=500&h=500&fit=crop",
      },
      {
        id: "prod_10",
        name: "Apple Watch Series 9",
        category: "Electronics",
        price: 399,
        description: "Advanced smartwatch with health monitoring",
        imageUrl:
          "https://images.unsplash.com/photo-1551816230-ef5deaed4a26?w=500&h=500&fit=crop",
      },

      // Fashion
      {
        id: "prod_11",
        name: "Nike Air Jordan 1",
        category: "Fashion",
        price: 170,
        description: "Classic basketball sneakers",
        imageUrl:
          "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&h=500&fit=crop",
      },
      {
        id: "prod_12",
        name: "Levi's 501 Jeans",
        category: "Fashion",
        price: 98,
        description: "Classic straight-leg denim jeans",
        imageUrl:
          "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&h=500&fit=crop",
      },
      {
        id: "prod_13",
        name: "Ray-Ban Aviator Sunglasses",
        category: "Fashion",
        price: 154,
        description: "Iconic pilot-style sunglasses",
        imageUrl:
          "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500&h=500&fit=crop",
      },
      {
        id: "prod_14",
        name: "Adidas Ultraboost 23",
        category: "Fashion",
        price: 190,
        description: "High-performance running shoes",
        imageUrl:
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop",
      },
      {
        id: "prod_15",
        name: "Champion Hoodie",
        category: "Fashion",
        price: 60,
        description: "Comfortable cotton-blend hoodie",
        imageUrl:
          "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&h=500&fit=crop",
      },
      {
        id: "prod_16",
        name: "Converse Chuck Taylor",
        category: "Fashion",
        price: 55,
        description: "Classic canvas sneakers",
        imageUrl:
          "https://images.unsplash.com/photo-1539185441755-769473a23570?w=500&h=500&fit=crop",
      },
      {
        id: "prod_17",
        name: "Leather Crossbody Bag",
        category: "Fashion",
        price: 89,
        description: "Minimalist leather bag for everyday use",
        imageUrl:
          "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&h=500&fit=crop",
      },
      {
        id: "prod_18",
        name: "Casio G-Shock Watch",
        category: "Fashion",
        price: 99,
        description: "Durable digital sports watch",
        imageUrl:
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop",
      },
      {
        id: "prod_19",
        name: "Winter Wool Coat",
        category: "Fashion",
        price: 199,
        description: "Elegant wool coat for cold weather",
        imageUrl:
          "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500&h=500&fit=crop",
      },
      {
        id: "prod_20",
        name: "Baseball Cap",
        category: "Fashion",
        price: 25,
        description: "Adjustable cotton baseball cap",
        imageUrl:
          "https://images.unsplash.com/photo-1575428652377-a2d80e2277fc?w=500&h=500&fit=crop",
      },

      // Home & Living
      {
        id: "prod_21",
        name: "Dyson V15 Vacuum",
        category: "Home",
        price: 749,
        description: "Cordless stick vacuum with laser detection",
        imageUrl:
          "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=500&fit=crop",
      },
      {
        id: "prod_22",
        name: "KitchenAid Stand Mixer",
        category: "Home",
        price: 379,
        description: "Professional-grade stand mixer",
        imageUrl:
          "https://images.unsplash.com/photo-1586672806791-3a78b2232d52?w=500&h=500&fit=crop",
      },
      {
        id: "prod_23",
        name: "Instant Pot Pro",
        category: "Home",
        price: 149,
        description: "Multi-use pressure cooker",
        imageUrl:
          "https://images.unsplash.com/photo-1585515656161-638928ff60cc?w=500&h=500&fit=crop",
      },
      {
        id: "prod_24",
        name: "Velvet Throw Pillows",
        category: "Home",
        price: 35,
        description: "Set of luxury velvet decorative pillows",
        imageUrl:
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&h=500&fit=crop",
      },
      {
        id: "prod_25",
        name: "Ceramic Coffee Mugs",
        category: "Home",
        price: 42,
        description: "Set of 4 handcrafted ceramic mugs",
        imageUrl:
          "https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?w=500&h=500&fit=crop",
      },
      {
        id: "prod_26",
        name: "Area Rug 8x10",
        category: "Home",
        price: 299,
        description: "Modern geometric pattern area rug",
        imageUrl:
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&h=500&fit=crop",
      },
      {
        id: "prod_27",
        name: "LED Desk Lamp",
        category: "Home",
        price: 79,
        description: "Adjustable LED desk lamp with USB charging",
        imageUrl:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=500&fit=crop",
      },
      {
        id: "prod_28",
        name: "Canvas Wall Art",
        category: "Home",
        price: 89,
        description: "Abstract canvas art for modern decor",
        imageUrl:
          "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=500&h=500&fit=crop",
      },
      {
        id: "prod_29",
        name: "Bamboo Cutting Board",
        category: "Home",
        price: 45,
        description: "Eco-friendly bamboo cutting board set",
        imageUrl:
          "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500&h=500&fit=crop",
      },
      {
        id: "prod_30",
        name: "Smart Thermostat",
        category: "Home",
        price: 249,
        description: "WiFi-enabled programmable thermostat",
        imageUrl:
          "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=500&fit=crop",
      },

      // Sports & Fitness
      {
        id: "prod_31",
        name: "Yoga Mat Premium",
        category: "Sports",
        price: 79,
        description: "Non-slip premium yoga mat",
        imageUrl:
          "https://images.unsplash.com/photo-1601925228692-b6f5ee82c1b4?w=500&h=500&fit=crop",
      },
      {
        id: "prod_32",
        name: "Dumbbells Set",
        category: "Sports",
        price: 199,
        description: "Adjustable dumbbells 5-50 lbs",
        imageUrl:
          "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&h=500&fit=crop",
      },
      {
        id: "prod_33",
        name: "Road Bike Helmet",
        category: "Sports",
        price: 89,
        description: "Lightweight cycling helmet with ventilation",
        imageUrl:
          "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=500&h=500&fit=crop",
      },
      {
        id: "prod_34",
        name: "Tennis Racket",
        category: "Sports",
        price: 129,
        description: "Professional tennis racket",
        imageUrl:
          "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=500&h=500&fit=crop",
      },
      {
        id: "prod_35",
        name: "Resistance Bands",
        category: "Sports",
        price: 29,
        description: "Set of 5 resistance bands with handles",
        imageUrl:
          "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500&h=500&fit=crop",
      },
      {
        id: "prod_36",
        name: "Basketball",
        category: "Sports",
        price: 39,
        description: "Official size outdoor basketball",
        imageUrl:
          "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=500&h=500&fit=crop",
      },
      {
        id: "prod_37",
        name: "Fitness Tracker",
        category: "Sports",
        price: 99,
        description: "Waterproof fitness tracker with heart rate monitor",
        imageUrl:
          "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=500&h=500&fit=crop",
      },
      {
        id: "prod_38",
        name: "Protein Shaker Bottle",
        category: "Sports",
        price: 15,
        description: "Leak-proof protein shaker with mixing ball",
        imageUrl:
          "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&h=500&fit=crop",
      },
      {
        id: "prod_39",
        name: "Soccer Ball",
        category: "Sports",
        price: 35,
        description: "FIFA-approved professional soccer ball",
        imageUrl:
          "https://images.unsplash.com/photo-1614632537190-23e4146777db?w=500&h=500&fit=crop",
      },
      {
        id: "prod_40",
        name: "Running Shoes",
        category: "Sports",
        price: 159,
        description: "Lightweight running shoes with cushioning",
        imageUrl:
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop",
      },

      // Beauty & Personal Care
      {
        id: "prod_41",
        name: "Skincare Set",
        category: "Beauty",
        price: 89,
        description: "Complete skincare routine set",
        imageUrl:
          "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&h=500&fit=crop",
      },
      {
        id: "prod_42",
        name: "Hair Dryer Professional",
        category: "Beauty",
        price: 149,
        description: "Ionic hair dryer with multiple settings",
        imageUrl:
          "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=500&h=500&fit=crop",
      },
      {
        id: "prod_43",
        name: "Makeup Brush Set",
        category: "Beauty",
        price: 59,
        description: "Professional makeup brush collection",
        imageUrl:
          "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&h=500&fit=crop",
      },
      {
        id: "prod_44",
        name: "Electric Toothbrush",
        category: "Beauty",
        price: 89,
        description: "Rechargeable electric toothbrush",
        imageUrl:
          "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=500&h=500&fit=crop",
      },
      {
        id: "prod_45",
        name: "Perfume Collection",
        category: "Beauty",
        price: 129,
        description: "Set of 3 designer perfumes",
        imageUrl:
          "https://images.unsplash.com/photo-1541643600914-78b084683601?w=500&h=500&fit=crop",
      },

      // Books & Education
      {
        id: "prod_46",
        name: "Programming Books Set",
        category: "Books",
        price: 99,
        description: "Complete programming language guide books",
        imageUrl:
          "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500&h=500&fit=crop",
      },
      {
        id: "prod_47",
        name: "Kindle E-Reader",
        category: "Books",
        price: 139,
        description: "Waterproof e-reader with backlight",
        imageUrl:
          "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&h=500&fit=crop",
      },
      {
        id: "prod_48",
        name: "Desk Organizer",
        category: "Books",
        price: 45,
        description: "Bamboo desk organizer with compartments",
        imageUrl:
          "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=500&h=500&fit=crop",
      },

      // Automotive
      {
        id: "prod_49",
        name: "Car Phone Mount",
        category: "Automotive",
        price: 25,
        description: "Magnetic car phone holder",
        imageUrl:
          "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=500&h=500&fit=crop",
      },
      {
        id: "prod_50",
        name: "Car Dash Cam",
        category: "Automotive",
        price: 129,
        description: "4K dash camera with night vision",
        imageUrl:
          "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=500&h=500&fit=crop",
      },
    ];

    try {
      await this.redis.set(this.productsKey, sampleProducts);
      console.log(`✅ Initialized ${sampleProducts.length} sample products`);
      return sampleProducts;
    } catch (error) {
      console.error("Error initializing sample products:", error);
      throw new Error("Failed to initialize product database");
    }
  }

  async clearAllData() {
    try {
      await this.redis.del(this.productsKey);

      // Clear all feature data
      const products = await this.getAllProducts();
      for (const product of products) {
        await this.redis.del(`${this.featuresPrefix}${product.id}`);
      }

      console.log("✅ All product data cleared");
    } catch (error) {
      console.error("Error clearing data:", error);
      throw new Error("Failed to clear product data");
    }
  }
}

module.exports = ProductService;
