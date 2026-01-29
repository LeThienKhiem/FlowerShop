import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit, Trash2, X } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: number | string;
  name: string;
  price: number;
  sale_price?: number | null;
  description?: string | null;
  images?: string[] | null;
  in_stock?: boolean;
  has_extras?: boolean;
  categories?: Category[];
}

const downloadCSV = (data: Array<Record<string, any>>, filename: string) => {
  if (!data || data.length === 0) {
    alert('No data available to export.');
    return;
  }

  const headers = Object.keys(data[0]);

  const formatValue = (value: any) => {
    if (value === null || value === undefined) {
      return '';
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) {
        return new Date(parsed).toISOString();
      }
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  };

  const escapeValue = (value: any) => {
    const formatted = formatValue(value);
    const escaped = formatted.replace(/"/g, '""');
    return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
  };

  const csvRows = [
    headers.join(','),
    ...data.map((row) => headers.map((header) => escapeValue(row[header])).join(',')),
  ];

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingProducts, setIsExportingProducts] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    sale_price: '',
    description: '',
    image_url: '',
    in_stock: true,
    hasExtras: true,
  });
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  // Fetch products with categories
  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching categories:', error);
        alert('Error loading categories: ' + error.message);
      } else if (data) {
        setCategories(data as Category[]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  async function loadProducts() {
    try {
      setIsLoading(true);
      
      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, price, sale_price, description, images, in_stock, has_extras')
        .order('created_at', { ascending: false });

      if (productsError) {
        throw productsError;
      }

      // Fetch product-category relationships
      const { data: productCategoriesData, error: pcError } = await supabase
        .from('product_categories')
        .select('product_id, category_id');

      if (pcError) {
        throw pcError;
      }

      // Fetch all categories (in case categories state is not loaded yet)
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name');

      if (categoriesError) {
        throw categoriesError;
      }

      // Map categories by ID for quick lookup
      const categoriesMap = new Map<string, Category>();
      (categoriesData || []).forEach((cat: Category) => {
        categoriesMap.set(cat.id, cat);
      });

      // Map product categories
      const productCategoriesMap = new Map<number | string, string[]>();
      (productCategoriesData || []).forEach((pc: any) => {
        const productId = pc.product_id;
        if (!productCategoriesMap.has(productId)) {
          productCategoriesMap.set(productId, []);
        }
        productCategoriesMap.get(productId)!.push(pc.category_id);
      });

      // Combine products with their categories
      const productsWithCategories: Product[] = (productsData || []).map((product: Product) => {
        const categoryIds = productCategoriesMap.get(product.id) || [];
        return {
          ...product,
          categories: categoryIds.map(id => categoriesMap.get(id)!).filter(Boolean),
        };
      });

      setProducts(productsWithCategories);
    } catch (error) {
      console.error('Error loading products:', error);
      alert('Error loading products: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  const handleExportProducts = async () => {
    try {
      setIsExportingProducts(true);
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name)')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const csvData = (data || []).map((item: any) => {
        let categoryStr = 'Uncategorized';

        if (Array.isArray(item.categories)) {
          const names = item.categories.map((category: any) => category?.name).filter(Boolean);
          if (names.length > 0) {
            categoryStr = names.join(', ');
          }
        } else if (item.categories && typeof item.categories === 'object') {
          categoryStr = item.categories.name || 'Uncategorized';
        }

        return {
          name: item.name,
          price: item.price,
          category: categoryStr,
          slug: item.slug,
          is_featured: item.is_featured ? 'Yes' : 'No',
          stock: item.stock_quantity,
          created_at: item.created_at
            ? new Date(item.created_at).toLocaleDateString('vi-VN')
            : '',
        };
      });

      downloadCSV(csvData, 'danh_sach_san_pham.csv');
    } catch (err) {
      console.error('Failed to export products:', err);
      alert(`Failed to export products: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsExportingProducts(false);
    }
  };

  function handleAddProduct() {
    setEditingProduct(null);
    setFormData({
      name: '',
      price: '',
      sale_price: '',
      description: '',
      image_url: '',
      in_stock: true,
      hasExtras: true,
    });
    setSelectedCategoryIds([]);
    setIsModalOpen(true);
  }

  function handleEditProduct(product: Product) {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      sale_price: product.sale_price?.toString() || '',
      description: product.description || '',
      image_url: product.images && product.images.length > 0 ? product.images[0] : '',
      in_stock: product.in_stock ?? true,
      hasExtras: product.has_extras ?? true,
    });
    setSelectedCategoryIds(product.categories?.map(c => c.id) || []);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      price: '',
      sale_price: '',
      description: '',
      image_url: '',
      in_stock: true,
      hasExtras: true,
    });
    setSelectedCategoryIds([]);
  }

  function handleCategoryToggle(categoryId: string) {
    setSelectedCategoryIds(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.price) {
      alert('Please fill in required fields (Name and Price)');
      return;
    }

    try {
      setIsSaving(true);

      const price = parseFloat(formData.price);
      const salePrice = formData.sale_price ? parseFloat(formData.sale_price) : null;
      const images = formData.image_url ? [formData.image_url] : [];

      if (editingProduct) {
        // Update existing product
        const { error: updateError } = await supabase
          .from('products')
          .update({
            name: formData.name.trim(),
            price: price,
            sale_price: salePrice,
            description: formData.description.trim() || null,
            images: images.length > 0 ? images : null,
            in_stock: formData.in_stock,
            has_extras: formData.hasExtras,
          })
          .eq('id', editingProduct.id);

        if (updateError) {
          throw updateError;
        }

        // Handle category relationships
        const currentCategoryIds = editingProduct.categories?.map(c => c.id) || [];
        const categoriesToAdd = selectedCategoryIds.filter(id => !currentCategoryIds.includes(id));
        const categoriesToRemove = currentCategoryIds.filter(id => !selectedCategoryIds.includes(id));

        // Remove old relationships
        if (categoriesToRemove.length > 0) {
          const { error: deleteError } = await supabase
            .from('product_categories')
            .delete()
            .eq('product_id', editingProduct.id)
            .in('category_id', categoriesToRemove);

          if (deleteError) {
            throw deleteError;
          }
        }

        // Add new relationships
        if (categoriesToAdd.length > 0) {
          const newLinks = categoriesToAdd.map(categoryId => ({
            product_id: editingProduct.id,
            category_id: categoryId,
          }));

          const { error: insertError } = await supabase
            .from('product_categories')
            .insert(newLinks);

          if (insertError) {
            throw insertError;
          }
        }
      } else {
        // Create new product
        const { data: newProduct, error: insertError } = await supabase
          .from('products')
          .insert({
            name: formData.name.trim(),
            price: price,
            sale_price: salePrice,
            description: formData.description.trim() || null,
            images: images.length > 0 ? images : null,
            in_stock: formData.in_stock,
            has_extras: formData.hasExtras,
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        // Add category relationships
        if (selectedCategoryIds.length > 0 && newProduct) {
          const newLinks = selectedCategoryIds.map(categoryId => ({
            product_id: newProduct.id,
            category_id: categoryId,
          }));

          const { error: linkError } = await supabase
            .from('product_categories')
            .insert(newLinks);

          if (linkError) {
            throw linkError;
          }
        }
      }

      await loadProducts();
      handleCloseModal();
      alert(editingProduct ? 'Product updated successfully!' : 'Product created successfully!');
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error saving product: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteProduct(productId: number | string, productName: string) {
    if (!confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // First, delete product-category relationships
      const { error: pcError } = await supabase
        .from('product_categories')
        .delete()
        .eq('product_id', productId);

      if (pcError) {
        throw pcError;
      }

      // Then delete the product
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) {
        throw error;
      }

      await loadProducts();
      alert('Product deleted successfully!');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product: ' + (error as Error).message);
    }
  }

  // Color palette for category badges
  const categoryColors = [
    'bg-pink-100 text-pink-800 border-pink-200',
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-green-100 text-green-800 border-green-200',
    'bg-purple-100 text-purple-800 border-purple-200',
    'bg-yellow-100 text-yellow-800 border-yellow-200',
    'bg-indigo-100 text-indigo-800 border-indigo-200',
    'bg-red-100 text-red-800 border-red-200',
    'bg-teal-100 text-teal-800 border-teal-200',
  ];

  function getCategoryBadgeColor(index: number): string {
    return categoryColors[index % categoryColors.length];
  }

  return (
    <>
    <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
            <h1 
              className="text-4xl md:text-5xl font-serif font-bold text-gray-800"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Manage Flowers
            </h1>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleExportProducts}
                disabled={isExportingProducts}
                className={`flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-medium transition-colors font-sans ${
                  isExportingProducts
                    ? 'bg-blue-200 text-blue-700 cursor-not-allowed'
                    : 'bg-white text-blue-700 border border-blue-300 hover:bg-blue-50'
                }`}
              >
                {isExportingProducts ? 'Exporting...' : '📥 Export CSV'}
              </button>
              <button
                onClick={handleAddProduct}
                className="flex items-center gap-2 px-6 py-3 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors font-sans"
              >
                <Plus className="w-5 h-5" />
                Add Flower
              </button>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="text-center py-16">
                <p className="text-gray-500 font-sans">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 font-sans">No products found. Click "Add Flower" to create your first product.</p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-sans">
                        Image
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-sans">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-sans">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-sans">
                        Categories
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider font-sans">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => {
                      const imageUrl = product.images && product.images.length > 0 
                        ? product.images[0] 
                        : 'https://via.placeholder.com/100x100?text=No+Image';
                      const displayPrice = product.sale_price && product.sale_price < product.price 
                        ? product.sale_price 
                        : product.price;
                      
                      return (
                        <tr key={product.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <img
                              src={imageUrl}
                              alt={product.name}
                              className="w-16 h-16 object-cover rounded-lg"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100x100?text=No+Image';
                              }}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900 font-sans">
                              {product.name}
                            </div>
                            {product.description && (
                              <div className="text-xs text-gray-500 font-sans mt-1 line-clamp-2">
                                {product.description}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-sans">
                              ${displayPrice.toFixed(2)}
                              {product.sale_price && product.sale_price < product.price && (
                                <span className="ml-2 text-xs text-gray-500 line-through">
                                  ${product.price.toFixed(2)}
                                </span>
                              )}
                            </div>
                            {!product.in_stock && (
                              <span className="text-xs text-red-600 font-sans">Out of Stock</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2">
                              {product.categories && product.categories.length > 0 ? (
                                product.categories.map((category, index) => (
                                  <span
                                    key={category.id}
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getCategoryBadgeColor(index)}`}
                                  >
                                    {category.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400 font-sans italic">No categories</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleEditProduct(product)}
                                className="text-blue-600 hover:text-blue-900 font-sans flex items-center gap-1"
                              >
                                <Edit className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id, product.name)}
                                className="text-red-600 hover:text-red-900 font-sans flex items-center gap-1"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
    </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-[95vw] lg:max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 font-sans">
                  {editingProduct ? 'Edit Flower' : 'Add New Flower'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-sans">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none font-sans"
                    required
                  />
                </div>

                {/* Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 font-sans">
                      Price <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none font-sans"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 font-sans">
                      Sale Price (Optional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.sale_price}
                      onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none font-sans"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-sans">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none font-sans"
                  />
                </div>

                {/* Image URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-sans">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none font-sans"
                    placeholder="https://example.com/image.jpg"
                  />
                  {formData.image_url && (
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="mt-2 w-32 h-32 object-cover rounded-lg border border-gray-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                </div>

                {/* In Stock */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.in_stock}
                      onChange={(e) => setFormData({ ...formData, in_stock: e.target.checked })}
                      className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                    />
                    <span className="text-sm text-gray-700 font-sans">In Stock</span>
                  </label>
                </div>

                {/* Enable Add-on Options */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasExtras}
                      onChange={(e) => setFormData({ ...formData, hasExtras: e.target.checked })}
                      className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                    />
                    <span className="text-sm text-gray-700 font-sans">Enable Add-on Options (Bear, Wine, etc.)</span>
                  </label>
                </div>

                {/* Categories */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-sans">
                    Categories (Select multiple)
                  </label>
                  <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
                    {categories.length === 0 ? (
                      <p className="text-gray-500 text-sm font-sans">No categories available. Create categories first.</p>
                    ) : (
                      categories.map((category) => (
                        <label
                          key={category.id}
                          className="flex items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCategoryIds.includes(category.id)}
                            onChange={() => handleCategoryToggle(category.id)}
                            className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                          />
                          <span className="ml-3 text-sm text-gray-900 font-sans">
                            {category.name}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={isSaving}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors font-sans disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors font-sans disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : editingProduct ? 'Update Flower' : 'Create Flower'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminProducts;
