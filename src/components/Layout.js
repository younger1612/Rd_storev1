import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Layout.css';

const Layout = ({ children, onLogout }) => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="header-container">
          <div className="logo">
            <h1>🏪 RD Store 庫存管理系統</h1>
          </div>
          <nav className="navigation">
            <Link 
              to="/purchase" 
              className={`nav-link ${isActive('/purchase') ? 'active' : ''}`}
            >
              📋 進貨管理
            </Link>
            <Link 
              to="/inventory" 
              className={`nav-link ${isActive('/inventory') ? 'active' : ''}`}
            >
              📦 庫存下單
            </Link>
            <Link 
              to="/orders" 
              className={`nav-link ${isActive('/orders') ? 'active' : ''}`}
            >
              📊 訂單總覽
            </Link>
          </nav>
          <div className="user-actions">
            <button onClick={onLogout} className="logout-btn">
              🚪 登出
            </button>
          </div>
        </div>
      </header>
      <main className="main-content">
        {children}
      </main>
      <footer className="footer">
        <div className="footer-container">
          <p>&copy; 2025 RD Store 庫存管理系統. All rights reserved.</p>
          <div className="footer-info">
            <span>🌐 支援網路存取</span>
            <span>💾 PostgreSQL 資料庫</span>
            <span>📱 手機友善介面</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
