import React, { useState, useEffect } from 'react';
import './OrderSummaryPage.css';

// API 服務配置
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://192.168.0.2:3001/api';

const orderAPI = {
  // 獲取所有訂單
  getAll: async () => {
    try {
      console.log('獲取所有訂單，API_BASE_URL:', API_BASE_URL);
      const response = await fetch(`${API_BASE_URL}/orders`);
      
      console.log('訂單 API 響應狀態:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('訂單 API 響應內容:', result);
      
      const orders = result.data || result;
      console.log('解析到的訂單數據:', orders);
      
      return orders;
    } catch (error) {
      console.error('獲取訂單失敗:', error);
      throw error;
    }
  },

  // 更新訂單
  update: async (orderId, updateData) => {
    try {
      console.log('更新訂單 API 請求:', { orderId, updateData });
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('更新訂單 API 錯誤響應:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('更新訂單 API 響應:', result);
      return result;
    } catch (error) {
      console.error('更新訂單失敗:', error);
      throw error;
    }
  },

  // 刪除訂單
  delete: async (orderId) => {
    try {
      console.log('刪除訂單 API 請求:', orderId);
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('刪除訂單 API 錯誤響應:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('刪除訂單 API 響應:', result);
      return result;
    } catch (error) {
      console.error('刪除訂單失敗:', error);
      throw error;
    }
  }
};

const OrderSummaryPage = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  // 狀態選項
  const statusOptions = ['全部狀態', '待處理', '已收訂金', '生產中', '已完成', '已發貨'];

  // 載入訂單資料
  const loadOrders = async () => {
    try {
      setLoading(true);
      
      // 先嘗試從API獲取
      const apiOrders = await orderAPI.getAll();
      
      // 格式化API數據
      const formattedOrders = apiOrders.map(order => ({
        id: order.id,
        customer: order.customer_name || '未提供',
        customerPhone: order.customer_phone,
        customerEmail: order.customer_email,
        customerLink: order.customer_link || '',
        amount: parseFloat(order.total_amount) || 0,
        cost: parseFloat(order.cost) || Math.round(parseFloat(order.total_amount) * 0.8), // 默認80%成本
        status: order.status || '待處理',
        date: order.order_date ? new Date(order.order_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        notes: order.notes || '',
        databaseId: order.id
      }));

      setOrders(formattedOrders);
      
      // 同時從localStorage獲取訂單（備用）
      const localOrders = JSON.parse(localStorage.getItem('summaryOrders') || '[]');
      
      // 合併訂單，避免重複
      const allOrders = [...formattedOrders];
      localOrders.forEach(localOrder => {
        if (!allOrders.find(order => order.databaseId === localOrder.databaseId)) {
          allOrders.push(localOrder);
        }
      });
      
      localStorage.setItem('summaryOrders', JSON.stringify(formattedOrders));
      setOrders(allOrders);
      
    } catch (error) {
      console.error('無法從API載入訂單，使用localStorage:', error);
      // API失敗時使用localStorage
      const localOrders = JSON.parse(localStorage.getItem('summaryOrders') || '[]');
      setOrders(localOrders);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // 篩選和排序邏輯
  useEffect(() => {
    let filtered = orders.filter(order => {
      // 狀態篩選
      let matchesStatus = true;
      if (selectedStatus !== 'all' && selectedStatus !== '全部狀態') {
        matchesStatus = order.status === selectedStatus;
      }

      // 日期篩選
      let matchesDate = true;
      if (selectedYear || selectedMonth) {
        const orderDate = new Date(order.date);
        const orderYear = orderDate.getFullYear().toString();
        const orderMonth = (orderDate.getMonth() + 1).toString().padStart(2, '0');
        
        if (selectedYear && orderYear !== selectedYear) {
          matchesDate = false;
        }
        if (selectedMonth && orderMonth !== selectedMonth) {
          matchesDate = false;
        }
      }

      return matchesStatus && matchesDate;
    });

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.date) - new Date(a.date);
        case 'date-asc':
          return new Date(a.date) - new Date(b.date);
        case 'amount-desc':
          return b.amount - a.amount;
        case 'amount-asc':
          return a.amount - b.amount;
        case 'customer-asc':
          return a.customer.localeCompare(b.customer);
        case 'customer-desc':
          return b.customer.localeCompare(a.customer);
        default:
          return 0;
      }
    });

    setFilteredOrders(filtered);
  }, [orders, selectedYear, selectedMonth, selectedStatus, sortBy]);

  // 計算統計數據
  const statistics = {
    totalOrders: filteredOrders.length,
    totalRevenue: filteredOrders.reduce((sum, order) => sum + order.amount, 0),
    totalCost: filteredOrders.reduce((sum, order) => sum + order.cost, 0)
  };

  // 刪除訂單
  const deleteOrder = async (orderId) => {
    if (!window.confirm('確定要刪除這筆訂單嗎？此操作無法復原。')) {
      return;
    }

    try {
      setLoading(true);
      
      // 找到要刪除的訂單
      const orderToDelete = orders.find(order => order.id === orderId);
      
      // 如果訂單有資料庫ID，從資料庫刪除
      if (orderToDelete && orderToDelete.databaseId) {
        await orderAPI.delete(orderToDelete.databaseId);
      }
      
      // 從本地狀態和localStorage刪除
      const updatedOrders = orders.filter(order => order.id !== orderId);
      setOrders(updatedOrders);
      localStorage.setItem('summaryOrders', JSON.stringify(updatedOrders));
      
      alert('訂單已成功刪除');
      
    } catch (error) {
      console.error('刪除訂單失敗:', error);
      alert('刪除訂單失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  // 開始編輯
  const startEdit = (orderId, field, currentValue) => {
    setEditingField({ orderId, field });
    setEditingValue(currentValue.toString());
  };

  // 確認編輯
  const confirmEdit = async () => {
    if (!editingField) return;

    const { orderId, field } = editingField;
    
    try {
      setLoading(true);
      
      let updateData = {};
      let newValue = editingValue;
      
      // 處理不同類型的欄位
      switch (field) {
        case 'amount':
        case 'cost':
          newValue = parseFloat(editingValue) || 0;
          updateData = { 
            [field === 'amount' ? 'total_amount' : 'cost']: newValue 
          };
          break;
        case 'notes':
          updateData = { notes: editingValue };
          break;
        case 'customer':
          updateData = { customer_name: editingValue };
          break;
        case 'customerPhone':
          updateData = { customer_phone: editingValue };
          break;
        case 'customerEmail':
          newValue = editingValue;
          updateData = { customer_email: editingValue };
          break;
        case 'customerLink':
          updateData = { customer_link: editingValue };
          break;
        default:
          updateData = { [field]: editingValue };
      }

      // 找到要更新的訂單
      const orderToUpdate = orders.find(order => order.id === orderId);
      
      // 如果訂單有資料庫ID，更新資料庫
      if (orderToUpdate && orderToUpdate.databaseId) {
        await orderAPI.update(orderToUpdate.databaseId, updateData);
      }
      
      // 更新本地狀態
      const updatedOrders = orders.map(order => 
        order.id === orderId 
          ? { 
              ...order, 
              [field === 'customer' ? 'customer' : field]: newValue,
              // 特殊處理客戶連結
              ...(field === 'customerLink' ? { customerLink: editingValue } : {})
            }
          : order
      );
      
      setOrders(updatedOrders);
      localStorage.setItem('summaryOrders', JSON.stringify(updatedOrders));
      
      setEditingField(null);
      setEditingValue('');
      
    } catch (error) {
      console.error('更新訂單失敗:', error);
      alert('更新訂單失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  // 取消編輯
  const cancelEdit = () => {
    setEditingField(null);
    setEditingValue('');
  };

  // 更新訂單狀態
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setLoading(true);
      
      // 找到要更新的訂單
      const orderToUpdate = orders.find(order => order.id === orderId);
      
      // 如果訂單有資料庫ID，更新資料庫
      if (orderToUpdate && orderToUpdate.databaseId) {
        await orderAPI.update(orderToUpdate.databaseId, { status: newStatus });
      }
      
      // 更新本地狀態
      const updatedOrders = orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      );
      
      setOrders(updatedOrders);
      localStorage.setItem('summaryOrders', JSON.stringify(updatedOrders));
      
    } catch (error) {
      console.error('更新訂單狀態失敗:', error);
      alert('更新訂單狀態失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  // 清空所有訂單
  const clearAllOrders = () => {
    if (window.confirm('確定要清空所有訂單嗎？此操作無法復原。')) {
      setOrders([]);
      localStorage.removeItem('summaryOrders');
    }
  };

  // 獲取狀態樣式類
  const getStatusClass = (status) => {
    switch (status) {
      case '待處理': return 'status-pending';
      case '已收訂金': return 'status-deposited';
      case '生產中': return 'status-production';
      case '已完成': return 'status-completed';
      case '已發貨': return 'status-shipped';
      default: return 'status-pending';
    }
  };

  // 獲取年份列表
  const getYearOptions = () => {
    const years = [...new Set(orders.map(order => new Date(order.date).getFullYear()))];
    return years.sort((a, b) => b - a);
  };

  return (
    <div className="order-summary-page">
      {/* 頁面標題 */}
      <div className="page-header">
        <h1>📊 訂單摘要</h1>
        <p>查看和管理所有訂單資訊</p>
      </div>

      {/* 統計卡片 */}
      <div className="statistics-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <h3>總訂單數</h3>
            <div className="stat-value">{statistics.totalOrders}</div>
          </div>
        </div>
        <div className="stat-card revenue">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>總營業額</h3>
            <div className="stat-value">NT$ {statistics.totalRevenue.toLocaleString()}</div>
          </div>
        </div>
        <div className="stat-card profit">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h3>總利潤</h3>
            <div className="stat-value">NT$ {(statistics.totalRevenue - statistics.totalCost).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* 篩選區域 */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <label>📅 年份：</label>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="">全部年份</option>
              {getYearOptions().map(year => (
                <option key={year} value={year}>{year}年</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>🗓️ 月份：</label>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="">全部月份</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month.toString().padStart(2, '0')}>
                  {month}月
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>🏷️ 狀態：</label>
            <select 
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              {statusOptions.map(status => (
                <option key={status} value={status === '全部狀態' ? 'all' : status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>🔄 排序：</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date-desc">日期 (新→舊)</option>
              <option value="date-asc">日期 (舊→新)</option>
              <option value="amount-desc">金額 (高→低)</option>
              <option value="amount-asc">金額 (低→高)</option>
              <option value="customer-asc">客戶 (A→Z)</option>
              <option value="customer-desc">客戶 (Z→A)</option>
            </select>
          </div>

          <div className="action-buttons">
            <button onClick={clearAllOrders} className="clear-all-btn">
              🗑️ 清空所有
            </button>
          </div>
        </div>
      </div>

      {/* 訂單列表 - 表格形式 */}
      <div className="orders-section">
        {filteredOrders.length === 0 ? (
          <div className="no-orders">
            <div className="no-orders-icon">📋</div>
            <h3>沒有找到訂單</h3>
            <p>
              {orders.length === 0 
                ? '目前還沒有任何訂單記錄。從庫存下單頁面建立訂單後，會自動顯示在這裡。'
                : '沒有符合篩選條件的訂單。請調整篩選設定。'
              }
            </p>
          </div>
        ) : (
          <div className="orders-table-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th className="col-order-id">訂單編號</th>
                  <th className="col-date">日期</th>
                  <th className="col-customer">客戶資訊</th>
                  <th className="col-amount">金額</th>
                  <th className="col-cost">成本</th>
                  <th className="col-profit">利潤</th>
                  <th className="col-status">狀態</th>
                  <th className="col-progress">進度</th>
                  <th className="col-actions">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => {
                  const progressStages = ['待處理', '已收訂金', '生產中', '已完成', '已發貨'];
                  const currentStageIndex = progressStages.indexOf(order.status);
                  const progressPercentage = currentStageIndex >= 0 ? ((currentStageIndex + 1) / progressStages.length) * 100 : 20;
                  const profit = order.amount - order.cost;
                  
                  return (
                    <tr key={order.id} className="order-row">
                      {/* 訂單編號 */}
                      <td className="col-order-id">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="order-id-btn-table"
                          title="查看詳細資訊"
                        >
                          📋 {order.id}
                        </button>
                      </td>

                      {/* 日期 */}
                      <td className="col-date">
                        <span className="order-date-table">📅 {order.date}</span>
                      </td>

                      {/* 客戶資訊 */}
                      <td className="col-customer">
                        <div className="customer-info-table">
                          {/* 客戶名稱 */}
                          {editingField?.orderId === order.id && editingField?.field === 'customer' ? (
                            <div className="editing-inline">
                              <input
                                type="text"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className="edit-input-table"
                                placeholder="客戶名稱"
                                autoFocus
                              />
                              <div className="edit-actions-inline">
                                <button onClick={confirmEdit} className="confirm-btn-table">✓</button>
                                <button onClick={cancelEdit} className="cancel-btn-table">✗</button>
                              </div>
                            </div>
                          ) : (
                            <div className="customer-name-table">
                              <span 
                                onClick={() => startEdit(order.id, 'customer', order.customer)}
                                className="editable-text"
                                title="點擊編輯客戶名稱"
                              >
                                👤 {order.customerLink ? (
                                  <a 
                                    href={order.customerLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="customer-link"
                                    style={{ color: '#007bff', textDecoration: 'none' }}
                                  >
                                    {order.customer}
                                  </a>
                                ) : (
                                  order.customer
                                )}
                              </span>
                            </div>
                          )}
                          
                          {/* 聯絡資訊 */}
                          <div className="contact-links-table">
                            {order.customerPhone && (
                              <a href={`tel:${order.customerPhone}`} className="contact-link-table" title="撥打電話">
                                📞
                              </a>
                            )}
                            {order.customerEmail && (
                              <a href={`mailto:${order.customerEmail}`} className="contact-link-table" title="發送郵件">
                                📧
                              </a>
                            )}
                            {order.customerLink && (
                              <a 
                                href={order.customerLink} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="contact-link-table"
                                title="查看客戶資料"
                              >
                                🔗
                              </a>
                            )}
                          </div>
                          
                          {/* 編輯客戶連結按鈕 */}
                          <button
                            onClick={() => startEdit(order.id, 'customerLink', order.customerLink || '')}
                            className="add-link-btn-table"
                            title={order.customerLink ? '編輯客戶連結' : '添加客戶連結'}
                          >
                            📝
                          </button>
                        </div>
                      </td>

                      {/* 金額 */}
                      <td className="col-amount">
                        {editingField?.orderId === order.id && editingField?.field === 'amount' ? (
                          <div className="editing-inline">
                            <input
                              type="number"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              className="edit-input-table"
                              placeholder="金額"
                              min="0"
                              autoFocus
                            />
                            <div className="edit-actions-inline">
                              <button onClick={confirmEdit} className="confirm-btn-table">✓</button>
                              <button onClick={cancelEdit} className="cancel-btn-table">✗</button>
                            </div>
                          </div>
                        ) : (
                          <span 
                            onClick={() => startEdit(order.id, 'amount', order.amount)}
                            className="amount-value-table editable-text"
                            title="點擊編輯金額"
                          >
                            💰 NT$ {order.amount.toLocaleString()}
                          </span>
                        )}
                      </td>

                      {/* 成本 */}
                      <td className="col-cost">
                        {editingField?.orderId === order.id && editingField?.field === 'cost' ? (
                          <div className="editing-inline">
                            <input
                              type="number"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              className="edit-input-table"
                              placeholder="成本"
                              min="0"
                              autoFocus
                            />
                            <div className="edit-actions-inline">
                              <button onClick={confirmEdit} className="confirm-btn-table">✓</button>
                              <button onClick={cancelEdit} className="cancel-btn-table">✗</button>
                            </div>
                          </div>
                        ) : (
                          <span 
                            onClick={() => startEdit(order.id, 'cost', order.cost)}
                            className="cost-value-table editable-text"
                            title="點擊編輯成本"
                          >
                            📊 NT$ {order.cost.toLocaleString()}
                          </span>
                        )}
                      </td>

                      {/* 利潤 */}
                      <td className="col-profit">
                        <span className={`profit-value-table ${profit >= 0 ? 'positive' : 'negative'}`}>
                          📈 NT$ {profit.toLocaleString()}
                        </span>
                        <div className="profit-percentage">
                          ({order.amount > 0 ? ((profit / order.amount) * 100).toFixed(1) : '0.0'}%)
                        </div>
                      </td>

                      {/* 狀態 */}
                      <td className="col-status">
                        <select
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          className={`status-select-table ${getStatusClass(order.status)}`}
                          disabled={loading}
                        >
                          {statusOptions.slice(1).map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </td>

                      {/* 進度 */}
                      <td className="col-progress">
                        <div className="progress-container-table">
                          <div className="progress-bar-table">
                            <div 
                              className="progress-fill-table" 
                              style={{ width: `${progressPercentage}%` }}
                            ></div>
                          </div>
                          <span className="progress-text-table">{Math.round(progressPercentage)}%</span>
                        </div>
                      </td>

                      {/* 操作 */}
                      <td className="col-actions">
                        <div className="action-buttons-table">
                          <button
                            onClick={() => startEdit(order.id, 'notes', order.notes || '')}
                            className={`notes-btn-table ${order.notes ? 'has-notes' : ''}`}
                            title={order.notes ? `備註: ${order.notes}` : '添加備註'}
                          >
                            📝
                          </button>
                          <button
                            onClick={() => deleteOrder(order.id)}
                            className="delete-btn-table"
                            disabled={loading}
                            title="刪除訂單"
                          >
                            🗑️
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

        {/* 編輯區域 - 浮動編輯框 */}
        {editingField && (editingField.field === 'customerLink' || editingField.field === 'notes') && (
          <div className="floating-edit-overlay">
            <div className="floating-edit-container">
              <div className="floating-edit-header">
                <h4>
                  {editingField.field === 'customerLink' ? '🔗 編輯客戶連結' : '📝 編輯備註'}
                </h4>
                <button onClick={cancelEdit} className="close-floating-edit">✗</button>
              </div>
              <div className="floating-edit-content">
                {editingField.field === 'customerLink' ? (
                  <input
                    type="url"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    className="edit-input-floating"
                    placeholder="https://example.com"
                    autoFocus
                  />
                ) : (
                  <textarea
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    className="edit-textarea-floating"
                    rows="4"
                    placeholder="輸入訂單備註..."
                    autoFocus
                  />
                )}
                <div className="floating-edit-actions">
                  <button onClick={confirmEdit} className="confirm-btn-floating">✓ 確認</button>
                  <button onClick={cancelEdit} className="cancel-btn-floating">✗ 取消</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 訂單詳情彈窗 */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>訂單詳情 - {selectedOrder.id}</h3>
              <button className="close-btn" onClick={() => setSelectedOrder(null)}>
                ❌
              </button>
            </div>
            <div className="modal-body">
              <div className="order-summary">
                <div className="summary-section">
                  <h4>客戶資訊</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>客戶姓名：</label>
                      <span>
                        {selectedOrder.customerLink ? (
                          <a 
                            href={selectedOrder.customerLink} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="customer-link"
                            style={{ color: '#007bff', textDecoration: 'none' }}
                          >
                            {selectedOrder.customer}
                          </a>
                        ) : (
                          selectedOrder.customer
                        )}
                      </span>
                    </div>
                    <div className="info-item">
                      <label>聯絡電話：</label>
                      <span>{selectedOrder.customerPhone || '未提供'}</span>
                    </div>
                    <div className="info-item">
                      <label>電子郵件：</label>
                      <span>{selectedOrder.customerEmail || '未提供'}</span>
                    </div>
                    {selectedOrder.customerLink && (
                      <div className="info-item">
                        <label>客戶資料：</label>
                        <a href={selectedOrder.customerLink} target="_blank" rel="noopener noreferrer">
                          查看客戶資料
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="summary-section">
                  <h4>訂單資訊</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>訂單狀態：</label>
                      <span className={`status-badge ${getStatusClass(selectedOrder.status)}`}>
                        {selectedOrder.status}
                      </span>
                    </div>
                    <div className="info-item">
                      <label>訂單日期：</label>
                      <span>{selectedOrder.date}</span>
                    </div>
                    <div className="info-item">
                      <label>訂單金額：</label>
                      <span className="amount-value">NT$ {selectedOrder.amount.toLocaleString()}</span>
                    </div>
                    <div className="info-item">
                      <label>成本估算：</label>
                      <span className="cost-value">NT$ {selectedOrder.cost.toLocaleString()}</span>
                    </div>
                    <div className="info-item">
                      <label>利潤：</label>
                      <span className={`profit-value ${selectedOrder.amount - selectedOrder.cost > 0 ? 'positive' : 'negative'}`}>
                        NT$ {(selectedOrder.amount - selectedOrder.cost).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div className="summary-section">
                    <h4>備註</h4>
                    <p className="notes-content">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 載入指示器 */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">載入中...</div>
        </div>
      )}
    </div>
  );
};

export default OrderSummaryPage;
