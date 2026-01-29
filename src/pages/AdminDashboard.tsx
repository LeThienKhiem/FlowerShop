import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

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

const AdminDashboard: React.FC = () => {
  const [isExportingOrders, setIsExportingOrders] = useState(false);
  const [isExportingProducts, setIsExportingProducts] = useState(false);
  const [isExportingCoupons, setIsExportingCoupons] = useState(false);

  const handleExportOrders = async () => {
    try {
      setIsExportingOrders(true);
      const { data, error } = await supabase.from('orders').select('*');

      if (error) {
        throw error;
      }

      downloadCSV(data || [], 'orders_export.csv');
    } catch (err) {
      console.error('Failed to export orders:', err);
      alert(`Failed to export orders: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsExportingOrders(false);
    }
  };

  const handleExportProducts = async () => {
    try {
      setIsExportingProducts(true);
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name, slug)')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const csvData = (data || []).map((item) => ({
        name: item.name,
        price: item.price,
        category: item.categories?.name || 'Uncategorized',
        slug: item.slug,
        is_featured: item.is_featured ? 'Yes' : 'No',
        stock: item.stock_quantity,
        created_at: item.created_at
          ? new Date(item.created_at).toLocaleDateString('vi-VN')
          : '',
      }));

      downloadCSV(csvData, 'danh_sach_san_pham.csv');
    } catch (err) {
      console.error('Failed to export products:', err);
      alert(`Failed to export products: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsExportingProducts(false);
    }
  };

  const handleExportCoupons = async () => {
    try {
      setIsExportingCoupons(true);
      const { data, error } = await supabase.from('coupons').select('*');

      if (error) {
        throw error;
      }

      downloadCSV(data || [], 'coupons_export.csv');
    } catch (err) {
      console.error('Failed to export coupons:', err);
      alert(`Failed to export coupons: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsExportingCoupons(false);
    }
  };

  return (
    <div>
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 
              className="text-4xl md:text-5xl font-serif font-bold text-gray-800 mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Admin Dashboard
            </h1>
            <p className="text-gray-600 font-sans max-w-2xl mx-auto">
              Manage your flower shop categories, products, and featured content from one central location.
            </p>
          </div>

          {/* Data Management */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h2 className="text-2xl font-bold text-gray-800 font-sans">Data Management</h2>
              <p className="text-sm text-gray-500 font-sans">
                Export data for review in Excel or Google Sheets.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleExportOrders}
                disabled={isExportingOrders}
                className={`inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-semibold text-white font-sans transition-colors ${
                  isExportingOrders
                    ? 'bg-emerald-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isExportingOrders ? 'Exporting Orders...' : '📄 Export Orders'}
              </button>
              <button
                type="button"
                onClick={handleExportProducts}
                disabled={isExportingProducts}
                className={`inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-semibold text-white font-sans transition-colors ${
                  isExportingProducts
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isExportingProducts ? 'Exporting Products...' : '📥 Export Excel'}
              </button>
              <button
                type="button"
                onClick={handleExportCoupons}
                disabled={isExportingCoupons}
                className={`inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-semibold text-white font-sans transition-colors ${
                  isExportingCoupons
                    ? 'bg-purple-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {isExportingCoupons ? 'Exporting Coupons...' : '🎟️ Export Coupons'}
              </button>
            </div>
          </div>

          {/* Admin Sections Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Link
              to="/admin/categories"
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:border-pink-300 group"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-3 bg-pink-100 text-pink-600 rounded-lg group-hover:bg-pink-200 transition-colors">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-800 mb-2 font-sans group-hover:text-pink-600 transition-colors">
                    Category Management
                  </h2>
                  <p className="text-gray-600 text-sm font-sans leading-relaxed">
                    Create, edit, and manage categories. Drag and drop to reorder. Toggle "Show on Shop" to control which categories appear on the shop page.
                  </p>
                  <div className="mt-4 flex items-center text-pink-600 font-medium text-sm font-sans">
                    Go to Category Management
                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>

            <Link
              to="/admin/products"
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:border-pink-300 group"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-3 bg-pink-100 text-pink-600 rounded-lg group-hover:bg-pink-200 transition-colors">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-800 mb-2 font-sans group-hover:text-pink-600 transition-colors">
                    Manage Flowers
                  </h2>
                  <p className="text-gray-600 text-sm font-sans leading-relaxed">
                    Add, edit, and delete flowers. Set prices, descriptions, and images. Assign flowers to multiple categories.
                  </p>
                  <div className="mt-4 flex items-center text-pink-600 font-medium text-sm font-sans">
                    Go to Manage Flowers
                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>

            <Link
              to="/admin/dates"
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:border-amber-300 group"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-3 bg-amber-100 text-amber-600 rounded-lg group-hover:bg-amber-200 transition-colors">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-800 mb-2 font-sans group-hover:text-amber-600 transition-colors">
                    Date Management
                  </h2>
                  <p className="text-gray-600 text-sm font-sans leading-relaxed">
                    Manage seasonal dates (with surcharge) and closed dates (no delivery). Control when deliveries are available.
                  </p>
                  <div className="mt-4 flex items-center text-amber-600 font-medium text-sm font-sans">
                    Go to Date Management
                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 font-sans">Quick Actions</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Link
                to="/admin/categories"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-sans"
              >
                <div className="font-semibold text-gray-800 mb-1">Create New Category</div>
                <div className="text-sm text-gray-600">Add a new category to organize your products</div>
              </Link>
              <Link
                to="/admin/products"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-sans"
              >
                <div className="font-semibold text-gray-800 mb-1">Add New Flower</div>
                <div className="text-sm text-gray-600">Create a new flower product with images and pricing</div>
              </Link>
              <Link
                to="/admin/categories"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-sans"
              >
                <div className="font-semibold text-gray-800 mb-1">Set Featured Categories</div>
                <div className="text-sm text-gray-600">Choose which categories appear on the shop page</div>
              </Link>
              <Link
                to="/shop"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-sans"
              >
                <div className="font-semibold text-gray-800 mb-1">View Shop Page</div>
                <div className="text-sm text-gray-600">Preview how your changes look to customers</div>
              </Link>
            </div>
          </div>
        </div>
  );
};

export default AdminDashboard;
