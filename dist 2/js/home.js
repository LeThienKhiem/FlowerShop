// Homepage Featured Products - Fetch and Render from Supabase

async function fetchFeaturedProducts() {
  try {
    // Get the container element
    const container = document.getElementById('featured-products-grid');
    if (!container) {
      console.error('Featured products container not found: #featured-products-grid');
      return;
    }

    // Clear existing content
    container.innerHTML = '<p class="text-center text-gray-500 py-8 font-sans">Loading featured products...</p>';

    // Check if supabase is available
    if (!window.supabase) {
      container.innerHTML = '<p class="text-center text-red-600 py-8 font-sans">Error: Supabase client not initialized. Please check your configuration.</p>';
      console.error('Supabase client not found. Make sure js/supabase-config.js is loaded before js/home.js');
      return;
    }

    // Fetch featured products from Supabase
    const { data: products, error } = await window.supabase
      .from('products')
      .select('*')
      .eq('is_featured', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching featured products:', error);
      container.innerHTML = '<p class="text-center text-gray-500 py-8 font-sans">Error loading products. Please try again later.</p>';
      return;
    }

    if (!products || products.length === 0) {
      container.innerHTML = '<p class="text-center text-gray-500 py-8 font-sans">No featured products found. Please add products via the Admin Dashboard and mark them as featured.</p>';
      return;
    }

    // Clear loading message
    container.innerHTML = '';

    // Render products in masonry grid layout (same as original design)
    products.forEach(product => {
      // Calculate discount percentage
      const discountPercentage = product.price && product.sale_price && product.price > product.sale_price
        ? Math.round(((product.price - product.sale_price) / product.price) * 100)
        : 0;

      // Get first image from images array
      const firstImage = product.images && product.images.length > 0 
        ? product.images[0] 
        : 'https://via.placeholder.com/400';

      // Determine aspect ratio (default to square if not specified)
      // You can add aspect_ratio field to products table later if needed
      const aspectRatio = 'aspect-square'; // Default, can be customized per product

      // Create product card HTML (matching the original masonry grid design)
      const productCard = document.createElement('div');
      productCard.className = 'product-card break-inside-avoid mb-8 bg-white p-2';
      
      productCard.innerHTML = `
        <a href="product-detail.html?id=${product.id}">
          <div class="product-image-wrapper ${aspectRatio} w-full overflow-hidden rounded-lg mb-4">
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

      container.appendChild(productCard);
    });

  } catch (error) {
    console.error('Error in fetchFeaturedProducts:', error);
    const container = document.getElementById('featured-products-grid');
    if (container) {
      container.innerHTML = '<p class="text-center text-gray-500 py-8 font-sans">Error loading products. Please try again later.</p>';
    }
  }
}

// Auto-load when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    fetchFeaturedProducts();
  });
} else {
  fetchFeaturedProducts();
}

