import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';

// Storefront Components & Pages
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import BottomBar from './components/BottomBar';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Likes from './pages/Likes';
import Feed from './pages/Feed';
import Support from './pages/Support';
import Profile from './pages/Profile';
import { About, Contact, Terms, Privacy } from './pages/StaticPages';

// Admin Backoffice Subpages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOrders from './pages/admin/AdminOrders';
import AdminUsers from './pages/admin/AdminUsers';
import AdminProducts from './pages/admin/AdminProducts';
import AdminStreaming from './pages/admin/AdminStreaming';
import AdminCoupons from './pages/admin/AdminCoupons';
import AdminFinance from './pages/admin/AdminFinance';
import AdminBranding from './pages/admin/AdminBranding';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AppProvider>
      <Router>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          {/* Top Header */}
          <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

          {/* Hamburger Sidebar Drawer */}
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          {/* Main App Content Area */}
          <main className="app-content" style={{ flex: 1 }}>
            <Routes>
              {/* Storefront Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/likes" element={<Likes />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/support" element={<Support />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />

              {/* Admin Backoffice Subpages */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="streaming" element={<AdminStreaming />} />
                <Route path="coupons" element={<AdminCoupons />} />
                <Route path="finance" element={<AdminFinance />} />
                <Route path="branding" element={<AdminBranding />} />
              </Route>
            </Routes>
          </main>

          {/* Footer Component with Legal and Support links */}
          <Footer />

          {/* Mobile Bottom Navigation Bar (Instagram-style) */}
          <BottomBar />
        </div>
      </Router>
    </AppProvider>
  );
}
