// Product Detail - Load Product Data from Supabase

async function loadProductDetail() {
  // Show loading message and hide product container
  const loadingMessage = document.getElementById('loading-message');
  const productContainer = document.getElementById('product-container');
  
  if (loadingMessage) loadingMessage.style.display = 'block';
  if (productContainer) productContainer.style.display = 'none';

  try {
    // Parse product ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
      console.error('No product ID found in URL');
      if (loadingMessage) loadingMessage.innerHTML = '<p class="text-center text-gray-500 py-16 font-sans">Product not found.</p>';
      return;
    }

    // Fetch product from Supabase
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error) {
      console.error('Error fetching product:', error);
      if (loadingMessage) {
        loadingMessage.innerHTML = '<p class="text-center text-gray-500 py-16 font-sans">Error loading product. Please try again later.</p>';
      }
      return;
    }

    if (!product) {
      if (loadingMessage) {
        loadingMessage.innerHTML = '<p class="text-center text-gray-500 py-16 font-sans">Product not found.</p>';
      }
      return;
    }

    // Update page title
    const titleElement = document.getElementById('productTitle');
    if (titleElement) {
      titleElement.textContent = product.name || 'Product';
    }

    // Update price
    const priceElement = document.getElementById('productPrice');
    if (priceElement) {
      priceElement.textContent = `$${parseFloat(product.sale_price || product.price || 0).toFixed(2)}`;
    }

    // Update description
    const descriptionElement = document.getElementById('productDescription');
    if (descriptionElement) {
      descriptionElement.textContent = product.description || 'No description available.';
    }

    // Update SKU and Categories
    const skuValue = document.getElementById('skuValue');
    const categoryValue = document.getElementById('categoryValue');
    
    if (skuValue) {
      skuValue.textContent = product.sku || 'N/A';
    }
    
    if (categoryValue) {
      categoryValue.textContent = product.category || 'N/A';
    }

    // Handle images
    if (product.images && product.images.length > 0) {
      const mainImage = document.getElementById('mainImage');
      if (mainImage) {
        mainImage.src = product.images[0];
        mainImage.alt = product.name || 'Product';
      }

      // Update thumbnails
      const thumbnailContainer = document.getElementById('thumbnailContainer');
      if (thumbnailContainer) {
        thumbnailContainer.innerHTML = '';

        product.images.forEach((imageUrl, index) => {
          const thumbnailBtn = document.createElement('button');
          thumbnailBtn.className = index === 0 
            ? 'thumbnail-btn active opacity-100 border-2 border-[#6B8E23] rounded-lg overflow-hidden' 
            : 'thumbnail-btn opacity-70 hover:opacity-100 border-2 border-transparent rounded-lg overflow-hidden transition-all';
          thumbnailBtn.setAttribute('data-image', imageUrl);
          
          thumbnailBtn.innerHTML = `
            <img src="${imageUrl}" alt="Thumbnail ${index + 1}" class="w-full h-full object-cover aspect-square">
          `;

          thumbnailBtn.addEventListener('click', () => {
            if (mainImage) {
              mainImage.src = imageUrl;
            }
            
            // Update active state
            document.querySelectorAll('.thumbnail-btn').forEach(btn => {
              btn.classList.remove('active', 'opacity-100', 'border-[#6B8E23]');
              btn.classList.add('opacity-70', 'border-transparent');
            });
            
            thumbnailBtn.classList.add('active', 'opacity-100', 'border-[#6B8E23]');
            thumbnailBtn.classList.remove('opacity-70', 'border-transparent');
          });

          thumbnailContainer.appendChild(thumbnailBtn);
        });
      }
    }

    // Hide loading message and show product container
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (productContainer) productContainer.style.display = 'block';

    // Load related products based on category
    if (product.category) {
      await loadRelatedProducts(product.category, product.id);
    }

  } catch (error) {
    console.error('Error in loadProductDetail:', error);
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
      loadingMessage.innerHTML = '<p class="text-center text-gray-500 py-16 font-sans">Error loading product. Please try again later.</p>';
    }
  }
}

async function loadRelatedProducts(category, excludeId) {
  try {
    const { data: relatedProducts, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', category)
      .neq('id', excludeId)
      .limit(4);

    if (error) {
      console.error('Error fetching related products:', error);
      return;
    }

    if (!relatedProducts || relatedProducts.length === 0) {
      return;
    }

    const relatedSection = document.querySelector('.bg-gray-50 section');
    if (!relatedSection) return;

    // Clear existing related products (keep the heading)
    const gridContainer = relatedSection.querySelector('.grid');
    if (gridContainer) {
      gridContainer.innerHTML = '';

      relatedProducts.forEach(product => {
        const discountPercentage = product.price && product.sale_price
          ? Math.round(((product.price - product.sale_price) / product.price) * 100)
          : 0;

        const firstImage = product.images && product.images.length > 0 
          ? product.images[0] 
          : 'https://via.placeholder.com/400';

        const productCard = document.createElement('div');
        productCard.className = 'product-card bg-white p-2';
        
        productCard.innerHTML = `
          <a href="product-detail.html?id=${product.id}">
            <div class="product-image-wrapper aspect-square w-full overflow-hidden rounded-lg mb-4">
              <img src="${firstImage}" alt="${product.name || 'Product'}" class="w-full h-full object-cover">
            </div>
          </a>
          <div class="text-black">
            <h3 class="text-lg font-medium mb-2 font-sans">
              ${product.name || 'Unnamed Product'}
            </h3>
            <div class="flex items-center gap-2 flex-wrap">
              ${product.price && product.sale_price && product.price > product.sale_price
                ? `
                  <div class="flex items-center gap-2">
                    <del class="text-sm text-gray-500 font-sans">$${parseFloat(product.price).toFixed(2)}</del>
                    <span class="text-lg font-bold text-[#6B8E23] font-sans">$${parseFloat(product.sale_price).toFixed(2)}</span>
                  </div>
                  <span class="inline-block px-2 py-1 bg-red-500 text-white text-xs font-bold rounded font-sans">-${discountPercentage}%</span>
                `
                : `
                  <span class="text-lg font-bold text-[#6B8E23] font-sans">$${parseFloat(product.sale_price || product.price || 0).toFixed(2)}</span>
                `
              }
            </div>
          </div>
        `;

        gridContainer.appendChild(productCard);
      });
    }
  } catch (error) {
    console.error('Error loading related products:', error);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadProductDetail);
} else {
  loadProductDetail();
}

