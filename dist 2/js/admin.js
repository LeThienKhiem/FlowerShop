// Admin Dashboard JavaScript

// Ensure supabase is accessible (from supabase-config.js)
// Wait for supabase-config.js to initialize
// Note: supabase-config.js already creates window.supabase and var supabase
// We just need to access it, not redeclare it
function getSupabase() {
  // First check if window.supabase exists (from supabase-config.js)
  if (window.supabase) {
    return window.supabase;
  }
  // Fallback: check if global supabase variable exists
  if (typeof supabase !== 'undefined') {
    return supabase;
  }
  console.error('Supabase client not found. Make sure js/supabase-config.js is loaded before js/admin.js');
  return null;
}

// Check login status on page load
function checkLogin() {
  const isLoggedIn = sessionStorage.getItem('isLoggedIn');
  const loginOverlay = document.getElementById('login-overlay');
  
  if (isLoggedIn === 'true') {
    // User is logged in - hide overlay
    if (loginOverlay) {
      loginOverlay.style.display = 'none';
    }
    // Load dashboard data
    if (typeof loadProducts === 'function') {
      loadProducts();
    }
  } else {
    // User is not logged in - show overlay
    if (loginOverlay) {
      loginOverlay.style.display = 'flex';
    }
  }
}

// Login button event listener
function setupLogin() {
  const loginBtn = document.getElementById('login-btn');
  const passwordInput = document.getElementById('password-input');
  const loginError = document.getElementById('login-error');
  
  if (!loginBtn || !passwordInput) {
    console.error('Login elements not found');
    return;
  }
  
  loginBtn.addEventListener('click', () => {
    const password = passwordInput.value;
    
    if (password === 'admin123') {
      // Correct password
      sessionStorage.setItem('isLoggedIn', 'true');
      if (loginError) loginError.style.display = 'none';
      
      // Hide overlay and load dashboard
      const loginOverlay = document.getElementById('login-overlay');
      if (loginOverlay) {
        loginOverlay.style.display = 'none';
      }
      
      // Load products
      if (typeof loadProducts === 'function') {
        loadProducts();
      }
    } else {
      // Wrong password
      if (loginError) {
        loginError.style.display = 'block';
      }
    }
  });
  
  // Allow Enter key to login
  passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      loginBtn.click();
    }
  });
}

// Logout handler
function setupLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  
  if (!logoutBtn) {
    console.error('Logout button not found');
    return;
  }
  
  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('isLoggedIn');
    location.reload();
  });
}

// Tab switching
function setupTabs() {
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      
      // Update tab buttons
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Update tab content
      document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
      });

      if (tabName === 'add') {
        const tabAdd = document.getElementById('tabAdd');
        if (tabAdd) {
          tabAdd.style.display = 'block';
          tabAdd.classList.add('active');
        }
      } else if (tabName === 'manage') {
        const tabManage = document.getElementById('tabManage');
        if (tabManage) {
          // Force display block to override any CSS
          tabManage.style.display = 'block';
          tabManage.style.visibility = 'visible';
          tabManage.classList.add('active');
          
          // Hide add tab
          const tabAdd = document.getElementById('tabAdd');
          if (tabAdd) {
            tabAdd.style.display = 'none';
            tabAdd.classList.remove('active');
          }
          
          // Load products when switching to manage tab
          console.log('Switching to Manage tab, loading products...');
          setTimeout(() => {
            loadProducts();
          }, 100);
        } else {
          console.error('tabManage element not found');
        }
      }
    });
  });
}

