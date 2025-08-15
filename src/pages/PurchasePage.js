import React, { useState, useEffect } from 'react';
import './PurchasePage.css';

// API 服務配置
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://192.168.0.2:3001/api';

const purchaseAPI = {
  getAll: async (startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await fetch(`${API_BASE_URL}/purchases?${params}`);
    return await response.json();
  },
  
  add: async (purchaseData) => {
    const response = await fetch(`${API_BASE_URL}/purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(purchaseData),
    });
    return await response.json();
  },
  
  update: async (purchaseId, updateData) => {
    try {
      console.log(`正在更新進貨記錄 ID: ${purchaseId}`, updateData);
      const response = await fetch(`${API_BASE_URL}/purchases/${purchaseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      console.log(`更新 API 響應狀態: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        // 獲取響應內容 - 只讀取一次
        const responseText = await response.text();
        
        if (responseText.includes('<!DOCTYPE')) {
          errorMessage = '伺服器錯誤：更新功能的 API 端點可能不存在。請檢查後端是否支援 PUT /api/purchases/:id 路由。';
        } else {
          // 嘗試解析為 JSON
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.message || errorMessage;
          } catch (parseError) {
            errorMessage = responseText || errorMessage;
          }
        }
        
        throw new Error(errorMessage);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        if (responseText.includes('<!DOCTYPE')) {
          throw new Error('後端 API 返回了 HTML 頁面而非 JSON 響應，請檢查 PUT /api/purchases/:id 路由是否正確實作');
        }
        throw new Error('伺服器返回了非 JSON 響應');
      }
      
      const result = await response.json();
      console.log('更新 API 響應內容:', result);
      return result;
    } catch (error) {
      console.error('更新進貨記錄 API 呼叫失敗:', error);
      throw error;
    }
  },
  
  delete: async (purchaseId) => {
    const response = await fetch(`${API_BASE_URL}/purchases/${purchaseId}`, {
      method: 'DELETE',
    });
    return await response.json();
  }
};

const PurchasePage = () => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7) // 格式: YYYY-MM
  );

  // 輔助函數：取得指定月份的最後一天
  // 修復月份查詢問題：避免產生無效日期如 2025-06-31 (六月只有30天)
  const getMonthEndDate = (yearMonth) => {
    const [year, month] = yearMonth.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate(); // 取得該月的最後一天
    return `${yearMonth}-${lastDay.toString().padStart(2, '0')}`;
  };

  // 新進貨表單資料 - 僅用於進貨記錄，不影響商品庫存
  const [newPurchase, setNewPurchase] = useState({
    productName: '',
    quantity: 1,
    unitCost: 0,
    purchaseDate: new Date().toISOString().slice(0, 10),
    supplier: '',
    notes: '',
    status: '未付款' // 新增狀態欄位，預設為未付款
  });

  // 編輯相關狀態
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // 檢查重複 ID 的函數
  const checkForDuplicateIds = (purchases, context = '') => {
    const idSet = new Set();
    const duplicateIds = [];
    
    purchases.forEach(purchase => {
      if (idSet.has(purchase.id)) {
        duplicateIds.push(purchase.id);
      } else {
        idSet.add(purchase.id);
      }
    });
    
    if (duplicateIds.length > 0) {
      console.warn(`${context}檢測到重複的進貨記錄 ID:`, duplicateIds);
      return duplicateIds;
    }
    
    return [];
  };

  // 載入資料 - 僅從 purchases table 取得進貨記錄
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        console.log('載入當月進貨記錄，不涉及商品庫存表');
        
        // 僅載入當月進貨記錄
        const startDate = `${selectedMonth}-01`;
        const endDate = getMonthEndDate(selectedMonth);
        
        const response = await purchaseAPI.getAll(startDate, endDate);
        if (response.success) {
          const purchaseData = response.data || [];
          
          // 檢查重複的 ID
          checkForDuplicateIds(purchaseData, '初始載入時');
          
          setPurchases(purchaseData);
          console.log(`已載入 ${purchaseData.length} 筆進貨記錄`);
        }
      } catch (error) {
        console.error('載入進貨記錄失敗:', error);
        alert('載入進貨記錄失敗，請檢查網路連線');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedMonth]);

  // 處理表單變更 - 簡化版本，僅用於進貨記錄
  const handleInputChange = (field, value) => {
    setNewPurchase(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 新增進貨 - 僅儲存到 purchases table，不影響 products table
  const handleAddPurchase = async () => {
    // 表單驗證
    if (!newPurchase.productName.trim()) {
      alert('請輸入或選擇商品名稱');
      return;
    }
    
    if (newPurchase.quantity <= 0) {
      alert('數量必須大於 0');
      return;
    }
    
    if (newPurchase.unitCost <= 0) {
      alert('單價必須大於 0');
      return;
    }

    try {
      setLoading(true);
      
      const quantity = parseFloat(newPurchase.quantity) || 0;
      const unitCost = parseFloat(newPurchase.unitCost) || 0;
      const totalCost = quantity * unitCost;
      
      // 進貨記錄數據 - 僅用於 purchases table
      const purchaseData = {
        ...newPurchase,
        quantity: quantity,
        unitCost: unitCost,
        totalCost: isNaN(totalCost) ? 0 : Math.round(totalCost * 100) / 100,
        // 確保不會影響商品庫存表
        onlyPurchaseRecord: true
      };

      console.log('新增進貨記錄到 purchases table:', purchaseData);
      const response = await purchaseAPI.add(purchaseData);
      
      if (response.success) {
        alert('進貨記錄新增成功！已儲存到進貨記錄表。');
        
        // 重新載入進貨記錄
        const startDate = `${selectedMonth}-01`;
        const endDate = getMonthEndDate(selectedMonth);
        const purchasesResponse = await purchaseAPI.getAll(startDate, endDate);
        if (purchasesResponse.success) {
          const purchaseData = purchasesResponse.data || [];
          
          // 檢查重複的 ID
          checkForDuplicateIds(purchaseData, '新增後重載時');
          
          setPurchases(purchaseData);
        }
        
        // 重置表單
        setNewPurchase({
          productName: '',
          quantity: 1,
          unitCost: 0,
          purchaseDate: new Date().toISOString().slice(0, 10),
          supplier: '',
          notes: '',
          status: '未付款'
        });
        setShowAddForm(false);
      } else {
        alert('新增失敗: ' + (response.message || '未知錯誤'));
      }
    } catch (error) {
      console.error('新增進貨失敗:', error);
      alert('新增進貨失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  // 刪除進貨記錄
  const handleDeletePurchase = async (purchaseId) => {
    if (!window.confirm('確定要刪除這筆進貨記錄嗎？')) {
      return;
    }

    try {
      setLoading(true);
      const response = await purchaseAPI.delete(purchaseId);
      
      if (response.success) {
        alert('進貨記錄已刪除');
        // 重新載入進貨記錄
        const startDate = `${selectedMonth}-01`;
        const endDate = getMonthEndDate(selectedMonth);
        const purchasesResponse = await purchaseAPI.getAll(startDate, endDate);
        if (purchasesResponse.success) {
          setPurchases(purchasesResponse.data || []);
        }
      } else {
        alert('刪除失敗: ' + (response.message || '未知錯誤'));
      }
    } catch (error) {
      console.error('刪除進貨失敗:', error);
      alert('刪除失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  // 開始編輯進貨記錄
  const handleEditPurchase = (purchase) => {
    setEditingPurchase(purchase.id);
    setEditFormData({
      unitCost: parseFloat(purchase.unit_cost || purchase.unitCost) || 0,
      quantity: parseFloat(purchase.quantity) || 0,
      supplier: purchase.supplier || '',
      notes: purchase.notes || '',
      status: purchase.status || '未付款'
    });
  };

  // 取消編輯
  const handleCancelEdit = () => {
    setEditingPurchase(null);
    setEditFormData({});
  };

  // 保存編輯
  const handleSaveEdit = async (purchaseId) => {
    try {
      setLoading(true);
      
      const quantity = parseFloat(editFormData.quantity) || 0;
      const unitCost = parseFloat(editFormData.unitCost) || 0;
      const totalCost = quantity * unitCost;
      
      const updateData = {
        ...editFormData,
        quantity: quantity,
        unitCost: unitCost,
        totalCost: isNaN(totalCost) ? 0 : Math.round(totalCost * 100) / 100
      };

      console.log('準備更新進貨記錄:', { purchaseId, updateData });
      const response = await purchaseAPI.update(purchaseId, updateData);
      
      if (response.success) {
        alert('進貨記錄更新成功！');
        
        // 重新載入進貨記錄
        const startDate = `${selectedMonth}-01`;
        const endDate = getMonthEndDate(selectedMonth);
        const purchasesResponse = await purchaseAPI.getAll(startDate, endDate);
        if (purchasesResponse.success) {
          setPurchases(purchasesResponse.data || []);
        }
        
        setEditingPurchase(null);
        setEditFormData({});
      } else {
        alert('更新失敗: ' + (response.message || '未知錯誤'));
      }
    } catch (error) {
      console.error('更新進貨失敗:', error);
      
      let errorMessage = '更新失敗：';
      
      if (error.message.includes('HTML') || error.message.includes('<!DOCTYPE')) {
        errorMessage += '後端 API 不支援更新功能。請檢查伺服器是否實作了 PUT /api/purchases/:id 路由。';
      } else if (error.message.includes('HTTP 500')) {
        errorMessage += '伺服器內部錯誤，可能是資料庫問題。';
      } else if (error.message.includes('HTTP 404')) {
        errorMessage += '找不到該進貨記錄，可能已被刪除。';
      } else if (error.message.includes('HTTP 400')) {
        errorMessage += '提交的資料格式錯誤。';
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage += '無法連接到伺服器，請檢查網路連線。';
      } else {
        errorMessage += error.message || '請稍後再試';
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 處理編輯表單變更
  const handleEditFormChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 計算當月統計
  const monthlyStats = {
    totalPurchases: purchases.length,
    totalQuantity: purchases.reduce((sum, p) => sum + (parseFloat(p.quantity) || 0), 0),
    totalAmount: (() => {
      const total = purchases.reduce((sum, p) => {
        const cost = parseFloat(p.total_cost || p.totalCost) || 0;
        return sum + cost;
      }, 0);
      return isNaN(total) ? 0 : Math.round(total * 100) / 100;
    })(),
    uniqueProducts: new Set(purchases.map(p => p.product_name || p.productName)).size,
    paidCount: purchases.filter(p => p.status === '已付款').length,
    unpaidCount: purchases.filter(p => p.status === '未付款' || !p.status).length
  };

  return (
    <div className="purchase-page">
      <div className="page-header">
        <h1>📦 進貨管理</h1>
        <p>管理每月進貨記錄，自動更新商品庫存</p>
      </div>

      {/* 月份選擇和統計 */}
      <div className="controls-section">
        <div className="month-selector">
          <label>選擇月份：</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="add-purchase-btn"
          disabled={loading}
        >
          {showAddForm ? '取消新增' : '➕ 新增進貨'}
        </button>
      </div>

      {/* 統計卡片 */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <h3>進貨筆數</h3>
            <div className="stat-value">{monthlyStats.totalPurchases}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <h3>總數量</h3>
            <div className="stat-value">{monthlyStats.totalQuantity}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>總金額</h3>
            <div className="stat-value">NT$ {monthlyStats.totalAmount.toLocaleString()}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🛍️</div>
          <div className="stat-content">
            <h3>商品種類</h3>
            <div className="stat-value">{monthlyStats.uniqueProducts}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>已付款</h3>
            <div className="stat-value">{monthlyStats.paidCount}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>未付款</h3>
            <div className="stat-value">{monthlyStats.unpaidCount}</div>
          </div>
        </div>
      </div>

      {/* 新增進貨表單 */}
      {showAddForm && (
        <div className="add-purchase-form">
          <h3>新增進貨記錄</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>商品名稱：</label>
              <input
                type="text"
                className="form-input"
                value={newPurchase.productName}
                onChange={(e) => handleInputChange('productName', e.target.value)}
                placeholder="請輸入商品名稱"
                required
              />
            </div>

            <div className="form-group">
              <label>進貨數量：</label>
              <input
                type="number"
                min="1"
                value={newPurchase.quantity}
                onChange={(e) => handleInputChange('quantity', parseInt(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>單價 (NT$)：</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newPurchase.unitCost}
                onChange={(e) => handleInputChange('unitCost', parseFloat(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>進貨日期：</label>
              <input
                type="date"
                value={newPurchase.purchaseDate}
                onChange={(e) => handleInputChange('purchaseDate', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>供應商：</label>
              <input
                type="text"
                value={newPurchase.supplier}
                onChange={(e) => handleInputChange('supplier', e.target.value)}
                placeholder="供應商名稱 (選填)"
              />
            </div>

            <div className="form-group">
              <label>付款狀態：</label>
              <select
                value={newPurchase.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="status-select"
              >
                <option value="未付款">未付款</option>
                <option value="已付款">已付款</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label>備註：</label>
              <textarea
                value={newPurchase.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="備註說明 (選填)"
                rows={3}
              />
            </div>

            <div className="form-group total-display">
              <label>總金額：</label>
              <div className="total-amount">
                NT$ {(() => {
                  const quantity = parseFloat(newPurchase.quantity) || 0;
                  const unitCost = parseFloat(newPurchase.unitCost) || 0;
                  const total = quantity * unitCost;
                  return isNaN(total) ? 0 : (Math.round(total * 100) / 100).toLocaleString();
                })()}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              onClick={handleAddPurchase}
              disabled={loading}
              className="save-btn"
            >
              {loading ? '儲存中...' : '💾 儲存進貨'}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="cancel-btn"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 進貨記錄列表 */}
      <div className="purchases-section">
        <h2>📋 {selectedMonth} 進貨記錄</h2>
        
        {loading ? (
          <div className="loading">載入中...</div>
        ) : purchases.length === 0 ? (
          <div className="no-purchases">
            <div className="no-purchases-icon">📦</div>
            <h3>尚無進貨記錄</h3>
            <p>點擊上方「新增進貨」按鈕開始記錄進貨資訊</p>
          </div>
        ) : (
          <div className="purchases-table-container">
            <table className="purchases-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>商品名稱</th>
                  <th>數量</th>
                  <th>單價</th>
                  <th>總額</th>
                  <th>供應商</th>
                  <th>狀態</th>
                  <th>備註</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map(purchase => (
                  <tr key={purchase.id}>
                    <td>
                      {new Date(purchase.purchase_date || purchase.purchaseDate).toLocaleDateString()}
                    </td>
                    <td className="product-name">
                      {purchase.product_name || purchase.productName}
                      {(purchase.is_custom_product || purchase.isCustomProduct) && (
                        <span className="custom-tag">自訂</span>
                      )}
                    </td>
                    <td className="quantity">
                      {editingPurchase === purchase.id ? (
                        <input
                          type="number"
                          min="1"
                          value={editFormData.quantity}
                          onChange={(e) => handleEditFormChange('quantity', parseFloat(e.target.value))}
                          className="edit-input"
                          style={{ width: '80px' }}
                        />
                      ) : (
                        purchase.quantity
                      )}
                    </td>
                    <td className="unit-cost">
                      {editingPurchase === purchase.id ? (
                        <>
                          NT$ <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editFormData.unitCost}
                            onChange={(e) => handleEditFormChange('unitCost', parseFloat(e.target.value))}
                            className="edit-input"
                            style={{ width: '100px' }}
                          />
                        </>
                      ) : (
                        `NT$ ${(() => {
                          const cost = parseFloat(purchase.unit_cost || purchase.unitCost) || 0;
                          return isNaN(cost) ? 0 : (Math.round(cost * 100) / 100).toLocaleString();
                        })()}`
                      )}
                    </td>
                    <td className="total-cost">
                      NT$ {(() => {
                        if (editingPurchase === purchase.id) {
                          const quantity = parseFloat(editFormData.quantity) || 0;
                          const unitCost = parseFloat(editFormData.unitCost) || 0;
                          const total = quantity * unitCost;
                          return isNaN(total) ? 0 : (Math.round(total * 100) / 100).toLocaleString();
                        } else {
                          const total = parseFloat(purchase.total_cost || purchase.totalCost) || 0;
                          return isNaN(total) ? 0 : (Math.round(total * 100) / 100).toLocaleString();
                        }
                      })()}
                    </td>
                    <td className="supplier">
                      {editingPurchase === purchase.id ? (
                        <input
                          type="text"
                          value={editFormData.supplier}
                          onChange={(e) => handleEditFormChange('supplier', e.target.value)}
                          className="edit-input"
                          placeholder="供應商"
                          style={{ width: '120px' }}
                        />
                      ) : (
                        purchase.supplier || '未提供'
                      )}
                    </td>
                    <td className="status">
                      {editingPurchase === purchase.id ? (
                        <select
                          value={editFormData.status || '未付款'}
                          onChange={(e) => handleEditFormChange('status', e.target.value)}
                          className="edit-select status-select"
                        >
                          <option value="未付款">未付款</option>
                          <option value="已付款">已付款</option>
                        </select>
                      ) : (
                        <span className={`status-badge ${purchase.status === '已付款' ? 'paid' : 'unpaid'}`}>
                          {purchase.status || '未付款'}
                        </span>
                      )}
                    </td>
                    <td className="notes">
                      {editingPurchase === purchase.id ? (
                        <textarea
                          value={editFormData.notes}
                          onChange={(e) => handleEditFormChange('notes', e.target.value)}
                          className="edit-textarea"
                          placeholder="備註"
                          rows={2}
                          style={{ width: '150px', resize: 'vertical' }}
                        />
                      ) : (
                        purchase.notes || '-'
                      )}
                    </td>
                    <td className="actions">
                      {editingPurchase === purchase.id ? (
                        <div className="edit-actions">
                          <button
                            onClick={() => handleSaveEdit(purchase.id)}
                            className="save-btn"
                            title="保存修改"
                            disabled={loading}
                          >
                            💾
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="cancel-btn"
                            title="取消編輯"
                          >
                            ❌
                          </button>
                        </div>
                      ) : (
                        <div className="action-buttons">
                          <button
                            onClick={() => handleEditPurchase(purchase)}
                            className="edit-btn"
                            title="編輯記錄"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeletePurchase(purchase.id)}
                            className="delete-btn"
                            title="刪除記錄"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchasePage;
