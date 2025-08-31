class VisualProductMatcher {
  constructor() {
    this.currentResults = [];
    this.isSearching = false;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupTabSwitching();
    this.setupSmoothScrolling();
    this.showWelcomeMessage();
  }

  setupEventListeners() {
    // File upload
    const fileInput = document.getElementById("file-input");
    const uploadArea = document.getElementById("upload-area");

    uploadArea.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", this.handleFileUpload.bind(this));

    // Drag and drop
    uploadArea.addEventListener("dragover", this.handleDragOver.bind(this));
    uploadArea.addEventListener("dragleave", this.handleDragLeave.bind(this));
    uploadArea.addEventListener("drop", this.handleFileDrop.bind(this));

    // URL input
    const urlInput = document.getElementById("url-input");
    const urlSubmitBtn = document.getElementById("url-submit");

    urlSubmitBtn.addEventListener("click", this.handleUrlUpload.bind(this));
    urlInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.handleUrlUpload();
      }
    });

    // Search and clear buttons
    document
      .getElementById("search-btn")
      .addEventListener("click", this.performSearch.bind(this));
    document
      .getElementById("clear-btn")
      .addEventListener("click", this.clearImage.bind(this));

    // Results filtering and sorting
    document
      .getElementById("similarity-filter")
      .addEventListener("input", this.updateSimilarityFilter.bind(this));
    document
      .getElementById("sort-select")
      .addEventListener("change", this.sortResults.bind(this));

    // Category browsing
    document.querySelectorAll(".category-card").forEach((card) => {
      card.addEventListener("click", () => {
        const category = card.dataset.category;
        this.browseCategory(category);
      });
    });

    // Modal handling
    document
      .getElementById("modal-close")
      .addEventListener("click", this.closeModal.bind(this));
    document
      .getElementById("modal-close-btn")
      .addEventListener("click", this.closeModal.bind(this));
    document.getElementById("modal-overlay").addEventListener("click", (e) => {
      if (e.target === document.getElementById("modal-overlay")) {
        this.closeModal();
      }
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeModal();
      }
    });
  }

  setupTabSwitching() {
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab-content");

    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const tabId = button.dataset.tab;

        tabButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");

        tabContents.forEach((content) => content.classList.remove("active"));
        document.getElementById(`${tabId}-tab`).classList.add("active");
      });
    });
  }

  setupSmoothScrolling() {
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        const href = link.getAttribute("href");
        if (href.startsWith("#")) {
          e.preventDefault();
          const target = document.querySelector(href);
          if (target) {
            target.scrollIntoView({ behavior: "smooth" });

            document
              .querySelectorAll(".nav-link")
              .forEach((l) => l.classList.remove("active"));
            link.classList.add("active");
          }
        }
      });
    });
  }

  showWelcomeMessage() {
    this.showToast(
      "Welcome to Visual Product Matcher! Upload an image to get started.",
      "success"
    );
  }

  handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
      this.processImageFile(file);
    }
  }

  handleDragOver(event) {
    event.preventDefault();
    document.getElementById("upload-area").classList.add("dragover");
  }

  handleDragLeave(event) {
    event.preventDefault();
    document.getElementById("upload-area").classList.remove("dragover");
  }

  handleFileDrop(event) {
    event.preventDefault();
    document.getElementById("upload-area").classList.remove("dragover");

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      this.processImageFile(files[0]);
    }
  }

  processImageFile(file) {
    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      this.showToast("Please upload a JPEG, PNG, or WebP image.", "error");
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      this.showToast("File size must be less than 5MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.displayImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  async handleUrlUpload() {
    const urlInput = document.getElementById("url-input");
    const imageUrl = urlInput.value.trim();

    if (!imageUrl) {
      this.showToast("Please enter an image URL.", "warning");
      return;
    }

    // Basic URL validation
    try {
      new URL(imageUrl);
    } catch {
      this.showToast("Please enter a valid URL.", "error");
      return;
    }

    // Check if URL points to an image
    const imageExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    const hasImageExtension = imageExtensions.some((ext) =>
      imageUrl.toLowerCase().includes(ext)
    );

    if (!hasImageExtension) {
      this.showToast(
        "URL should point to an image file (JPEG, PNG, WebP).",
        "warning"
      );
    }

    this.displayImagePreview(imageUrl);
  }

  displayImagePreview(imageSrc) {
    const previewImage = document.getElementById("preview-image");
    const imagePreview = document.getElementById("image-preview");

    previewImage.src = imageSrc;
    imagePreview.style.display = "block";

    // Smooth scroll to preview
    imagePreview.scrollIntoView({ behavior: "smooth", block: "center" });

    this.showToast(
      'Image loaded successfully! Click "Find Similar Products" to search.',
      "success"
    );
  }

  clearImage() {
    document.getElementById("image-preview").style.display = "none";
    document.getElementById("file-input").value = "";
    document.getElementById("url-input").value = "";
    document.getElementById("results-section").style.display = "none";
    this.currentResults = [];

    this.showToast("Image cleared.", "success");
  }

  // Generate mock data for demo purposes
  generateMockResults() {
    return [
      {
        id: "prod_1",
        name: "iPhone 15 Pro",
        category: "Electronics",
        price: 999,
        description: "Latest Apple smartphone with titanium design",
        imageUrl:
          "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500&h=500&fit=crop",
        matchPercentage: 95,
        similarity: 0.95,
      },
      {
        id: "prod_2",
        name: "Samsung Galaxy S24",
        category: "Electronics",
        price: 899,
        description: "Android flagship with AI features",
        imageUrl:
          "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&h=500&fit=crop",
        matchPercentage: 87,
        similarity: 0.87,
      },
      {
        id: "prod_3",
        name: "Google Pixel 8",
        category: "Electronics",
        price: 699,
        description: "AI-powered camera phone",
        imageUrl:
          "https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=500&h=500&fit=crop",
        matchPercentage: 82,
        similarity: 0.82,
      },
      {
        id: "prod_4",
        name: "OnePlus 12",
        category: "Electronics",
        price: 799,
        description: "Flagship Android phone with fast charging",
        imageUrl:
          "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=500&h=500&fit=crop",
        matchPercentage: 78,
        similarity: 0.78,
      },
      {
        id: "prod_5",
        name: "Sony Xperia 1 V",
        category: "Electronics",
        price: 1099,
        description: "Professional camera phone",
        imageUrl:
          "https://images.unsplash.com/photo-1567581935884-3349723552ca?w=500&h=500&fit=crop",
        matchPercentage: 75,
        similarity: 0.75,
      },
    ];
  }

  getCategoryMockData(category) {
    const categoryData = {
      electronics: [
        {
          id: "elec_1",
          name: "MacBook Pro M3",
          category: "Electronics",
          price: 1999,
          description: "Professional laptop with M3 chip",
          imageUrl:
            "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500&h=500&fit=crop",
          matchPercentage: 100,
          similarity: 1.0,
        },
        {
          id: "elec_2",
          name: "AirPods Pro 2",
          category: "Electronics",
          price: 249,
          description: "Wireless earbuds with spatial audio",
          imageUrl:
            "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=500&h=500&fit=crop",
          matchPercentage: 100,
          similarity: 1.0,
        },
      ],
      fashion: [
        {
          id: "fash_1",
          name: "Nike Air Max 90",
          category: "Fashion",
          price: 120,
          description: "Classic running shoes",
          imageUrl:
            "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop",
          matchPercentage: 100,
          similarity: 1.0,
        },
        {
          id: "fash_2",
          name: "Denim Jacket",
          category: "Fashion",
          price: 89,
          description: "Classic blue denim jacket",
          imageUrl:
            "https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=500&h=500&fit=crop",
          matchPercentage: 100,
          similarity: 1.0,
        },
      ],
      home: [
        {
          id: "home_1",
          name: "Modern Sofa",
          category: "Home",
          price: 899,
          description: "Comfortable 3-seat sofa",
          imageUrl:
            "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&h=500&fit=crop",
          matchPercentage: 100,
          similarity: 1.0,
        },
      ],
      sports: [
        {
          id: "sport_1",
          name: "Yoga Mat",
          category: "Sports",
          price: 49,
          description: "Non-slip yoga mat",
          imageUrl:
            "https://images.unsplash.com/photo-1601925228692-b6f5ee82c1b4?w=500&h=500&fit=crop",
          matchPercentage: 100,
          similarity: 1.0,
        },
      ],
      beauty: [
        {
          id: "beauty_1",
          name: "Skincare Set",
          category: "Beauty",
          price: 79,
          description: "Complete skincare routine",
          imageUrl:
            "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&h=500&fit=crop",
          matchPercentage: 100,
          similarity: 1.0,
        },
      ],
      books: [
        {
          id: "book_1",
          name: "Programming Guide",
          category: "Books",
          price: 39,
          description: "Complete programming handbook",
          imageUrl:
            "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500&h=500&fit=crop",
          matchPercentage: 100,
          similarity: 1.0,
        },
      ],
    };

    return categoryData[category] || [];
  }

  async performSearch() {
    if (this.isSearching) {
      return;
    }

    const previewImage = document.getElementById("preview-image");
    if (!previewImage.src) {
      this.showToast("Please upload an image first.", "warning");
      return;
    }

    this.isSearching = true;
    this.showSearchLoading(true);

    try {
      let searchData;
      const imageSrc = previewImage.src;

      // Try to use real API first, fallback to mock data
      try {
        if (imageSrc.startsWith("data:")) {
          // File upload
          const response = await fetch(imageSrc);
          const blob = await response.blob();

          const formData = new FormData();
          formData.append("image", blob);

          const searchResponse = await fetch("/api/search/upload", {
            method: "POST",
            body: formData,
          });

          if (!searchResponse.ok) {
            throw new Error(`API returned ${searchResponse.status}`);
          }

          searchData = await searchResponse.json();
        } else {
          // URL upload
          const searchResponse = await fetch("/api/search/url", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ imageUrl: imageSrc }),
          });

          if (!searchResponse.ok) {
            throw new Error(`API returned ${searchResponse.status}`);
          }

          searchData = await searchResponse.json();
        }

        if (searchData.success) {
          this.currentResults = searchData.data;
          this.displayResults(searchData.data);
          this.showToast(
            `Found ${searchData.count} similar products!`,
            "success"
          );
        } else {
          throw new Error(searchData.error || "Search failed");
        }
      } catch (apiError) {
        console.warn("API not available, using demo mode:", apiError.message);

        // Fallback to mock data for demo
        await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate loading

        const mockResults = this.generateMockResults();
        this.currentResults = mockResults;
        this.displayResults(mockResults);
        this.showToast(
          `Demo Mode: Found ${mockResults.length} similar products!`,
          "success"
        );
      }
    } catch (error) {
      console.error("Search error:", error);
      this.showToast("Search failed: " + error.message, "error");
      this.displayNoResults();
    } finally {
      this.isSearching = false;
      this.showSearchLoading(false);
    }
  }

  showSearchLoading(show) {
    const searchBtn = document.getElementById("search-btn");
    const btnText = searchBtn.querySelector(".btn-text");
    const btnLoader = searchBtn.querySelector(".btn-loader");
    const loadingState = document.getElementById("loading-state");
    const resultsSection = document.getElementById("results-section");

    if (show) {
      searchBtn.disabled = true;
      btnText.style.visibility = "hidden";
      btnLoader.style.display = "block";

      resultsSection.style.display = "block";
      loadingState.style.display = "block";

      // Animate progress bar
      const progressBar = document.getElementById("progress-bar");
      progressBar.style.width = "0%";
      setTimeout(() => (progressBar.style.width = "100%"), 100);

      // Smooth scroll to results
      resultsSection.scrollIntoView({ behavior: "smooth" });
    } else {
      searchBtn.disabled = false;
      btnText.style.visibility = "visible";
      btnLoader.style.display = "none";
      loadingState.style.display = "none";
    }
  }

  displayResults(results) {
    const resultsGrid = document.getElementById("results-grid");
    const resultsSection = document.getElementById("results-section");
    const noResults = document.getElementById("no-results");

    resultsSection.style.display = "block";
    noResults.style.display = "none";

    if (results.length === 0) {
      this.displayNoResults();
      return;
    }

    resultsGrid.innerHTML = "";

    results.forEach((product, index) => {
      const productCard = this.createProductCard(product, index);
      resultsGrid.appendChild(productCard);
    });

    document.querySelector(
      ".results-title"
    ).textContent = `${results.length} Similar Products Found`;
  }

  createProductCard(product, index) {
    const card = document.createElement("div");
    card.className = "product-card";
    card.style.animationDelay = `${index * 0.1}s`;

    card.innerHTML = `
            <img src="${product.imageUrl}" alt="${product.name}" class="product-image" 
                 onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22280%22 height=%22200%22><rect width=%22100%%22 height=%22100%%22 fill=%22%23ddd%22/><text x=%2250%%22 y=%2250%%22 fill=%22%23999%22 text-anchor=%22middle%22 dy=%22.3em%22>No Image</text></svg>'">
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-category">${product.category}</p>
                <p class="product-price">$${product.price}</p>
                <span class="similarity-badge">${product.matchPercentage}% Match</span>
            </div>
        `;

    card.addEventListener("click", () => this.openProductModal(product));

    return card;
  }

  displayNoResults() {
    const resultsSection = document.getElementById("results-section");
    const resultsGrid = document.getElementById("results-grid");
    const noResults = document.getElementById("no-results");

    resultsSection.style.display = "block";
    resultsGrid.innerHTML = "";
    noResults.style.display = "block";
  }

  // Modal functionality
  openProductModal(product) {
    const modal = document.getElementById("modal-overlay");

    document.getElementById("modal-title").textContent = product.name;
    document.getElementById("modal-image").src = product.imageUrl;
    document.getElementById("modal-price").textContent = `$${product.price}`;
    document.getElementById(
      "modal-category"
    ).textContent = `Category: ${product.category}`;
    document.getElementById(
      "modal-similarity"
    ).textContent = `Similarity: ${product.matchPercentage}%`;
    document.getElementById("modal-description").textContent =
      product.description || "No description available.";

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  closeModal() {
    document.getElementById("modal-overlay").style.display = "none";
    document.body.style.overflow = "auto";
  }

  // Filtering and sorting
  updateSimilarityFilter() {
    const slider = document.getElementById("similarity-filter");
    const valueDisplay = document.getElementById("similarity-value");
    const threshold = parseInt(slider.value);

    valueDisplay.textContent = `${threshold}%`;
    this.filterResults();
  }

  filterResults() {
    const threshold = parseInt(
      document.getElementById("similarity-filter").value
    );
    const filteredResults = this.currentResults.filter(
      (product) => product.matchPercentage >= threshold
    );

    this.displayResults(filteredResults);
  }

  sortResults() {
    const sortBy = document.getElementById("sort-select").value;
    const threshold = parseInt(
      document.getElementById("similarity-filter").value
    );

    let filteredResults = this.currentResults.filter(
      (product) => product.matchPercentage >= threshold
    );

    switch (sortBy) {
      case "similarity":
        filteredResults.sort((a, b) => b.similarity - a.similarity);
        break;
      case "price-low":
        filteredResults.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        filteredResults.sort((a, b) => b.price - a.price);
        break;
      case "name":
        filteredResults.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    this.displayResults(filteredResults);
  }

  async browseCategory(category) {
    this.showToast(`Loading ${category} products...`, "success");

    try {
      // Try real API first
      try {
        const response = await fetch(`/api/products/category/${category}`);

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          const products = data.data.map((product) => ({
            ...product,
            matchPercentage: 100,
            similarity: 1.0,
          }));

          this.currentResults = products;
          this.displayResults(products);
        } else {
          throw new Error(data.error);
        }
      } catch (apiError) {
        console.warn("API not available, using demo data:", apiError.message);

        // Fallback to mock data
        const mockProducts = this.getCategoryMockData(category);
        this.currentResults = mockProducts;
        this.displayResults(mockProducts);

        this.showToast(`Demo Mode: Showing ${category} products`, "success");
      }

      // Scroll to results
      document.getElementById("results-section").scrollIntoView({
        behavior: "smooth",
      });
    } catch (error) {
      console.error("Browse category error:", error);
      this.showToast("Failed to load category: " + error.message, "error");
    }
  }

  // Toast notifications
  showToast(message, type = "success") {
    const toastContainer = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 4000);
  }

  // Utility methods
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  window.productMatcher = new VisualProductMatcher();
});

// Service Worker Registration
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered: ", registration);
      })
      .catch((registrationError) => {
        console.log("SW registration failed: ", registrationError);
      });
  });
}
