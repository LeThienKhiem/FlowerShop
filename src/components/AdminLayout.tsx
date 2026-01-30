import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import Header from './Header';

const AdminLayout: React.FC = () => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  // Determine active tab based on current path
  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  useEffect(() => {
    if (sessionStorage.getItem('adminAuth') === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    if (password === 'Nicky.12345') {
      sessionStorage.setItem('adminAuth', 'true');
      setIsAuthenticated(true);
      return;
    }
    alert('Wrong password');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {!isAuthenticated ? (
        <main className="px-4 py-16 flex items-center justify-center">
          <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h1 className="text-2xl font-serif font-bold text-gray-800 text-center mb-4">
              Admin Login
            </h1>
            <div className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Admin Password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none font-sans"
              />
              <button
                type="button"
                onClick={handleLogin}
                className="w-full px-4 py-2 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors font-sans"
              >
                Login
              </button>
            </div>
          </div>
        </main>
      ) : (
        <main className="py-10 px-4 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row">
            <div className="w-full">
              {/* Admin Navigation Tabs */}
              <div className="flex flex-wrap justify-center gap-3 mb-8 border-b border-gray-200 pb-4">
                <Link
                  to="/admin"
                  className={`px-6 py-2 rounded-lg font-medium transition-colors font-sans ${
                    isActive('/admin') && location.pathname === '/admin'
                      ? 'bg-pink-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/admin/categories"
                  className={`px-6 py-2 rounded-lg font-medium transition-colors font-sans ${
                    isActive('/admin/categories')
                      ? 'bg-pink-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  Category Management
                </Link>
                <Link
                  to="/admin/products"
                  className={`px-6 py-2 rounded-lg font-medium transition-colors font-sans ${
                    isActive('/admin/products')
                      ? 'bg-pink-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  Manage Flowers
                </Link>
                <Link
                  to="/admin/orders"
                  className={`px-6 py-2 rounded-lg font-medium transition-colors font-sans ${
                    isActive('/admin/orders')
                      ? 'bg-pink-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  Order Management
                </Link>
                <Link
                  to="/admin/promotions"
                  className={`px-6 py-2 rounded-lg font-medium transition-colors font-sans ${
                    isActive('/admin/promotions')
                      ? 'bg-pink-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  Promotions
                </Link>
              </div>

              {/* Page Content (Outlet renders child routes) */}
              <Outlet />
            </div>
          </div>
        </main>
      )}
    </div>
  );
};

export default AdminLayout;
