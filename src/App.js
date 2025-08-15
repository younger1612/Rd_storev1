
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import PurchasePage from './pages/PurchasePage';
import InventoryOrderPage from './pages/InventoryOrderPage';
import OrderSummaryPage from './pages/OrderSummaryPage';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';
import './desktop-optimized.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem('isAuthenticated') === 'true'
  );

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('isAuthenticated', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/login" 
            element={
              isAuthenticated ? 
              <Navigate to="/purchase" replace /> : 
              <LoginPage onLogin={handleLogin} />
            } 
          />
          <Route 
            path="/purchase" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout onLogout={handleLogout}>
                  <PurchasePage />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/inventory" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout onLogout={handleLogout}>
                  <InventoryOrderPage />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/orders" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout onLogout={handleLogout}>
                  <OrderSummaryPage />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/" 
            element={
              <Navigate to={isAuthenticated ? "/purchase" : "/login"} replace />
            } 
          />
          <Route 
            path="*" 
            element={
              <Navigate to={isAuthenticated ? "/purchase" : "/login"} replace />
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
