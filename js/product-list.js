// Product List - Fetch and Render Products from Supabase

async function fetchAndRenderProducts(containerSelector, limit = null) {
  try {
    // Get the container element
    const container = document.querySelector(containerSelector);
    if (!container) {
      console.error(`Container not found: ${containerSelector}`);
      return;
    }

    // Clear existing content
    container.innerHTML = '';

    // Fetch products from Supabase
    let query = supabase.from('products').select('*');
    
    // Apply limit if specified
    if (limit) {
      query = query.limit(limit);
    }

    const { data: products, error } = await query;

    if (error) {
      console.error('Error fetching products:', error);
      container.innerHTML = '<p class="text-center text-gray-500">Error loading products. Please try again later.</p>';
      return;
    }

    if (!products || products.length === 0) {
      container.innerHTML = '<p class="text-center text-gray-500">No products found.</p>';
      return;
    }

    // Render products
    products.forEach(product => {
      // Calculate discount percentage
      const discountPercentage = product.price && product.sale_price
        ? Math.round(((product.price - product.sale_price) / product.price) * 100)
        : 0;

      // Get first image from images array
      const firstImage = product.images && product.images.length > 0 
        ? product.images[0] 
        : 'https://via.placeholder.com/400';

      // Create product card HTML
      const productCard = document.createElement('div');
      productCard.className = 'product-card break-inside-avoid mb-4 bg-white p-2';
      
      productCard.innerHTML = `
        <a href="product-detail.html?id=${product.id}">
          <div class="product-image-wrapper w-full overflow-hidden rounded-lg mb-4">
            <img src="${firstImage}" alt="${product.name || 'Product'}" class="w-full h-auto object-cover">
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
    console.error('Error in fetchAndRenderProducts:', error);
    const container = document.querySelector(containerSelector);
    if (container) {
      container.innerHTML = '<p class="text-center text-gray-500">Error loading products. Please try again later.</p>';
    }
  }
}

// When this script is used on shop.html, run after DOM is ready (avoids inline script calling before this file loads)
if (typeof document !== 'undefined' && document.querySelector('#productsGrid')) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      fetchAndRenderProducts('#productsGrid');
    });
  } else {
    fetchAndRenderProducts('#productsGrid');
  }
}