// Add Product Form Handler
function setupAddProductForm() {
  const addProductForm = document.getElementById('addProductForm');
  if (!addProductForm) {
    console.error('Add product form not found');
    return;
  }
  
  addProductForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const statusDiv = document.getElementById('addStatus');
  statusDiv.textContent = 'Saving...';
  statusDiv.className = 'mt-2 text-blue-600 font-sans';

  try {
    // Parse tags (comma separated)
    const tagsInput = document.getElementById('addTags').value.trim();
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    // Parse images (newline separated)
    const imagesInput = document.getElementById('addImages').value.trim();
    const images = imagesInput ? imagesInput.split('\n').map(img => img.trim()).filter(img => img) : [];

    if (images.length === 0) {
      throw new Error('At least one image URL is required');
    }

    const productData = {
      name: document.getElementById('addName').value.trim(),
      price: parseFloat(document.getElementById('addPrice').value),
      sale_price: document.getElementById('addSalePrice').value ? parseFloat(document.getElementById('addSalePrice').value) : null,
      category: document.getElementById('addCategory').value,
      description: document.getElementById('addDescription').value.trim() || '',
      tags: tags,
      images: images,
      in_stock: document.getElementById('addInStock').checked,
      is_featured: document.getElementById('addIsFeatured').checked
    };

    const supabaseClient = getSupabase();
    if (!supabaseClient) {
      throw new Error('Supabase client not initialized');
    }
    
    const { data, error } = await supabaseClient
      .from('products')
      .insert([productData])
      .select();

    if (error) {
      throw error;
    }

    statusDiv.textContent = 'Product saved successfully!';
    statusDiv.className = 'mt-2 text-green-600 font-sans';

    // Reset form
    document.getElementById('addProductForm').reset();
    document.getElementById('addInStock').checked = true;
    document.getElementById('addIsFeatured').checked = false;

    // Switch to Manage tab and refresh
    document.querySelector('[data-tab="manage"]').click();

  } catch (error) {
    console.error('Error adding product:', error);
    statusDiv.textContent = `Error: ${error.message}`;
    statusDiv.className = 'mt-2 text-red-600 font-sans';
  }
  });
}

