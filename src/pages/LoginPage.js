import React, { useState } from 'react';
import './LoginPage.css';

const LoginPage = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 預設帳號密碼
  const defaultCredentials = {
    username: 'admin',
    password: 'password'
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 模擬 API 調用
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (
        credentials.username === defaultCredentials.username &&
        credentials.password === defaultCredentials.password
      ) {
        onLogin();
      } else {
        setError('帳號或密碼錯誤，請重試');
      }
    } catch (err) {
      setError('登入過程發生錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setCredentials(defaultCredentials);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="logo">
            <h1>🏪 RD Store</h1>
            <p>庫存管理系統</p>
          </div>
        </div>
        
        <div className="login-card">
          <h2>登入系統</h2>
          
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">帳號</label>
              <input
                type="text"
                id="username"
                name="username"
                value={credentials.username}
                onChange={handleInputChange}
                placeholder="請輸入帳號"
                required
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">密碼</label>
              <input
                type="password"
                id="password"
                name="password"
                value={credentials.password}
                onChange={handleInputChange}
                placeholder="請輸入密碼"
                required
                disabled={loading}
              />
            </div>
            
            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}
            
            <button 
              type="submit" 
              className="login-btn"
              disabled={loading}
            >
              {loading ? '登入中...' : '登入'}
            </button>
          </form>
          
          <div className="demo-section">
            <p className="demo-text">試用帳號：</p>
            <div className="demo-credentials">
              <span>👤 admin</span>
              <span>🔑 password</span>
            </div>
            <button 
              type="button" 
              onClick={handleDemoLogin}
              className="demo-btn"
              disabled={loading}
            >
              快速填入試用帳號
            </button>
          </div>
        </div>
        
        <div className="login-footer">
          <div className="features">
            <div className="feature">
              <span className="feature-icon">📱</span>
              <span>支援手機存取</span>
            </div>
            <div className="feature">
              <span className="feature-icon">💾</span>
              <span>PostgreSQL 資料庫</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🌐</span>
              <span>網路同步</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
