import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import FloralShop from './components/FloralShop';
import FloatingCallBtn from './components/FloatingCallBtn';
import PromotionPopup from './components/PromotionPopup';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load heavy pages - only load when needed
const Home = lazy(() => import('./pages/Home'));
const Shop = lazy(() => import('./pages/Shop'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const SuccessPage = lazy(() => import('./pages/SuccessPage'));
const AdminLayout = lazy(() => import('./components/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminCategory = lazy(() => import('./pages/AdminCategory'));
const AdminProducts = lazy(() => import('./pages/AdminProducts'));
const AdminOrders = lazy(() => import('./pages/AdminOrders'));
const AdminDateManagement = lazy(() => import('./pages/AdminDateManagement'));
const PromotionSettings = lazy(() => import('./pages/admin/PromotionSettings'));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<FloralShop />} />
        <Route path="/home" element={<Suspense fallback={<PageLoader />}><Home /></Suspense>} />
        <Route path="/shop" element={<Suspense fallback={<PageLoader />}><Shop /></Suspense>} />
        <Route path="/about" element={<Suspense fallback={<PageLoader />}><About /></Suspense>} />
        <Route path="/contact" element={<Suspense fallback={<PageLoader />}><Contact /></Suspense>} />
        <Route path="/product/:id" element={<Suspense fallback={<PageLoader />}><ProductDetail /></Suspense>} />
        <Route path="/category/:slug" element={<Suspense fallback={<PageLoader />}><CategoryPage /></Suspense>} />
        <Route path="/cart" element={<Suspense fallback={<PageLoader />}><CartPage /></Suspense>} />
        <Route path="/checkout" element={<Suspense fallback={<PageLoader />}><CheckoutPage /></Suspense>} />
        <Route path="/success" element={<Suspense fallback={<PageLoader />}><SuccessPage /></Suspense>} />
        
        {/* Admin Routes with Shared Layout */}
        <Route path="/admin" element={<Suspense fallback={<PageLoader />}><AdminLayout /></Suspense>}>
          <Route index element={<Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>} />
          <Route path="categories" element={<Suspense fallback={<PageLoader />}><AdminCategory /></Suspense>} />
          <Route path="products" element={<Suspense fallback={<PageLoader />}><AdminProducts /></Suspense>} />
          <Route path="orders" element={<Suspense fallback={<PageLoader />}><AdminOrders /></Suspense>} />
          <Route path="dates" element={<Suspense fallback={<PageLoader />}><AdminDateManagement /></Suspense>} />
          <Route path="promotions" element={<Suspense fallback={<PageLoader />}><PromotionSettings /></Suspense>} />
        </Route>
      </Routes>
      <FloatingCallBtn />
      <PromotionPopup />
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App