// Load Products for Manage tab
async function loadProducts() {
  const container = document.getElementById('productsTableContainer');
  
  if (!container) {
    console.error('Products table container not found');
    return;
  }
  
  container.innerHTML = '<p class="text-gray-500 font-sans">Loading products...</p>';

  try {
    console.log('=== loadProducts() called ===');
    
    // Get supabase client
    const supabaseClient = getSupabase();
    console.log('Supabase client:', supabaseClient);
    
    if (!supabaseClient) {
      const errorMsg = 'Error: Supabase client not initialized. Please check your Supabase configuration in js/supabase-config.js';
      container.innerHTML = `<p class="text-red-600 font-sans">${errorMsg}</p>`;
      console.error('Supabase client not found. Make sure js/supabase-config.js is loaded before js/admin.js');
      console.error('window.supabase:', window.supabase);
      return;
    }

    console.log('Querying products from Supabase...');
    const { data: products, error } = await supabaseClient
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('Supabase response:', { data: products, error });

    if (error) {
      console.error('Supabase error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      // Provide more helpful error messages
      let errorMessage = error.message || 'Unknown error';
      if (error.code === 'PGRST301' || error.message?.includes('permission denied')) {
        errorMessage = 'Permission denied. Please check Row-Level Security (RLS) policies in Supabase. Run the SQL migration to set up proper policies.';
      } else if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        errorMessage = 'Products table not found. Please ensure the table exists in your Supabase database.';
      }
      
      container.innerHTML = `<p class="text-red-600 font-sans">Error loading products: ${errorMessage}</p>`;
      throw error;
    }

    console.log('Products fetched:', products?.length || 0, 'items');

    if (!products || products.length === 0) {
      container.innerHTML = '<p class="text-gray-500 font-sans">No products found. Add your first product using the "Add New Flower" tab.</p>';
      return;
    }

    // Create table
    let tableHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Thumbnail</th>
            <th>Name</th>
            <th>Category</th>
            <th>Price</th>
            <th>Featured</th>
            <th>Stock</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
    `;

    products.forEach(product => {
      const thumbnail = product.images && product.images.length > 0 
        ? product.images[0] 
        : 'https://via.placeholder.com/60';
      
      const priceDisplay = product.sale_price && product.sale_price < product.price
        ? `<del class="text-gray-500 text-sm">$${product.price.toFixed(2)}</del> <span class="text-[#6B8E23] font-bold">$${product.sale_price.toFixed(2)}</span>`
        : `$${product.price.toFixed(2)}`;

      const stockStatus = product.in_stock 
        ? '<span class="text-green-600">In Stock</span>'
        : '<span class="text-red-600">Out of Stock</span>';

      const featuredStatus = product.is_featured 
        ? '<span class="text-yellow-500 text-xl" title="Featured on Homepage">⭐</span>'
        : '<span class="text-gray-400">—</span>';

      tableHTML += `
        <tr>
          <td><img src="${thumbnail}" alt="${product.name}" class="thumbnail-img"></td>
          <td class="font-medium">${product.name || 'Unnamed'}</td>
          <td>${product.category || 'N/A'}</td>
          <td>${priceDisplay}</td>
          <td class="text-center">${featuredStatus}</td>
          <td>${stockStatus}</td>
          <td>
            <button data-action="edit" data-product-id="${product.id}" class="admin-btn admin-btn-primary mr-2 font-sans" style="padding: 6px 12px; font-size: 14px;">Edit</button>
            <button data-action="delete" data-product-id="${product.id}" class="admin-btn admin-btn-danger font-sans" style="padding: 6px 12px; font-size: 14px;">Delete</button>
          </td>
        </tr>
      `;
    });

    tableHTML += `
        </tbody>
      </table>
    `;

    container.innerHTML = tableHTML;
    console.log('Table HTML rendered successfully');

    // Attach event listeners to Edit and Delete buttons using event delegation
    // Use event delegation on the container to handle dynamically created buttons
    // Remove any existing listeners first to prevent duplicates
    const newClickHandler = (e) => {
      const button = e.target.closest('button[data-action]');
      if (!button) return;

      const action = button.getAttribute('data-action');
      // Get product ID as string (Supabase uses UUIDs, not integers)
      const productId = button.getAttribute('data-product-id');

      console.log('Button clicked:', action, 'Product ID:', productId);

      if (action === 'edit') {
        editProduct(productId);
      } else if (action === 'delete') {
        deleteProduct(productId);
      }
    };

    // Remove old listener if it exists, then add new one
    container.removeEventListener('click', container._clickHandler);
    container._clickHandler = newClickHandler;
    container.addEventListener('click', newClickHandler);

    console.log('Event listeners attached successfully');

  } catch (error) {
    console.error('Error loading products:', error);
    container.innerHTML = `<p class="text-red-600 font-sans">Error loading products: ${error.message}</p>`;
  }
}

// Delete Product
async function deleteProduct(productId) {
  if (!confirm('Are you sure you want to delete this product?')) {
    return;
  }

  try {
    const supabaseClient = getSupabase();
    if (!supabaseClient) {
      throw new Error('Supabase client not initialized');
    }
    
    // Ensure productId is a string (UUIDs are strings, not numbers)
    const productIdString = String(productId);
    console.log('Deleting product with ID (as string):', productIdString);
    
    const { error } = await supabaseClient
      .from('products')
      .delete()
      .eq('id', productIdString);

    if (error) {
      throw error;
    }

    loadProducts();
  } catch (error) {
    console.error('Error deleting product:', error);
    alert(`Error deleting product: ${error.message}`);
  }
}

// Edit Product - Open Modal
async function editProduct(productId) {
  console.log('editProduct called with ID:', productId, 'Type:', typeof productId);
  
  const modal = document.getElementById('editModal');
  const statusDiv = document.getElementById('editStatus');
  statusDiv.textContent = '';
  statusDiv.className = 'mt-2 font-sans';

  try {
    const supabaseClient = getSupabase();
    if (!supabaseClient) {
      throw new Error('Supabase client not initialized');
    }
    
    // Ensure productId is a string (UUIDs are strings, not numbers)
    const productIdString = String(productId);
    console.log('Querying product with ID (as string):', productIdString);
    
    const { data: product, error } = await supabaseClient
      .from('products')
      .select('*')
      .eq('id', productIdString)
      .single();

    if (error) {
      throw error;
    }

    // Fill form with product data
    document.getElementById('editId').value = product.id;
    document.getElementById('editName').value = product.name || '';
    document.getElementById('editPrice').value = product.price || '';
    document.getElementById('editSalePrice').value = product.sale_price || '';
    document.getElementById('editCategory').value = product.category || '';
    document.getElementById('editDescription').value = product.description || '';
    document.getElementById('editTags').value = product.tags ? product.tags.join(', ') : '';
    document.getElementById('editImages').value = product.images ? product.images.join('\n') : '';
    document.getElementById('editInStock').checked = product.in_stock !== false;
    document.getElementById('editIsFeatured').checked = product.is_featured || false;

    modal.classList.add('active');

  } catch (error) {
    console.error('Error loading product:', error);
    alert(`Error loading product: ${error.message}`);
  }
}

// Close Modal
document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('editModal').classList.remove('active');
});

document.getElementById('cancelEdit').addEventListener('click', () => {
  document.getElementById('editModal').classList.remove('active');
});

// Click outside modal to close
document.getElementById('editModal').addEventListener('click', (e) => {
  if (e.target.id === 'editModal') {
    document.getElementById('editModal').classList.remove('active');
  }
});

// Update Product Form Handler
function setupEditProductForm() {
  const editProductForm = document.getElementById('editProductForm');
  if (!editProductForm) {
    console.error('Edit product form not found');
    return;
  }
  
  editProductForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const statusDiv = document.getElementById('editStatus');
  statusDiv.textContent = 'Updating...';
  statusDiv.className = 'mt-2 text-blue-600 font-sans';

  try {
    const productId = document.getElementById('editId').value;

    // Parse tags (comma separated)
    const tagsInput = document.getElementById('editTags').value.trim();
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    // Parse images (newline separated)
    const imagesInput = document.getElementById('editImages').value.trim();
    const images = imagesInput ? imagesInput.split('\n').map(img => img.trim()).filter(img => img) : [];

    if (images.length === 0) {
      throw new Error('At least one image URL is required');
    }

    const productData = {
      name: document.getElementById('editName').value.trim(),
      price: parseFloat(document.getElementById('editPrice').value),
      sale_price: document.getElementById('editSalePrice').value ? parseFloat(document.getElementById('editSalePrice').value) : null,
      category: document.getElementById('editCategory').value,
      description: document.getElementById('editDescription').value.trim() || '',
      tags: tags,
      images: images,
      in_stock: document.getElementById('editInStock').checked,
      is_featured: document.getElementById('editIsFeatured').checked
      // Note: updated_at is automatically handled by the database trigger
      // Do not include it in the update data
    };

    const supabaseClient = getSupabase();
    if (!supabaseClient) {
      throw new Error('Supabase client not initialized');
    }
    
    // Ensure productId is a string (UUIDs are strings, not numbers)
    const productIdString = String(productId);
    console.log('Updating product with ID (as string):', productIdString);
    console.log('Update data:', productData);
    
    const { data, error } = await supabaseClient
      .from('products')
      .update(productData)
      .eq('id', productIdString)
      .select();

    if (error) {
      console.error('Supabase update error:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      // Provide more helpful error message for updated_at issues
      if (error.message && error.message.includes('updated_at')) {
        throw new Error('Database trigger error. Please run the SQL fix script (fix-updated-at.sql) in Supabase SQL Editor to fix the updated_at column and trigger.');
      }
      throw error;
    }

    statusDiv.textContent = 'Product updated successfully!';
    statusDiv.className = 'mt-2 text-green-600 font-sans';

    // Close modal and refresh list
    setTimeout(() => {
      document.getElementById('editModal').classList.remove('active');
      loadProducts();
    }, 1000);

  } catch (error) {
    console.error('Error updating product:', error);
    statusDiv.textContent = `Error: ${error.message}`;
    statusDiv.className = 'mt-2 text-red-600 font-sans';
  }
  });
}

// Initialize on page load - LOGIN TEMPORARILY DISABLED FOR DEVELOPMENT
function initializeAdmin() {
  console.log('=== Initializing Admin Dashboard ===');
  
  // checkLogin(); // DISABLED
  // setupLogin(); // DISABLED
  // setupLogout(); // DISABLED
  
  // Check Supabase initialization
  console.log('Checking Supabase initialization...');
  console.log('window.supabase:', window.supabase);
  const supabaseClient = getSupabase();
  console.log('getSupabase() returned:', supabaseClient);
  
  // Setup tabs
  console.log('Setting up tabs...');
  setupTabs();
  
  // Setup form handlers
  console.log('Setting up form handlers...');
  setupAddProductForm();
  setupEditProductForm();
  
  // Ensure first tab is visible
  const tabAdd = document.getElementById('tabAdd');
  if (tabAdd) {
    tabAdd.style.display = 'block';
    tabAdd.classList.add('active');
    console.log('Add tab is visible');
  } else {
    console.error('tabAdd element not found!');
  }
  
  // Hide manage tab initially
  const tabManage = document.getElementById('tabManage');
  if (tabManage) {
    tabManage.style.display = 'none';
    console.log('Manage tab is hidden initially');
  } else {
    console.error('tabManage element not found!');
  }
  
  // Directly load dashboard (for manage tab)
  // loadProducts will be called when user clicks Manage Flowers tab
  console.log('=== Admin Dashboard Initialized ===');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAdmin);
} else {
  initializeAdmin();
}

