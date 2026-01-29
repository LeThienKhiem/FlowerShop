import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: number | string;
  name: string;
  price: number;
  sale_price?: number | null;
  categories?: Category[];
}

interface ProductCategory {
  product_id: number | string;
  category_id: string;
}

const AdminProductManager: React.FC = () => {
  const location = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

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
        .select('id, name, price, sale_price')
        .order('name', { ascending: true });

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

      // Fetch all categories
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
      (productCategoriesData || []).forEach((pc: ProductCategory) => {
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

  function handleEditCategories(product: Product) {
    setEditingProduct(product);
    setSelectedCategoryIds(product.categories?.map(c => c.id) || []);
  }

  function handleCancelEdit() {
    setEditingProduct(null);
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

  async function handleSaveCategories() {
    if (!editingProduct) return;

    try {
      setIsSaving(true);

      // Get current category IDs for this product
      const currentCategoryIds = editingProduct.categories?.map(c => c.id) || [];
      
      // Find categories to add and remove
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

      // Reload products to reflect changes
      await loadProducts();
      
      setEditingProduct(null);
      setSelectedCategoryIds([]);
      alert('Product categories updated successfully!');
    } catch (error) {
      console.error('Error saving categories:', error);
      alert('Error saving categories: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
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
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="py-10 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Admin Navigation Tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-8 border-b border-gray-200 pb-4">
            <Link
              to="/admin"
              className={`px-6 py-2 rounded-lg font-medium transition-colors font-sans ${
                location.pathname === '/admin'
                  ? 'bg-pink-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/admin/categories"
              className={`px-6 py-2 rounded-lg font-medium transition-colors font-sans ${
                location.pathname === '/admin/categories'
                  ? 'bg-pink-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Category Management
            </Link>
            <Link
              to="/admin/products"
              className={`px-6 py-2 rounded-lg font-medium transition-colors font-sans ${
                location.pathname === '/admin/products'
                  ? 'bg-pink-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Product Categories
            </Link>
          </div>

          <h1 
            className="text-4xl md:text-5xl font-serif font-bold text-gray-800 text-center mb-8"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Product Category Manager
          </h1>

          {/* Products Table */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="text-center py-16">
                <p className="text-gray-500 font-sans">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 font-sans">No products found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-sans">
                        Product Name
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
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 font-sans">
                            {product.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-sans">
                            ${product.sale_price && product.sale_price < product.price 
                              ? product.sale_price.toFixed(2) 
                              : product.price.toFixed(2)}
                            {product.sale_price && product.sale_price < product.price && (
                              <span className="ml-2 text-xs text-gray-500 line-through">
                                ${product.price.toFixed(2)}
                              </span>
                            )}
                          </div>
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
                          <button
                            onClick={() => handleEditCategories(product)}
                            className="text-pink-600 hover:text-pink-900 font-sans"
                          >
                            Edit Categories
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Edit Categories Modal */}
          {editingProduct && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg w-full max-w-[95vw] lg:max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4 font-sans">
                    Edit Categories for: {editingProduct.name}
                  </h2>

                  <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-4 font-sans">
                      Select the categories this product belongs to:
                    </p>
                    
                    <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
                      {categories.length === 0 ? (
                        <p className="text-gray-500 text-sm font-sans">No categories available. Create categories first.</p>
                      ) : (
                        categories.map((category) => (
                          <label
                            key={category.id}
                            className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
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

                  <div className="flex justify-end gap-4">
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors font-sans disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveCategories}
                      disabled={isSaving}
                      className="px-4 py-2 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors font-sans disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminProductManager;
