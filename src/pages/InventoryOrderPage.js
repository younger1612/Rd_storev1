import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import './InventoryOrderPage.css';

// API 服務配置
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://192.168.0.2:3001/api';


const productAPI = {
  // 測試 API 連接
  testConnection: async () => {
    try {
      console.log('測試 API 連接:', API_BASE_URL);
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('API 連接測試響應:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('API 連接測試完整響應:', result);
      
      // 處理後端的響應格式 { success: true, data: [...] }
      const products = result.data || result;
      console.log('解析到的產品:', products);
      console.log('API 連接測試成功，產品數量:', products.length);
      
      return { success: true, count: products.length, data: products };
    } catch (error) {
      console.error('API 連接測試失敗:', error);
      return { success: false, error: error.message };
    }
  },
  getAll: async () => {
    try {
      console.log('獲取所有產品，API_BASE_URL:', API_BASE_URL);
      const response = await fetch(`${API_BASE_URL}/products`);
      
      console.log('產品 API 響應狀態:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('產品 API 響應內容:', result);
      
      // 處理後端的響應格式 { success: true, data: [...] }
      const products = result.data || result;
      console.log('解析到的產品數據:', products);
      
      return products;
    } catch (error) {
      console.error('獲取產品失敗:', error);
      throw error;
    }
  },
  
  updateStock: async (productId, newStock, reason) => {
    try {
      console.log('API 請求詳情:', { 
        url: `${API_BASE_URL}/products/${productId}/stock`,
        payload: { current_stock: newStock, reason }
      });
      
      const response = await fetch(`${API_BASE_URL}/products/${productId}/stock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ current_stock: newStock, reason }),
      });

      console.log('API 響應狀態:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API 錯誤響應:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('API 響應內容:', result);
      return result;
    } catch (error) {
      console.error('updateStock API 錯誤:', error);
      throw error;
    }
  },
  
  // 新增商品到資料庫
  create: async (productData) => {
    try {
      console.log('新增商品到資料庫:', productData);
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: productData.name,
          category: productData.category,
          current_stock: parseInt(productData.stock) || 0,
          current_price: parseFloat(productData.price) || 0,
          specs: productData.specs || {}
        }),
      });

      console.log('新增商品 API 響應狀態:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('新增商品 API 錯誤響應:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('新增商品 API 響應內容:', result);
      return result;
    } catch (error) {
      console.error('新增商品 API 錯誤:', error);
      throw error;
    }
  },
  
  updatePrice: async (productId, newPrice, reason) => {
    try {
      console.log('價格更新 API 請求:', { 
        url: `${API_BASE_URL}/products/${productId}/price`,
        payload: { current_price: newPrice, reason: reason || '手動價格調整' }
      });
      
      const response = await fetch(`${API_BASE_URL}/products/${productId}/price`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ current_price: newPrice, reason: reason || '手動價格調整' }),
      });

      console.log('價格更新 API 響應狀態:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('價格更新 API 錯誤響應:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('價格更新 API 響應內容:', result);
      return result;
    } catch (error) {
      console.error('updatePrice API 錯誤:', error);
      throw error;
    }
  },

  // 刪除商品
  delete: async (productId) => {
    try {
      console.log(`正在刪除商品 ID: ${productId}`);
      console.log(`API URL: ${API_BASE_URL}/products/${productId}`);
      
      const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log(`刪除 API 響應狀態: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        // 嘗試獲取錯誤詳情
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          // 如果無法解析 JSON，可能是 HTML 錯誤頁面
          const errorText = await response.text();
          if (errorText.includes('<!DOCTYPE')) {
            errorMessage = '伺服器錯誤：返回了 HTML 頁面而非 JSON 響應。請檢查伺服器狀態。';
          } else {
            errorMessage = errorText || errorMessage;
          }
        }
        
        throw new Error(errorMessage);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        if (responseText.includes('<!DOCTYPE')) {
          throw new Error('伺服器返回了 HTML 頁面而非 JSON 響應，請檢查 API 路由設置');
        }
        throw new Error('伺服器返回了非 JSON 響應');
      }
      
      const result = await response.json();
      console.log('刪除 API 響應內容:', result);
      return result;
    } catch (error) {
      console.error('刪除商品 API 呼叫失敗:', error);
      throw error;
    }
  },

  // 更新商品數量（直接設定）
  updateQuantity: async (productId, newQuantity, reason) => {
    try {
      console.log('商品數量更新 API 請求:', { 
        url: `${API_BASE_URL}/products/${productId}/stock`,
        payload: { current_stock: newQuantity, reason: reason || '手動數量調整' }
      });
      
      const response = await fetch(`${API_BASE_URL}/products/${productId}/stock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ current_stock: newQuantity, reason: reason || '手動數量調整' }),
      });

      console.log('商品數量更新 API 響應狀態:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('商品數量更新 API 錯誤響應:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('商品數量更新 API 響應內容:', result);
      return result;
    } catch (error) {
      console.error('updateQuantity API 錯誤:', error);
      throw error;
    }
  }
};

const orderAPI = {
  // 創建訂單
  create: async (orderData) => {
    try {
      console.log('創建訂單 API 請求:', orderData);
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      console.log('創建訂單 API 響應狀態:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('創建訂單 API 錯誤響應:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('創建訂單 API 響應內容:', result);
      return result;
    } catch (error) {
      console.error('創建訂單 API 錯誤:', error);
      throw error;
    }
  },

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

  // 獲取單一訂單詳情
  getById: async (orderId) => {
    try {
      console.log(`獲取訂單詳情，ID: ${orderId}`);
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('訂單詳情 API 響應:', result);
      
      return result.data || result;
    } catch (error) {
      console.error('獲取訂單詳情失敗:', error);
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

      console.log('更新訂單 API 響應狀態:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('更新訂單 API 錯誤響應:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('更新訂單 API 響應內容:', result);
      return result;
    } catch (error) {
      console.error('更新訂單 API 錯誤:', error);
      throw error;
    }
  }
};

const handleAPIError = (error) => {
  console.error('API Error:', error);
  throw error;
};

const InventoryOrderPage = () => {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'CPU',
    stock: 0,
    price: 0,
    specs: {}
  });
  const [newSpecKey, setNewSpecKey] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [completedOrders, setCompletedOrders] = useState([]);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editingOrderData, setEditingOrderData] = useState(null);
  const [showStockAdjustment, setShowStockAdjustment] = useState(null);
  const [stockAdjustmentValue, setStockAdjustmentValue] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showPriceEdit, setShowPriceEdit] = useState(null);
  const [newPrice, setNewPrice] = useState(0);
  const [showOrderDetails, setShowOrderDetails] = useState(null);
  
  // 商品詳細編輯相關狀態
  const [editingItem, setEditingItem] = useState(null);
  const [newPartLabelName, setNewPartLabelName] = useState('');
  const [newPartLabelValue, setNewPartLabelValue] = useState('');

  // 商品管理相關狀態
  const [showQuantityEdit, setShowQuantityEdit] = useState(null);
  const [newQuantity, setNewQuantity] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  
  // 商品卡片折疊狀態
  const [collapsedProducts, setCollapsedProducts] = useState(new Set());
  
  // 訂單編輯時添加商品相關狀態
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showTotalAmountEdit, setShowTotalAmountEdit] = useState(null);
  const [newTotalAmount, setNewTotalAmount] = useState(0);

  // 日期篩選相關狀態
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  
  // 分頁相關狀態
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6); // 每頁顯示6個商品

  // 產品分類定義
  const categories = [
    { id: 'All', name: '全部' },
    { id: 'CPU', name: 'CPU' },
    { id: 'GPU', name: 'GPU' },
    { id: 'Motherboard', name: '主機板' },
    { id: 'RAM', name: '記憶體' },
    { id: 'SSD', name: '固態硬碟' },
    { id: 'HDD', name: '傳統硬碟' },
    { id: 'PSU', name: '電源供應器' },
    { id: 'Storage', name: '儲存裝置' },
    { id: 'Cooler', name: '散熱器' },
    { id: 'Case', name: '機殼' },
    { id: '自訂商品', name: '自訂商品' }
  ];

  // API 連接測試函數
  const testAPIConnection = async () => {
    try {
      console.log('開始 API 連接測試...');
      const result = await productAPI.testConnection();
      
      if (result.success) {
        alert(`API 連接成功！找到 ${result.count} 個產品`);
        console.log('API 測試成功');
      } else {
        alert(`API 連接失敗: ${result.error}`);
        console.error('API 測試失敗:', result.error);
      }
    } catch (error) {
      console.error('API 測試錯誤:', error);
      alert(`API 測試錯誤: ${error.message}`);
    }
  };

  // 生成唯一的訂單 ID
  const generateUniqueOrderId = () => {
    let newId;
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
      newId = Date.now() + Math.random() * 1000; // 加入隨機數避免同時創建的衝突
      newId = Math.floor(newId); // 取整數
      attempts++;
      
      if (attempts >= maxAttempts) {
        console.warn('生成唯一 ID 達到最大嘗試次數，使用時間戳和隨機數');
        newId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
        break;
      }
    } while (completedOrders.some(order => order.id === newId));
    
    console.log(`生成新的訂單 ID: ${newId} (嘗試次數: ${attempts})`);
    return newId;
  };

  // 生成唯一的產品 ID
  const generateUniqueProductId = () => {
    let newId;
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
      newId = Date.now() + Math.random() * 1000; // 加入隨機數避免同時創建的衝突
      newId = Math.floor(newId); // 取整數
      attempts++;
      
      if (attempts >= maxAttempts) {
        console.warn('生成唯一產品 ID 達到最大嘗試次數，使用時間戳和隨機數');
        newId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
        break;
      }
    } while (products.some(product => product.id === newId));
    
    console.log(`生成新的產品 ID: ${newId} (嘗試次數: ${attempts})`);
    return newId;
  };




  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 從資料庫獲取產品數據
        let productsData = [];
        
        try {
          console.log('開始獲取產品數據...');
          const productsResponse = await productAPI.getAll();
          console.log('產品 API 響應:', productsResponse);
          
          // productsResponse 現在直接是產品數組，不需要 .data
          if (Array.isArray(productsResponse) && productsResponse.length > 0) {
            productsData = productsResponse.map(product => ({
              id: product.id,
              name: product.name,
              category: product.category || 'CPU',
              stock: product.current_stock || 0, // 直接使用資料庫中的庫存數量
              price: product.current_price || 0, // 直接使用資料庫中的價格
              current_stock: product.current_stock || 0, // 保留原始欄位名稱
              current_price: product.current_price || 0, // 保留原始欄位名稱
              specs: (() => {
                // 安全地解析 specs 欄位
                if (!product.specs) return {};
                if (typeof product.specs === 'object') return product.specs;
                if (typeof product.specs === 'string') {
                  try {
                    return JSON.parse(product.specs);
                  } catch (e) {
                    console.warn(`無法解析商品 ${product.name} 的規格:`, e);
                    return {};
                  }
                }
                return {};
              })()
            }));
          }
        } catch (error) {
          console.error('獲取產品數據失敗:', error);
        }

        // 直接使用從資料庫取得的產品數據，包含實際庫存和價格
        setProducts(productsData);
        console.log(`已載入 ${productsData.length} 項商品，庫存數據來自資料庫`);

        // 設定空的客戶數據（未來可從資料庫獲取）
        setCustomers([]);
        
        // 從資料庫載入訂單記錄
        let ordersData = [];
        try {
          console.log('開始獲取訂單資料...');
          const ordersResponse = await orderAPI.getAll();
          console.log('訂單 API 響應:', ordersResponse);
          
          if (Array.isArray(ordersResponse) && ordersResponse.length > 0) {
            // 轉換資料庫訂單格式為前端格式
            ordersData = ordersResponse.map(order => ({
              id: order.id,
              date: new Date(order.created_at).toLocaleString(),
              items: (order.items || []).map(item => ({
                productId: item.product_id,
                productName: item.product_name,
                quantity: item.quantity,
                price: parseFloat(item.unit_price),
                cost: parseFloat(item.unit_cost || 0),
                specs: item.specs || {}
              })),
              totalAmount: parseFloat(order.total_amount),
              status: order.status || '待收訂金', // 修正：預設狀態改為待收訂金
              customerName: order.customer_name || '',
              customerPhone: order.customer_phone || '',
              customerEmail: order.customer_email || ''
            }));
          }
        } catch (error) {
          console.error('獲取訂單資料失敗:', error);
          // 如果資料庫獲取失敗，嘗試從 localStorage 載入
          const savedOrders = JSON.parse(localStorage.getItem('completedOrders') || '[]');
          ordersData = savedOrders;
        }
        
        setCompletedOrders(ordersData);
        console.log(`已載入 ${ordersData.length} 筆訂單記錄`);
        setIsInitialLoad(false); // 標記初始載入完成
      } catch (error) {
        console.error('獲取數據失敗:', error);
        setProducts([]);
        setCustomers([]);
        setCompletedOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 保存訂單記錄到localStorage (避免在初始載入時覆蓋已保存的數據)
  useEffect(() => {
    if (!isInitialLoad) {
      localStorage.setItem('completedOrders', JSON.stringify(completedOrders));
    }
  }, [completedOrders, isInitialLoad]);

  const addToOrder = (product) => {
    // 記住當前滾動位置
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    
    // 檢查庫存是否足夠 - 只有庫存為0時才提示
    if (product.stock <= 0) {
      alert('庫存不足，無法加入訂單');
      return;
    }

    const existingItem = orderItems.find(item => item.productId === product.id);
    
    if (existingItem) {
      // 修改檢查邏輯：只有當剩餘庫存為0時才提示無法新增
      const remainingStock = product.stock;
      if (remainingStock <= 0) {
        alert('庫存不足，無法再新增更多數量');
        return;
      }
      
      setOrderItems(prev => prev.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setOrderItems(prev => [...prev, {
        productId: product.id,
        productName: product.name,
        productCategory: product.category,
        quantity: 1,
        price: product.price,
        cost: product.currentCost || (product.price * 0.7), // 使用成本價或預設為售價的70%
        specs: { ...product.specs },
        partLabels: {} // 初始化零件標籤
      }]);
    }

    // 即時扣除庫存
    setProducts(prev => prev.map(p =>
      p.id === product.id
        ? { ...p, stock: p.stock - 1 }
        : p
    ));
    
    // 還原滾動位置，防止頁面跳動
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollPosition);
    });
  };

  // 新增產品到庫存並存入資料庫
  const addNewProduct = async () => {
    if (!newProduct.name || !newProduct.price) {
      alert('請填寫產品名稱和價格');
      return;
    }

    try {
      setLoading(true);
      
      const productData = {
        name: newProduct.name,
        category: newProduct.category,
        stock: parseInt(newProduct.stock) || 0,
        price: parseFloat(newProduct.price) || 0,
        specs: { ...newProduct.specs }
      };

      console.log('準備新增商品:', productData);
      
      // 調用 API 新增商品到資料庫
      const result = await productAPI.create(productData);
      console.log('商品新增結果:', result);

      if (result.success !== false && !result.error) {
        // API 成功，將商品加入本地狀態
        const newProductData = result.data || result;
        setProducts(prev => [...prev, {
          id: newProductData.id,
          name: newProductData.name,
          category: newProductData.category,
          stock: newProductData.current_stock || newProductData.stock || 0,
          price: newProductData.current_price || newProductData.price || 0,
          current_stock: newProductData.current_stock || newProductData.stock || 0,
          current_price: newProductData.current_price || newProductData.price || 0,
          specs: newProductData.specs || {}
        }]);
        
        // 重置表單
        setNewProduct({
          name: '',
          category: 'CPU',
          stock: 0,
          price: 0,
          specs: {}
        });
        setShowNewProductForm(false);
        
        const message = result.message || `產品 "${productData.name}" 已成功新增到資料庫並加入 ${productData.category} 分類！`;
        alert(message);
        console.log('商品新增成功:', message);
      } else {
        const errorMessage = result.message || result.error || '新增商品失敗';
        alert(`新增商品失敗: ${errorMessage}`);
        console.error('商品新增失敗:', errorMessage);
      }
    } catch (error) {
      console.error('新增商品錯誤:', error);
      alert(`新增商品失敗: ${error.message || '網路錯誤，請檢查伺服器連線'}`);
    } finally {
      setLoading(false);
    }
  };

  // 新增規格到新產品
  const addSpecToNewProduct = () => {
    if (!newSpecKey || !newSpecValue) {
      alert('請填寫規格名稱和值');
      return;
    }

    setNewProduct(prev => ({
      ...prev,
      specs: {
        ...prev.specs,
        [newSpecKey]: newSpecValue
      }
    }));

    setNewSpecKey('');
    setNewSpecValue('');
  };

  // 移除新產品的規格
  const removeSpecFromNewProduct = (specKey) => {
    setNewProduct(prev => ({
      ...prev,
      specs: Object.fromEntries(
        Object.entries(prev.specs).filter(([key]) => key !== specKey)
      )
    }));
  };

  const updateOrderItem = (productId, field, value) => {
    if (field === 'quantity') {
      const currentItem = orderItems.find(item => item.productId === productId);
      const product = products.find(p => p.id === productId);
      
      if (!currentItem || !product) return;
      
      const oldQuantity = currentItem.quantity;
      const newQuantity = parseInt(value) || 0;
      
      if (newQuantity < 1) {
        alert('數量不能小於 1');
        return;
      }
      
      // 計算需要的庫存變化
      const stockChange = oldQuantity - newQuantity; // 正數表示釋放庫存，負數表示需要更多庫存
      
      // 修改檢查邏輯：只有當庫存完全不足時才提示（庫存 < 需要的額外數量）
      if (stockChange < 0 && product.stock < Math.abs(stockChange)) {
        // 只有在真正庫存不足時才提示
        if (product.stock === 0) {
          alert(`庫存不足！目前庫存已為 0，無法增加數量`);
        } else {
          alert(`庫存不足！目前可用庫存: ${product.stock}，需要額外: ${Math.abs(stockChange)}`);
        }
        return;
      }
      
      // 更新訂單項目數量
      setOrderItems(prev => prev.map(item =>
        item.productId === productId
          ? { ...item, quantity: newQuantity }
          : item
      ));
      
      // 更新庫存
      setProducts(prev => prev.map(p =>
        p.id === productId
          ? { ...p, stock: p.stock + stockChange }
          : p
      ));
    } else {
      // 非數量欄位直接更新
      setOrderItems(prev => prev.map(item =>
        item.productId === productId
          ? { ...item, [field]: value }
          : item
      ));
    }
  };

  const removeFromOrder = (productId) => {
    // 記住當前滾動位置
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    
    const removedItem = orderItems.find(item => item.productId === productId);
    if (removedItem) {
      // 還原庫存
      setProducts(prev => prev.map(p =>
        p.id === productId
          ? { ...p, stock: p.stock + removedItem.quantity }
          : p
      ));
    }
    
    setOrderItems(prev => prev.filter(item => item.productId !== productId));
    
    // 還原滾動位置，防止頁面跳動
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollPosition);
    });
  };

  const updateItemSpecs = (productId, specKey, specValue) => {
    setOrderItems(prev => prev.map(item =>
      item.productId === productId
        ? { ...item, specs: { ...item.specs, [specKey]: specValue } }
        : item
    ));
  };

  const calculateTotal = () => {
    return orderItems.reduce((total, item) => total + (item.quantity * item.price), 0);
  };

  const handleSubmitOrder = async () => {
    if (orderItems.length === 0) {
      alert('請至少新增一個商品到訂單');
      return;
    }

    try {
      setLoading(true);
      
      // 準備訂單資料
      const customerInfo = selectedCustomer ? 
        customers.find(c => c.id.toString() === selectedCustomer) : 
        newCustomer;
      
      const orderData = {
        customer_name: customerInfo?.name || '',
        customer_phone: customerInfo?.phone || '',
        customer_email: customerInfo?.email || '',
        total_amount: calculateTotal(),
        cost: orderItems.reduce((total, item) => total + ((item.cost || 0) * item.quantity), 0),
        status: '待收訂金', // 初始狀態為待收訂金
        notes: '',
        items: orderItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          cost: item.cost || 0,
          specs: item.specs || {}
        }))
      };
      
      console.log('提交訂單資料:', orderData);
      
      // 調用 API 建立訂單
      const result = await orderAPI.create(orderData);
      
      console.log('訂單建立結果:', result);
      
      // 訂單建立成功後，同步資料庫庫存（使用當前本地庫存狀態）
      for (const item of orderItems) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          try {
            // 同步本地庫存狀態到資料庫
            await productAPI.updateStock(
              item.productId, 
              product.stock, // 使用已經扣除後的本地庫存
              `訂單建立同步 - 訂單 #${result.data.id}`
            );
            
            console.log(`商品 ${item.productName} 庫存已同步到資料庫：${product.stock}`);
          } catch (stockError) {
            console.error(`同步商品 ${item.productId} 庫存失敗:`, stockError);
            // 庫存同步失敗，但不影響訂單建立
          }
        }
      }
      
      // 建立本地訂單物件用於顯示
      const newOrder = {
        id: result.data.id,
        date: new Date().toLocaleDateString('zh-TW', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit' 
        }),
        items: [...orderItems],
        totalAmount: calculateTotal(),
        status: '待收訂金', // 與資料庫一致的初始狀態
        customerName: customerInfo?.name || '',
        customerPhone: customerInfo?.phone || '',
        customerEmail: customerInfo?.email || ''
      };
      
      // 將新訂單加入已完成訂單列表
      setCompletedOrders(prev => [newOrder, ...prev]);
      
      alert('訂單建立成功並已存入資料庫！庫存已自動扣除。');
      
      // 重置表單
      setOrderItems([]);
      setSelectedCustomer('');
      setNewCustomer({ name: '', phone: '', email: '' });
      setShowNewCustomerForm(false);
    } catch (error) {
      console.error('訂單建立失敗:', error);
      
      // 訂單建立失敗，還原所有商品庫存
      alert(`訂單建立失敗：${error.message}。庫存將自動還原。`);
      
      for (const item of orderItems) {
        setProducts(prev => prev.map(p =>
          p.id === item.productId
            ? { ...p, stock: p.stock + item.quantity }
            : p
        ));
      }
    } finally {
      setLoading(false);
    }
  };

  // 清空購物車（還原所有庫存）
  const clearOrderItems = () => {
    if (orderItems.length === 0) return;
    
    if (window.confirm('確定要清空購物車嗎？所有商品將被移除，庫存將會還原。')) {
      // 記住當前滾動位置
      const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
      
      // 還原所有商品庫存
      orderItems.forEach(item => {
        setProducts(prev => prev.map(p =>
          p.id === item.productId
            ? { ...p, stock: p.stock + item.quantity }
            : p
        ));
      });
      
      // 清空訂單項目
      setOrderItems([]);
      
      // 還原滾動位置，防止頁面跳動
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPosition);
      });
      
      alert('購物車已清空，庫存已還原。');
    }
  };

  // 開始編輯訂單
  const startEditOrder = (order) => {
    setEditingOrder(order.id);
    setEditingOrderData({
      ...order,
      customerName: order.customerName || '',
      customerPhone: order.customerPhone || '',
      customerEmail: order.customerEmail || '',
      items: [...order.items]
    });
  };

  // 取消編輯訂單
  const cancelEditOrder = () => {
    if (editingOrder && editingOrderData) {
      // 找到原始訂單數據
      const originalOrder = completedOrders.find(order => order.id === editingOrder);
      
      if (originalOrder) {
        // 計算需要還原的庫存
        const stockRestorations = new Map(); // productId -> quantity to restore
        
        // 1. 計算原始訂單中每個商品的數量
        const originalQuantities = new Map();
        originalOrder.items.forEach(item => {
          originalQuantities.set(item.productId, item.quantity);
        });
        
        // 2. 計算編輯中訂單的每個商品的數量
        const currentQuantities = new Map();
        editingOrderData.items.forEach(item => {
          currentQuantities.set(item.productId, item.quantity);
        });
        
        // 3. 計算需要還原的庫存
        // 還原在編輯過程中新增的商品
        for (const [productId, currentQty] of currentQuantities) {
          const originalQty = originalQuantities.get(productId) || 0;
          const stockToRestore = currentQty - originalQty; // 編輯過程中增加的數量
          if (stockToRestore > 0) {
            stockRestorations.set(productId, stockToRestore);
          }
        }
        
        // 4. 還原庫存
        setProducts(prev => prev.map(p => {
          const restoreQty = stockRestorations.get(p.id) || 0;
          return restoreQty > 0 
            ? { ...p, stock: p.stock + restoreQty }
            : p;
        }));
        
        console.log('已還原編輯過程中的庫存變更');
      }
    }
    
    setEditingOrder(null);
    setEditingOrderData(null);
  };

  // 更新編輯中訂單的客戶資訊
  const updateEditingOrderCustomer = (field, value) => {
    setEditingOrderData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 更新編輯中訂單的商品數量
  const updateEditingOrderItemQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) return;
    
    const currentItem = editingOrderData.items.find(item => item.productId === productId);
    if (!currentItem) return;
    
    const quantityDiff = newQuantity - currentItem.quantity;
    
    // 檢查庫存是否足夠（如果是增加數量）
    if (quantityDiff > 0) {
      const product = products.find(p => p.id === productId);
      if (product && product.stock < quantityDiff) {
        alert('庫存不足，無法增加更多數量');
        return;
      }
    }
    
    // 更新訂單數據
    setEditingOrderData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.productId === productId
          ? { ...item, quantity: newQuantity }
          : item
      ),
      totalAmount: prev.items
        .map(item =>
          item.productId === productId
            ? { ...item, quantity: newQuantity }
            : item
        )
        .reduce((total, item) => total + (item.quantity * item.price), 0)
    }));
    
    // 即時更新庫存：減去數量差異
    if (quantityDiff !== 0) {
      setProducts(prev => prev.map(p =>
        p.id === productId
          ? { ...p, stock: p.stock - quantityDiff }
          : p
      ));
    }
  };

  // 從編輯中的訂單移除商品
  const removeItemFromEditingOrder = (productId) => {
    // 記住當前滾動位置
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    
    const removedItem = editingOrderData.items.find(item => item.productId === productId);
    
    setEditingOrderData(prev => {
      const newItems = prev.items.filter(item => item.productId !== productId);
      return {
        ...prev,
        items: newItems,
        totalAmount: newItems.reduce((total, item) => total + (item.quantity * item.price), 0)
      };
    });

    // 即時還原庫存
    if (removedItem) {
      setProducts(prev => prev.map(p =>
        p.id === productId
          ? { ...p, stock: p.stock + removedItem.quantity }
          : p
      ));
    }
    
    // 還原滾動位置，防止頁面跳動
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollPosition);
    });
  };

  // 從編輯中的訂單移除商品 (別名函數，與 removeItemFromEditingOrder 功能相同)
  const removeFromEditingOrder = (productId) => {
    return removeItemFromEditingOrder(productId);
  };

  // 儲存編輯後的訂單
  const saveEditedOrder = async () => {
    if (editingOrderData.items.length === 0) {
      alert('訂單至少需要包含一個商品');
      return;
    }

    try {
      setLoading(true);
      
      // 找到原始訂單數據
      const originalOrder = completedOrders.find(order => order.id === editingOrder);
      if (!originalOrder) {
        alert('找不到原始訂單數據');
        return;
      }

      // 同步更新資料庫中的訂單資料
      try {
        const updateData = {
          customer_name: editingOrderData.customerName,
          customer_phone: editingOrderData.customerPhone,
          customer_email: editingOrderData.customerEmail,
          total_amount: editingOrderData.totalAmount,
          cost: editingOrderData.items.reduce((total, item) => total + ((item.cost || 0) * item.quantity), 0),
          status: editingOrderData.status,
          items: editingOrderData.items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
            cost: item.cost || 0,
            specs: item.specs || {}
          }))
        };
        
        await orderAPI.update(editingOrder, updateData);
        console.log(`訂單 #${editingOrder} 資料庫同步成功（包含商品明細）`);
      } catch (error) {
        console.error('更新資料庫訂單失敗:', error);
        alert(`更新資料庫訂單失敗: ${error.message}`);
        return;
      }

      // 更新訂單記錄
      setCompletedOrders(prev => prev.map(order =>
        order.id === editingOrder
          ? {
              ...editingOrderData,
              date: `${originalOrder.date.replace(/ \(已修改:.*\)/, '')} (已修改: ${new Date().toLocaleDateString('zh-TW', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit' 
              })})`
            }
          : order
      ));

      alert('訂單修改成功！');
      setEditingOrder(null);
      setEditingOrderData(null);
      
    } catch (error) {
      console.error('儲存訂單時發生錯誤:', error);
      alert(`儲存訂單失敗: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 更新編輯中訂單的商品價格
  const updateEditingOrderItemPrice = (productId, newPrice) => {
    setEditingOrderData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.productId === productId
          ? { ...item, price: parseFloat(newPrice) || 0 }
          : item
      ),
      total: prev.items.reduce((sum, item) => {
        const price = item.productId === productId ? (parseFloat(newPrice) || 0) : item.price;
        return sum + (item.quantity * price);
      }, 0)
    }));
  };

  // 更新編輯中訂單的商品規格
  const updateEditingOrderItemSpecs = (productId, newSpecs) => {
    setEditingOrderData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.productId === productId
          ? { ...item, specs: { ...newSpecs } }
          : item
      )
    }));
  };

  // 添加零件標籤到商品
  const addPartLabel = (productId, labelName, labelValue) => {
    if (!labelName.trim() || !labelValue.trim()) {
      alert('請輸入完整的標籤名稱和值');
      return;
    }

    setEditingOrderData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.productId === productId
          ? {
              ...item,
              partLabels: {
                ...item.partLabels,
                [labelName]: labelValue
              }
            }
          : item
      )
    }));
  };

  // 移除零件標籤
  const removePartLabel = (productId, labelName) => {
    setEditingOrderData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.productId === productId
          ? {
              ...item,
              partLabels: Object.fromEntries(
                Object.entries(item.partLabels || {}).filter(([key]) => key !== labelName)
              )
            }
          : item
      )
    }));
  };

  // 添加商品到編輯中的訂單
  const addProductToEditingOrder = (product) => {
    // 記住當前滾動位置
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    
    if (product.stock <= 0) {
      alert('庫存不足，無法加入訂單');
      return;
    }

    const existingItem = editingOrderData.items.find(item => item.productId === product.id);
    
    if (existingItem) {
      updateEditingOrderItemQuantity(product.id, existingItem.quantity + 1);
    } else {
      setEditingOrderData(prev => {
        const newItems = [...prev.items, {
          productId: product.id,
          productName: product.name,
          productCategory: product.category,
          quantity: 1,
          price: product.price,
          specs: { ...product.specs },
          partLabels: {} // 初始化零件標籤
        }];
        return {
          ...prev,
          items: newItems,
          totalAmount: newItems.reduce((total, item) => total + (item.quantity * item.price), 0)
        };
      });
    }

    // 即時扣除庫存
    setProducts(prev => prev.map(p =>
      p.id === product.id
        ? { ...p, stock: p.stock - 1 }
        : p
    ));
    
    // 還原滾動位置，防止頁面跳動
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollPosition);
    });
  };

  // 開啟添加商品到編輯訂單的彈窗
  const openAddProductModal = () => {
    setShowAddProductModal(true);
  };

  // 關閉添加商品彈窗
  const closeAddProductModal = () => {
    setShowAddProductModal(false);
  };

  // 開始編輯總金額
  const startTotalAmountEdit = (currentTotal) => {
    setShowTotalAmountEdit(true);
    setNewTotalAmount(currentTotal);
  };

  // 取消編輯總金額
  const cancelTotalAmountEdit = () => {
    setShowTotalAmountEdit(false);
    setNewTotalAmount(0);
  };

  // 確認修改總金額
  const confirmTotalAmountEdit = () => {
    const totalValue = parseFloat(newTotalAmount);
    if (isNaN(totalValue) || totalValue < 0) {
      alert('請輸入有效的金額');
      return;
    }

    setEditingOrderData(prev => ({
      ...prev,
      totalAmount: totalValue
    }));

    setShowTotalAmountEdit(false);
    setNewTotalAmount(0);
  };

  // 刪除訂單
  const deleteOrder = (orderId) => {
    if (window.confirm('確定要刪除這個訂單嗎？此操作無法復原。')) {
      // 如果訂單正在編輯中，先取消編輯
      if (editingOrder === orderId) {
        setEditingOrder(null);
        setEditingOrderData(null);
      }
      
      // 從訂單列表中移除（不還原庫存）
      setCompletedOrders(prev => prev.filter(order => order.id !== orderId));
      
      alert('訂單已成功刪除！');
    }
  };

  // 清除所有訂單記錄
  const clearAllOrders = () => {
    if (window.confirm('確定要清除所有訂單記錄嗎？此操作無法復原，所有商品庫存將會還原。')) {
      // 還原所有訂單的庫存
      completedOrders.forEach(order => {
        order.items.forEach(item => {
          setProducts(prev => prev.map(p =>
            p.id === item.productId
              ? { ...p, stock: p.stock + item.quantity }
              : p
          ));
        });
      });
      
      // 清除訂單記錄
      setCompletedOrders([]);
      // 立即清除localStorage中的數據
      localStorage.removeItem('completedOrders');
      
      // 取消任何正在編輯的訂單
      setEditingOrder(null);
      setEditingOrderData(null);
      
      alert('所有訂單記錄已清除，庫存已還原！');
    }
  };

  // 推送訂單到OrderSummaryPage並儲存到資料庫
  const pushOrderToSummary = async (order) => {
    try {
      setLoading(true);
      
      // 計算訂單總成本
      let totalCost = 0;
      const itemsWithCost = order.items.map(item => {
        // 基於產品資料計算單項成本
        const product = products.find(p => p.id === item.productId);
        let itemCost = 0;
        
        if (product && product.currentCost) {
          itemCost = product.currentCost * item.quantity;
        } else {
          // 如果沒有成本資料，估算為售價的70%
          itemCost = item.price * item.quantity * 0.7;
        }
        
        totalCost += itemCost;
        
        return {
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          cost: product && product.currentCost ? product.currentCost : (item.price * 0.7),
          specs: item.specs || {}
        };
      });

      // 準備資料庫訂單資料
      const dbOrderData = {
        customer_name: order.customerName || null,
        customer_phone: order.customerPhone || null,
        customer_email: order.customerEmail || null,
        total_amount: order.totalAmount,
        cost: Math.round(totalCost), // 訂單總成本
        status: '已收訂金',
        notes: '來自庫存頁面 - 已收取訂金',
        items: itemsWithCost
      };

      console.log('準備儲存訂單到資料庫:', dbOrderData);

      // 儲存到資料庫
      const dbResult = await orderAPI.create(dbOrderData);
      
      if (dbResult.success) {
        console.log('✅ 訂單已成功儲存到資料庫，ID:', dbResult.data.id);
        
        // 轉換訂單格式以符合OrderSummaryPage的需求
        const summaryOrder = {
          id: `ORD-${order.id}`,
          customer: order.customerName || '未提供',
          customerUrl: order.customerEmail ? `mailto:${order.customerEmail}` : '#',
          amount: order.totalAmount,
          status: '已收訂金',
          date: new Date().toISOString().split('T')[0], // 格式化為 YYYY-MM-DD
          cost: Math.round(totalCost), // 使用實際計算的成本
          notes: `來自庫存頁面 - 資料庫ID: ${dbResult.data.id}`,
          items: order.items,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          databaseId: dbResult.data.id // 記錄資料庫ID
        };

        // 使用localStorage來在頁面間傳遞數據
        const existingOrders = JSON.parse(localStorage.getItem('summaryOrders') || '[]');
        const updatedOrders = [summaryOrder, ...existingOrders];
        localStorage.setItem('summaryOrders', JSON.stringify(updatedOrders));

        // 更新本地訂單狀態為已收訂金
        setCompletedOrders(prev => prev.map(o => 
          o.id === order.id ? { 
            ...o, 
            status: '已收訂金',
            databaseId: dbResult.data.id 
          } : o
        ));

        alert(`✅ 訂單已成功收取訂金並儲存！\n資料庫訂單ID: ${dbResult.data.id}\n已推送到訂單總覽頁面`);
      } else {
        throw new Error(dbResult.message || '儲存訂單失敗');
      }
      
    } catch (error) {
      console.error('處理訂單收取訂金時發生錯誤:', error);
      alert(`❌ 收取訂金失敗: ${error.message}\n\n訂單未儲存到資料庫，請稍後重試`);
    } finally {
      setLoading(false);
    }
  };

  // 開始庫存調整
  const startStockAdjustment = (productId) => {
    setShowStockAdjustment(productId);
    setStockAdjustmentValue(0);
  };

  // 取消庫存調整
  const cancelStockAdjustment = () => {
    setShowStockAdjustment(null);
    setStockAdjustmentValue(0);
  };

  // 確認庫存調整
  const confirmStockAdjustment = async (productId) => {
    const adjustmentValue = parseInt(stockAdjustmentValue);
    if (isNaN(adjustmentValue) || adjustmentValue === 0) {
      alert('請輸入有效的調整數量');
      return;
    }

    try {
      setLoading(true);
      const product = products.find(p => p.id === productId);
      if (!product) {
        alert('找不到指定的產品');
        return;
      }

      // 使用 current_stock 欄位，若不存在則使用 stock
      const currentStock = product.current_stock !== undefined ? product.current_stock : product.stock;
      const newStock = Math.max(0, currentStock + adjustmentValue);
      
      console.log('庫存調整詳情:', {
        productId,
        productName: product.name,
        currentStock,
        adjustmentValue,
        newStock,
        reason: adjustmentValue > 0 ? '手動增加庫存' : '手動減少庫存'
      });
      
      // 調用API更新庫存
      const response = await productAPI.updateStock(
        productId, 
        newStock, 
        adjustmentValue > 0 ? '手動增加庫存' : '手動減少庫存'
      );

      console.log('庫存調整 API 響應:', response);

      // 檢查響應是否成功（根據不同的後端響應格式）
      const isSuccess = response.success !== false && !response.error;
      
      if (isSuccess) {
        // 更新本地狀態 - 同時更新 stock 和 current_stock
        setProducts(prev => prev.map(p => {
          if (p.id === productId) {
            return { 
              ...p, 
              stock: newStock,
              current_stock: newStock
            };
          }
          return p;
        }));

        const message = response.message || `庫存調整成功！${product.name} 庫存${adjustmentValue > 0 ? '增加' : '減少'}了 ${Math.abs(adjustmentValue)} 個`;
        alert(message);
        console.log('庫存調整成功:', message);
      } else {
        const errorMessage = response.message || response.error || '未知錯誤';
        alert(`庫存調整失敗: ${errorMessage}`);
        console.error('庫存調整失敗:', errorMessage);
      }
      
      setShowStockAdjustment(null);
      setStockAdjustmentValue(0);
    } catch (error) {
      console.error('庫存調整錯誤詳情:', {
        error: error.message,
        stack: error.stack,
        productId,
        adjustmentValue
      });
      alert(`庫存調整失敗: ${error.message || '網路錯誤，請檢查伺服器連線'}`);
    } finally {
      setLoading(false);
    }
  };

  // 開始價格編輯
  const startPriceEdit = (productId, currentPrice) => {
    setShowPriceEdit(productId);
    setNewPrice(currentPrice);
  };

  // 取消價格編輯
  const cancelPriceEdit = () => {
    setShowPriceEdit(null);
    setNewPrice(0);
  };

  // 切換商品卡片折疊狀態
  const toggleProductCollapse = (productId) => {
    setCollapsedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  // 確認價格修改
  const confirmPriceEdit = async (productId) => {
    const priceValue = parseInt(newPrice);
    if (isNaN(priceValue) || priceValue <= 0) {
      alert('請輸入有效的價格');
      return;
    }

    try {
      setLoading(true);
      const product = products.find(p => p.id === productId);
      if (!product) {
        alert('找不到指定的產品');
        return;
      }

      // 使用 current_price 欄位，若不存在則使用 price
      const oldPrice = product.current_price !== undefined ? product.current_price : product.price;
      
      console.log('價格更新詳情:', {
        productId,
        productName: product.name,
        oldPrice,
        newPrice: priceValue
      });
      
      // 調用API更新價格
      const response = await productAPI.updatePrice(
        productId, 
        priceValue,
        '手動價格調整'
      );

      console.log('價格更新 API 響應:', response);

      // 檢查響應是否成功（根據不同的後端響應格式）
      const isSuccess = response.success !== false && !response.error;

      if (isSuccess) {
        // 更新本地狀態 - 同時更新 price 和 current_price
        setProducts(prev => prev.map(p => {
          if (p.id === productId) {
            return { 
              ...p, 
              price: priceValue,
              current_price: priceValue
            };
          }
          return p;
        }));

        const message = response.message || `價格修改成功！${product.name} 從 NT$ ${oldPrice?.toLocaleString()} 修改為 NT$ ${priceValue.toLocaleString()}`;
        alert(message);
        console.log('價格更新成功:', message);
      } else {
        const errorMessage = response.message || response.error || '未知錯誤';
        alert(`價格修改失敗: ${errorMessage}`);
        console.error('價格修改失敗:', errorMessage);
      }
      
      setShowPriceEdit(null);
      setNewPrice(0);
    } catch (error) {
      console.error('價格修改錯誤詳情:', {
        error: error.message,
        stack: error.stack,
        productId,
        priceValue
      });
      alert(`價格修改失敗: ${error.message || '網路錯誤，請檢查伺服器連線'}`);
    } finally {
      setLoading(false);
    }
  };

  // 開始編輯商品數量
  const startQuantityEdit = (productId, currentQuantity) => {
    setShowQuantityEdit(productId);
    setNewQuantity(currentQuantity);
  };

  // 取消數量編輯
  const cancelQuantityEdit = () => {
    setShowQuantityEdit(null);
    setNewQuantity(0);
  };

  // 確認數量修改
  const confirmQuantityEdit = async (productId) => {
    const quantityValue = parseInt(newQuantity);
    if (isNaN(quantityValue) || quantityValue < 0) {
      alert('請輸入有效的數量（0或正數）');
      return;
    }

    try {
      setLoading(true);
      const product = products.find(p => p.id === productId);
      if (!product) {
        alert('找不到指定的產品');
        return;
      }

      // 使用 current_stock 欄位，若不存在則使用 stock
      const oldQuantity = product.current_stock !== undefined ? product.current_stock : product.stock;
      
      console.log('數量更新詳情:', {
        productId,
        productName: product.name,
        oldQuantity,
        newQuantity: quantityValue
      });
      
      // 調用API更新數量
      const response = await productAPI.updateQuantity(
        productId, 
        quantityValue,
        '手動數量調整'
      );

      console.log('數量更新 API 響應:', response);

      // 檢查響應是否成功（根據不同的後端響應格式）
      const isSuccess = response.success !== false && !response.error;

      if (isSuccess) {
        // 更新本地狀態 - 同時更新 stock 和 current_stock
        setProducts(prev => prev.map(p => {
          if (p.id === productId) {
            return { 
              ...p, 
              stock: quantityValue,
              current_stock: quantityValue
            };
          }
          return p;
        }));

        const message = response.message || `數量修改成功！${product.name} 從 ${oldQuantity} 修改為 ${quantityValue}`;
        alert(message);
        console.log('數量更新成功:', message);
      } else {
        const errorMessage = response.message || response.error || '未知錯誤';
        alert(`數量修改失敗: ${errorMessage}`);
        console.error('數量修改失敗:', errorMessage);
      }
      
      setShowQuantityEdit(null);
      setNewQuantity(0);
    } catch (error) {
      console.error('數量修改錯誤詳情:', {
        error: error.message,
        stack: error.stack,
        productId,
        quantityValue
      });
      alert(`數量修改失敗: ${error.message || '網路錯誤，請檢查伺服器連線'}`);
    } finally {
      setLoading(false);
    }
  };

  // 顯示刪除確認
  const showDeleteConfirmation = (productId, productName) => {
    setShowDeleteConfirm({ id: productId, name: productName });
  };

  // 取消刪除
  const cancelDelete = () => {
    setShowDeleteConfirm(null);
  };

  // 確認刪除商品
  const confirmDelete = async () => {
    if (!showDeleteConfirm) return;

    const { id: productId, name: productName } = showDeleteConfirm;

    try {
      setLoading(true);
      console.log(`開始刪除商品: ${productName} (ID: ${productId})`);
      
      const response = await productAPI.delete(productId);
      
      if (response.success !== false && !response.error) {
        // 從前端狀態中移除已刪除的商品
        setProducts(prev => prev.filter(p => p.id !== productId));
        console.log(`已刪除商品: ${productName}`);
        alert(`商品 "${productName}" 已成功刪除`);
        
        // 如果該商品在訂單中，也需要移除
        setOrderItems(prev => prev.filter(item => item.productId !== productId));
      } else {
        const errorMessage = response.message || response.error || '未知錯誤';
        throw new Error(errorMessage);
      }
      
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('刪除商品失敗:', error);
      
      let errorMessage = '刪除失敗：';
      
      if (error.message.includes('HTML') || error.message.includes('<!DOCTYPE')) {
        errorMessage += '伺服器未正常運行，請檢查伺服器狀態。';
      } else if (error.message.includes('HTTP 500')) {
        errorMessage += '伺服器內部錯誤，可能是資料庫問題。';
      } else if (error.message.includes('HTTP 404')) {
        errorMessage += '商品不存在或已被刪除。';
      } else if (error.message.includes('HTTP 400')) {
        errorMessage += '該商品可能正在使用中，無法刪除。';
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

  // 顯示訂單詳情彈出視窗
  const showOrderDetailsModal = (order) => {
    setShowOrderDetails(order);
  };

  // 關閉訂單詳情彈出視窗
  const closeOrderDetailsModal = () => {
    setShowOrderDetails(null);
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'CPU': '🔧',
      'cpu': '🔧',
      'processor': '🔧',
      'Processor': '🔧',
      'GPU': '🎮',
      'gpu': '🎮',
      'graphics': '🎮',
      'Graphics': '🎮',
      'Motherboard': '🔌',
      'motherboard': '🔌',
      'mainboard': '🔌',
      'RAM': '💾',
      'ram': '💾',
      'memory': '💾',
      'Memory': '💾',
      '記憶體': '💾',
      'SSD': '💽',
      'ssd': '💽',
      'HDD': '💿',
      'hdd': '💿',
      'PSU': '⚡',
      'psu': '⚡',
      'power': '⚡',
      'Power': '⚡',
      'Cooler': '❄️',
      'cooler': '❄️',
      'Case': '📦',
      'case': '📦'
    };
    
    // 如果找不到完全匹配，嘗試部分匹配
    const lowerCategory = category?.toLowerCase() || '';
    
    // 直接匹配
    if (icons[category]) return icons[category];
    
    // 智能匹配 CPU 相關
    if (lowerCategory.includes('cpu') || 
        lowerCategory.includes('processor') ||
        lowerCategory.includes('i3') ||
        lowerCategory.includes('i5') ||
        lowerCategory.includes('i7') ||
        lowerCategory.includes('i9') ||
        lowerCategory.includes('ryzen') ||
        lowerCategory.includes('amd')) {
      return '🔧';
    }
    
    // 智能匹配 GPU 相關
    if (lowerCategory.includes('gpu') ||
        lowerCategory.includes('graphics') ||
        lowerCategory.includes('rtx') ||
        lowerCategory.includes('gtx') ||
        lowerCategory.includes('radeon')) {
      return '🎮';
    }
    
    // 智能匹配記憶體相關
    if (lowerCategory.includes('ram') ||
        lowerCategory.includes('memory') ||
        lowerCategory.includes('記憶體') ||
        lowerCategory.includes('ddr') ||
        lowerCategory.includes('gskill') ||
        lowerCategory.includes('g.skill') ||
        lowerCategory.includes('corsair') ||
        lowerCategory.includes('kingston') ||
        lowerCategory.includes('crucial') ||
        lowerCategory.includes('hyperx') ||
        lowerCategory.includes('adata') ||
        lowerCategory.includes('teamgroup') ||
        (lowerCategory.includes('16g') && !lowerCategory.includes('ssd')) ||
        (lowerCategory.includes('32g') && !lowerCategory.includes('ssd')) ||
        (lowerCategory.includes('8g') && !lowerCategory.includes('ssd')) ||
        (lowerCategory.includes('4g') && !lowerCategory.includes('ssd')) ||
        lowerCategory.includes('dimm')) {
      return '💾';
    }
    
    return '🔧'; // 默認圖標
  };

  // 智能修正分類顯示
  const getCorrectCategory = (category, productName) => {
    const lowerCategory = category?.toLowerCase() || '';
    const lowerProductName = productName?.toLowerCase() || '';
    
    // 根據產品名稱智能判斷分類
    if (lowerProductName.includes('i3') ||
        lowerProductName.includes('i5') ||
        lowerProductName.includes('i7') ||
        lowerProductName.includes('i9') ||
        lowerProductName.includes('ryzen') ||
        lowerProductName.includes('cpu') ||
        lowerProductName.includes('processor')) {
      return 'CPU';
    }
    
    if (lowerProductName.includes('rtx') ||
        lowerProductName.includes('gtx') ||
        lowerProductName.includes('radeon') ||
        lowerProductName.includes('gpu')) {
      return 'GPU';
    }
    
    // 增強記憶體識別
    if (lowerProductName.includes('ddr') ||
        lowerProductName.includes('ram') ||
        lowerProductName.includes('記憶體') ||
        lowerProductName.includes('gskill') ||
        lowerProductName.includes('g.skill') ||
        lowerProductName.includes('corsair') ||
        lowerProductName.includes('kingston') ||
        lowerProductName.includes('crucial') ||
        lowerProductName.includes('hyperx') ||
        lowerProductName.includes('adata') ||
        lowerProductName.includes('teamgroup') ||
        lowerProductName.includes('memory') ||
        (lowerProductName.includes('16g') && !lowerProductName.includes('ssd')) ||
        (lowerProductName.includes('32g') && !lowerProductName.includes('ssd')) ||
        (lowerProductName.includes('8g') && !lowerProductName.includes('ssd')) ||
        (lowerProductName.includes('4g') && !lowerProductName.includes('ssd')) ||
        lowerProductName.includes('dimm')) {
      return 'RAM';
    }
    
    if (lowerProductName.includes('ssd')) {
      return 'SSD';
    }
    
    if (lowerProductName.includes('hdd')) {
      return 'HDD';
    }
    
    // 如果產品名稱無法判斷，返回原分類
    return category || '其他';
  };

  // 過濾產品根據選擇的分類
  const filteredProducts = selectedCategory === 'All' 
    ? products 
    : products.filter(product => product.category === selectedCategory);

  // 分頁計算
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // 當篩選條件變更時，重置到第一頁
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  // 分頁控制函數
  const goToPage = (page) => {
    setCurrentPage(page);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // 獲取每個分類的產品數量
  const getCategoryCount = (categoryId) => {
    if (categoryId === 'All') return products.length;
    return products.filter(product => product.category === categoryId).length;
  };

  // 日期篩選相關函數
  const parseOrderDate = (dateStr) => {
    try {
      // 處理格式如 "2024/01/15" 或 "2024/01/15 (已修改: 2024/01/16)"
      const baseDate = dateStr.split(' ')[0]; // 取得基本日期部分
      const [year, month, day] = baseDate.split('/').map(num => parseInt(num, 10));
      return new Date(year, month - 1, day); // month - 1 因為 JavaScript 的月份是 0-based
    } catch (error) {
      console.error('解析日期失敗:', dateStr, error);
      return new Date(); // 如果解析失敗，返回當前日期
    }
  };

  const isDateInRange = (orderDate, start, end) => {
    if (!start && !end) return true;
    
    const orderDateObj = parseOrderDate(orderDate);
    const startDateObj = start ? new Date(start) : null;
    const endDateObj = end ? new Date(end) : null;
    
    if (startDateObj && orderDateObj < startDateObj) return false;
    if (endDateObj && orderDateObj > endDateObj) return false;
    
    return true;
  };

  // 根據日期篩選訂單
  const filteredOrders = completedOrders.filter(order => 
    isDateInRange(order.date, startDate, endDate)
  );

  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  if (loading && products.length === 0) {
    return <div className="loading">載入中...</div>;
  }

  return (
    <div className="inventory-order-page">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>📦 庫存與下單整合</h1>
            <p>瀏覽庫存商品，選擇客戶並建立訂單</p>
          </div>
          {/* <button 
            onClick={testAPIConnection}
            className="test-api-btn"
            style={{
              padding: '8px 16px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔗 測試 API 連接
          </button> */}
        </div>
      </div>

      <div className="page-content">
        <div className="inventory-section">
          <div className="inventory-header">
            <h2>商品庫存</h2>
            <button
              onClick={() => setShowNewProductForm(!showNewProductForm)}
              className="add-product-btn"
            >
              {showNewProductForm ? '取消新增' : '➕ 新增產品'}
            </button>
          </div>

          {/* 分類選擇區域 */}
          <div className="category-filter">
            <label htmlFor="category-select" className="category-label">商品分類：</label>
            <select
              id="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-select"
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name} ({getCategoryCount(category.id)})
                </option>
              ))}
            </select>
          </div>

          {showNewProductForm && (
            <div className="new-product-form">
              <h3>新增庫存產品</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>產品名稱</label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="請輸入產品名稱"
                  />
                </div>
                <div className="form-group">
                  <label>類別</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="CPU">CPU</option>
                    <option value="GPU">GPU</option>
                    <option value="Motherboard">主機板</option>
                    <option value="RAM">記憶體</option>
                    <option value="SSD">固態硬碟</option>
                    <option value="HDD">傳統硬碟</option>
                    <option value="PSU">電源供應器</option>
                    <option value="Cooler">散熱器</option>
                    <option value="Case">機殼</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>庫存數量</label>
                  <input
                    type="number"
                    min="0"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, stock: e.target.value }))}
                    placeholder="庫存數量"
                  />
                </div>
                <div className="form-group">
                  <label>價格 (NT$)</label>
                  <input
                    type="number"
                    min="0"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="產品價格"
                  />
                </div>
              </div>
              
              <div className="specs-section">
                <h4>產品規格</h4>
                <div className="spec-input-row">
                  <input
                    type="text"
                    value={newSpecKey}
                    onChange={(e) => setNewSpecKey(e.target.value)}
                    placeholder="規格名稱 (如: socket)"
                  />
                  <input
                    type="text"
                    value={newSpecValue}
                    onChange={(e) => setNewSpecValue(e.target.value)}
                    placeholder="規格值 (如: LGA1700)"
                  />
                  <button onClick={addSpecToNewProduct} className="add-spec-btn">新增規格</button>
                </div>
                
                {Object.entries(newProduct.specs).length > 0 && (
                  <div className="current-specs">
                    <h5>目前規格:</h5>
                    {Object.entries(newProduct.specs).map(([key, value]) => (
                      <div key={key} className="spec-item">
                        <span>{key}: {value}</span>
                        <button
                          onClick={() => removeSpecFromNewProduct(key)}
                          className="remove-spec-btn"
                        >
                          ❌
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="form-actions">
                <button onClick={addNewProduct} className="save-product-btn">
                  💾 儲存產品
                </button>
                <button 
                  onClick={() => setShowNewProductForm(false)} 
                  className="cancel-btn"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          <div className="products-table-container">
            {filteredProducts.length === 0 ? (
              <div className="no-products">
                {selectedCategory === 'All' ? '暫無商品' : `${categories.find(c => c.id === selectedCategory)?.name} 分類暫無商品`}
              </div>
            ) : (
              <>
                <table className="products-table">
                  <thead>
                    <tr>
                      <th>分類</th>
                      <th>商品名稱</th>
                      <th>價格</th>
                      <th>庫存</th>
                      <th>規格</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.map(product => {
                    const isCollapsed = collapsedProducts.has(product.id);
                    const isLowStock = product.stock < 5;
                    const isOutOfStock = product.stock === 0;
                    
                    return (
                      <React.Fragment key={product.id}>
                        <tr className={`product-row ${isLowStock ? 'low-stock' : ''} ${isOutOfStock ? 'out-of-stock' : ''}`}>
                          <td className="category-cell">
                            <div className="category-info">
                              <span className="category-icon">{getCategoryIcon(product.category)}</span>
                              <span className="category-label">{product.category}</span>
                            </div>
                          </td>
                          
                          <td className="name-cell">
                            <div className="name-info">
                              <span className="product-name">{product.name}</span>
                              <div className="status-indicators">
                                {isLowStock && !isOutOfStock && (
                                  <span className="low-stock-indicator">⚠️ 庫存不足</span>
                                )}
                                {isOutOfStock && (
                                  <span className="out-of-stock-indicator">❌ 缺貨</span>
                                )}
                              </div>
                            </div>
                          </td>
                          
                          <td className="price-cell">
                            {showPriceEdit === product.id ? (
                              <div className="price-edit">
                                <input
                                  type="number"
                                  min="1"
                                  value={newPrice}
                                  onChange={(e) => setNewPrice(e.target.value)}
                                  className="price-input"
                                  placeholder="新價格"
                                />
                                <div className="price-edit-actions">
                                  <button
                                    onClick={() => confirmPriceEdit(product.id)}
                                    className="confirm-price-btn"
                                    title="確認修改"
                                  >
                                    ✅
                                  </button>
                                  <button
                                    onClick={cancelPriceEdit}
                                    className="cancel-price-btn"
                                    title="取消修改"
                                  >
                                    ❌
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="price-display">
                                <span>NT$ {product.price.toLocaleString()}</span>
                                <button
                                  onClick={() => startPriceEdit(product.id, product.price)}
                                  className="edit-price-btn"
                                  title="編輯價格"
                                >
                                  ✏️
                                </button>
                              </div>
                            )}
                          </td>
                          
                          <td className="stock-cell">
                            {showQuantityEdit === product.id ? (
                              <div className="quantity-edit">
                                <input
                                  type="number"
                                  min="0"
                                  value={newQuantity}
                                  onChange={(e) => setNewQuantity(e.target.value)}
                                  className="quantity-input"
                                  placeholder="新數量"
                                />
                                <div className="quantity-edit-actions">
                                  <button
                                    onClick={() => confirmQuantityEdit(product.id)}
                                    className="confirm-quantity-btn"
                                    title="確認修改"
                                  >
                                    ✅
                                  </button>
                                  <button
                                    onClick={cancelQuantityEdit}
                                    className="cancel-quantity-btn"
                                    title="取消修改"
                                  >
                                    ❌
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="stock-display">
                                <span className={`stock-number ${product.stock < 5 ? 'low' : ''}`}>
                                  {product.stock}
                                </span>
                                <button
                                  onClick={() => startQuantityEdit(product.id, product.stock)}
                                  className="edit-quantity-btn"
                                  title="編輯數量"
                                >
                                  ✏️
                                </button>
                              </div>
                            )}
                          </td>
                          
                          <td className="specs-cell">
                            <div className="product-specs">
                              {Object.entries(product.specs).length > 0 ? (
                                <div className="specs-summary">
                                  {Object.entries(product.specs).slice(0, 2).map(([key, value]) => (
                                    <span key={key} className="spec-item">
                                      {key}: {value}
                                    </span>
                                  ))}
                                  {Object.keys(product.specs).length > 2 && (
                                    <button
                                      onClick={() => toggleProductCollapse(product.id)}
                                      className="toggle-specs-btn"
                                      title={isCollapsed ? "展開所有規格" : "收合規格"}
                                    >
                                      {isCollapsed ? `+${Object.keys(product.specs).length - 2} 更多` : '收合'}
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="no-specs">無規格</span>
                              )}
                            </div>
                          </td>
                          
                          <td className="actions-cell">
                            <div className="product-actions">
                              <button
                                onClick={() => addToOrder(product)}
                                className="addorder-product-btn"
                                disabled={product.stock === 0}
                                title="加入訂單"
                              >
                                {product.stock === 0 ? '缺貨' : '➕'}
                              </button>
                              
                              <button
                                onClick={() => showDeleteConfirmation(product.id, product.name)}
                                className="delete-product-btn"
                                title="刪除商品"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                        
                        {!isCollapsed && Object.keys(product.specs).length > 2 && (
                          <tr className="specs-expanded-row">
                            <td colSpan="6">
                              <div className="all-specs">
                                <strong>完整規格：</strong>
                                {Object.entries(product.specs).map(([key, value]) => (
                                  <span key={key} className="spec-item">
                                    {key}: {value}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                        
                        {showStockAdjustment === product.id && (
                          <tr className="adjustment-row">
                            <td colSpan="6">
                              <div className="stock-adjustment-panel">
                                <h4>調整庫存</h4>
                                <div className="adjustment-info">
                                  <span>目前庫存: {product.stock}</span>
                                </div>
                                <div className="adjustment-input">
                                  <label>調整數量 (正數增加，負數減少):</label>
                                  <input
                                    type="number"
                                    value={stockAdjustmentValue}
                                    onChange={(e) => setStockAdjustmentValue(e.target.value)}
                                    placeholder="輸入調整數量"
                                    className="adjustment-value-input"
                                  />
                                </div>
                                <div className="adjustment-preview">
                                  調整後庫存: {Math.max(0, product.stock + parseInt(stockAdjustmentValue || 0))}
                                </div>
                                <div className="adjustment-actions">
                                  <button
                                    onClick={() => confirmStockAdjustment(product.id)}
                                    className="confirm-adjustment-btn"
                                  >
                                    ✅ 確認調整
                                  </button>
                                  <button
                                    onClick={cancelStockAdjustment}
                                    className="cancel-adjustment-btn"
                                  >
                                    ❌ 取消
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              
              {/* 分頁控制器 */}
              {totalPages > 1 && (
                <div className="pagination-container">
                  <div className="pagination-info">
                    <span>第 {currentPage} 頁，共 {totalPages} 頁</span>
                    <span>顯示 {filteredProducts.length} 個商品中的 {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} 個</span>
                  </div>
                  <div className="pagination-controls">
                    <button 
                      className="pagination-btn" 
                      onClick={goToPreviousPage} 
                      disabled={currentPage === 1}
                    >
                      ◀ 上一頁
                    </button>
                    
                    <div className="pagination-numbers">
                      {Array.from({ length: totalPages }, (_, index) => index + 1).map(page => (
                        <button
                          key={page}
                          className={`pagination-number ${page === currentPage ? 'active' : ''}`}
                          onClick={() => goToPage(page)}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    
                    <button 
                      className="pagination-btn" 
                      onClick={goToNextPage} 
                      disabled={currentPage === totalPages}
                    >
                      下一頁 ▶
                    </button>
                  </div>
                </div>
              )}
            </>
            )}
          </div>
        </div>

        <div className="order-section">
          <h2>建立訂單</h2>
          
          {/* 客戶資訊選擇 */}
          <div className="customer-section">
            <h3>客戶資訊 (選填)</h3>
            <div className="customer-selection">
              <div className="form-group">
                <label>選擇現有客戶</label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                >
                  <option value="">-- 請選擇客戶 --</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.phone})
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}
                className="toggle-customer-form-btn"
              >
                {showNewCustomerForm ? '取消新增客戶' : '+ 新增客戶'}
              </button>
            </div>

            {showNewCustomerForm && (
              <div className="new-customer-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>客戶姓名</label>
                    <input
                      type="text"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="請輸入客戶姓名"
                    />
                  </div>
                  <div className="form-group">
                    <label>客戶電話</label>
                    <input
                      type="text"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="請輸入客戶電話"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>客戶Email (選填)</label>
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="請輸入客戶Email"
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* 訂單項目 */}
          <div className="order-items-section">
            <h3>訂單項目</h3>
            {orderItems.length === 0 ? (
              <div className="no-items">尚未新增任何商品到訂單</div>
            ) : (
              <div className="order-items-list">
                {orderItems.map(item => (
                  <div key={item.productId} className="order-item">
                    <div className="item-info">
                      <div className="item-header">
                        <span className="category-icon">{getCategoryIcon(item.productCategory)}</span>
                        <span className="category-label">{item.productCategory}</span>
                        <h4>{item.productName}</h4>
                      </div>
                      <div className="item-controls">
                        <div className="quantity-control">
                          <label>數量</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateOrderItem(item.productId, 'quantity', parseInt(e.target.value))}
                          />
                        </div>
                        <div className="price-display">
                          <span>單價: NT$ {item.price.toLocaleString()}</span>
                          <span>小計: NT$ {(item.quantity * item.price).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="specs-customization">
                        <h5>規格設定</h5>
                        {Object.entries(item.specs).map(([key, value]) => (
                          <div key={key} className="spec-input">
                            <label>{key}</label>
                            <input
                              type="text"
                              value={value}
                              onChange={(e) => updateItemSpecs(item.productId, key, e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromOrder(item.productId)}
                      className="remove-item-btn"
                    >
                      移除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 訂單總計 */}
          {orderItems.length > 0 && (
            <div className="order-summary">
              <div className="total-amount">
                <strong>總金額: NT$ {calculateTotal().toLocaleString()}</strong>
              </div>
              <div className="order-actions">
                <button
                  onClick={clearOrderItems}
                  className="clear-cart-btn"
                >
                  清空購物車
                </button>
                <button
                  onClick={handleSubmitOrder}
                  disabled={loading}
                  className="submit-order-btn"
                >
                  {loading ? '建立中...' : '建立訂單'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 訂單記錄區域 */}
        <div className="order-history-section">
          <div className="order-history-header">
            <h2>📋 訂單記錄</h2>
            <div className="order-history-actions">
              <div className="date-filter-section">
                <button
                  onClick={() => setShowDateFilter(!showDateFilter)}
                  className="date-filter-toggle"
                >
                  📅 日期篩選
                </button>
                {showDateFilter && (
                  <div className="date-filter-controls">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      placeholder="開始日期"
                      className="date-input"
                    />
                    <span className="date-separator">至</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      placeholder="結束日期"
                      className="date-input"
                    />
                    <button
                      onClick={clearDateFilter}
                      className="clear-filter-btn"
                      title="清除篩選"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              <span className="order-count">
                {startDate || endDate ? 
                  `篩選結果: ${filteredOrders.length} / 總計: ${completedOrders.length} 筆訂單` : 
                  `共 ${completedOrders.length} 筆訂單`
                }
              </span>
            </div>
          </div>
          
          {completedOrders.length === 0 ? (
            <div className="no-orders">
              <p>尚未有任何訂單記錄</p>
              <small>建立訂單後，記錄將會自動保存並顯示在這裡</small>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="no-orders">
              <p>沒有符合篩選條件的訂單</p>
              <small>請調整日期範圍或清除篩選條件</small>
            </div>
          ) : (
            <div className="orders-table-container">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>詳情</th>
                    <th>訂單編號</th>
                    <th>建立時間</th>
                    <th>客戶資訊</th>
                    <th>商品明細</th>
                    <th>總金額</th>
                    <th>狀態</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(order => (
                    <tr key={order.id}>
                      <td className="details-cell">
                        <button
                          onClick={() => showOrderDetailsModal(order)}
                          className="details-btn"
                          title="查看商品明細"
                        >
                          📋
                        </button>
                      </td>
                      <td className="order-id">#{order.id}</td>
                      <td className="order-date">{order.date}</td>
                      <td className="order-customer">
                        {editingOrder === order.id ? (
                          <div className="editing-customer-info">
                            <input
                              type="text"
                              value={editingOrderData.customerName}
                              onChange={(e) => updateEditingOrderCustomer('customerName', e.target.value)}
                              placeholder="客戶姓名"
                              className="small-input"
                            />
                            <input
                              type="text"
                              value={editingOrderData.customerPhone}
                              onChange={(e) => updateEditingOrderCustomer('customerPhone', e.target.value)}
                              placeholder="客戶電話"
                              className="small-input"
                            />
                            <input
                              type="email"
                              value={editingOrderData.customerEmail}
                              onChange={(e) => updateEditingOrderCustomer('customerEmail', e.target.value)}
                              placeholder="客戶Email"
                              className="small-input"
                            />
                          </div>
                        ) : (
                          <div className="customer-info">
                            {order.customerName && (
                              <div className="customer-name">👤 {order.customerName}</div>
                            )}
                            {order.customerPhone && (
                              <div className="customer-phone">📞 {order.customerPhone}</div>
                            )}
                            {order.customerEmail && (
                              <div className="customer-email">📧 {order.customerEmail}</div>
                            )}
                            {!order.customerName && !order.customerPhone && !order.customerEmail && (
                              <span className="no-customer">未提供客戶資訊</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="order-items">
                        {editingOrder === order.id ? (
                          <div className="editing-items-list">
                            {editingOrderData.items.map((item, index) => (
                              <div key={index} className="editing-item-card">
                                <div className="item-info">
                                  <span className="category-icon">{getCategoryIcon(item.productCategory)}</span>
                                  <span className="item-name">{item.productName}</span>
                                  <span className="item-quantity">x{item.quantity}</span>
                                  <span className="item-price">NT$ {item.price}</span>
                                </div>
                                
                                {/* 商品規格顯示和編輯 */}
                                {Object.keys(item.specs || {}).length > 0 && (
                                  <div className="item-specs-inline">
                                    <small>規格: </small>
                                    <div className="specs-inline-list">
                                      {Object.entries(item.specs).map(([key, value]) => (
                                        <div key={key} className="spec-inline-item">
                                          <span className="spec-inline-tag">
                                            {key}: {value}
                                          </span>
                                          <button
                                            onClick={() => {
                                              const newSpecs = { ...item.specs };
                                              delete newSpecs[key];
                                              updateEditingOrderItemSpecs(item.productId, newSpecs);
                                            }}
                                            className="remove-spec-inline-btn"
                                            title="移除此規格"
                                          >
                                            ❌
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                <div className="item-actions">
                                  {
                                  <button
                                    onClick={() => removeFromEditingOrder(item.productId)}
                                    className="edit-item-btn"
                                    title="移除商品"
                                  >
                                    ❌
                                  </button>
                                  }
                                </div>
                                {Object.keys(item.partLabels || {}).length > 0 && (
                                  <div className="item-part-labels-preview">
                                    <small>標籤: </small>
                                    {Object.entries(item.partLabels).slice(0, 2).map(([name, value]) => (
                                      <span key={name} className="part-label-preview">
                                        {name}: {value}
                                      </span>
                                    ))}
                                    {Object.keys(item.partLabels).length > 2 && (
                                      <span className="more-labels">+{Object.keys(item.partLabels).length - 2}個</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                            
                            {/* 添加商品按鈕 */}
                            <div className="add-product-to-order-section">
                              <button
                                onClick={openAddProductModal}
                                className="add-product-to-order-btn"
                                title="從庫存添加商品"
                              >
                                ➕ 從庫存添加商品
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="items-summary">
                            {order.items.map((item, index) => (
                              <div key={index} className="item-summary">
                                <div className="item-summary-header">
                                  <span className="category-icon">{getCategoryIcon(item.productCategory)}</span>
                                  <span className="item-summary-name">{item.productName}</span>
                                  <span className="item-summary-quantity">x{item.quantity}</span>
                                </div>
                                {Object.keys(item.specs || {}).length > 0 && (
                                  <div className="item-summary-specs">
                                    {Object.entries(item.specs).slice(0, 2).map(([key, value]) => (
                                      <span key={key} className="spec-summary-tag">
                                        {key}: {value}
                                      </span>
                                    ))}
                                    {Object.keys(item.specs).length > 2 && (
                                      <span className="spec-summary-more">
                                        +{Object.keys(item.specs).length - 2} 更多
                                      </span>
                                    )}
                                  </div>
                                )}
                                {Object.keys(item.partLabels || {}).length > 0 && (
                                  <div className="item-part-labels-preview">
                                    <small>標籤: </small>
                                    {Object.entries(item.partLabels).slice(0, 2).map(([name, value]) => (
                                      <span key={name} className="part-label-preview">
                                        {name}: {value}
                                      </span>
                                    ))}
                                    {Object.keys(item.partLabels).length > 2 && (
                                      <span className="more-labels">+{Object.keys(item.partLabels).length - 2}個</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="order-total">
                        {editingOrder === order.id && showTotalAmountEdit ? (
                          <div className="total-amount-edit">
                            <input
                              type="number"
                              min="0"
                              value={newTotalAmount}
                              onChange={(e) => setNewTotalAmount(e.target.value)}
                              className="total-amount-input"
                              placeholder="新總金額"
                            />
                            <div className="total-amount-edit-actions">
                              <button
                                onClick={confirmTotalAmountEdit}
                                className="confirm-total-btn"
                                title="確認修改總金額"
                              >
                                ✅
                              </button>
                              <button
                                onClick={cancelTotalAmountEdit}
                                className="cancel-total-btn"
                                title="取消修改"
                              >
                                ❌
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="total-amount-display">
                            <strong>NT$ {(editingOrder === order.id ? editingOrderData.totalAmount : order.totalAmount).toLocaleString()}</strong>
                            {editingOrder === order.id && (
                              <button
                                onClick={() => startTotalAmountEdit(editingOrderData.totalAmount)}
                                className="edit-total-btn"
                                title="編輯總金額"
                              >
                                ✏️
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="order-status">
                        <span className={`status-badge ${order.status === '已收訂金' ? 'completed' : 'pending'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="order-actions">
                        {editingOrder === order.id ? (
                          <div className="editing-actions">
                            <button
                              onClick={saveEditedOrder}
                              className="save-btn"
                              title="儲存變更"
                            >
                              💾 儲存
                            </button>
                            <button
                              onClick={cancelEditOrder}
                              className="cancel-btn"
                              title="取消編輯"
                            >
                              ❌ 取消
                            </button>
                          </div>
                        ) : (
                          <div className="order-actions-group">
                            <button
                              onClick={() => startEditOrder(order)}
                              className="edit-btn"
                              title="編輯訂單"
                            >
                              ✏️ 編輯
                            </button>
                            <button
                              onClick={() => pushOrderToSummary(order)}
                              className={`push-btn ${order.status === '已收訂金' ? 'disabled' : ''}`}
                              title={order.status === '待收訂金' ? "收取訂金並推送" : "已推送至總覽"}
                              disabled={order.status === '已收訂金'}
                            >
                              {order.status === '待收訂金' ? '� 收取訂金' : '✅ 已收訂金'}
                            </button>
                            <button
                              onClick={() => deleteOrder(order.id)}
                              className="delete-btn"
                              title="刪除訂單"
                            >
                              🗑️ 刪除
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

      {/* 訂單詳情彈出視窗 */}
      {showOrderDetails && (
        <div className="modal-overlay" onClick={closeOrderDetailsModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>訂單詳情 - #{showOrderDetails.id}</h3>
              <button className="close-btn" onClick={closeOrderDetailsModal}>
                ❌
              </button>
            </div>
            <div className="modal-body">
              <div className="order-info-section">
                <h4>訂單資訊</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <label>建立時間:</label>
                    <span>{showOrderDetails.date}</span>
                  </div>
                  <div className="info-item">
                    <label>訂單狀態:</label>
                    <span className={`status-badge ${showOrderDetails.status === '已收訂金' ? 'completed' : 'pending'}`}>
                      {showOrderDetails.status}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>總金額:</label>
                    <span className="total-amount">NT$ {showOrderDetails.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="customer-info-section">
                <h4>客戶資訊</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <label>客戶姓名:</label>
                    <span>{showOrderDetails.customerName || '未提供'}</span>
                  </div>
                  <div className="info-item">
                    <label>聯絡電話:</label>
                    <span>{showOrderDetails.customerPhone || '未提供'}</span>
                  </div>
                  <div className="info-item">
                    <label>電子郵件:</label>
                    <span>{showOrderDetails.customerEmail || '未提供'}</span>
                  </div>
                </div>
              </div>

              <div className="items-info-section">
                <h4>商品明細</h4>
                <div className="items-detail-list">
                  {showOrderDetails.items.map((item, index) => (
                    <div key={index} className="item-detail-card">
                      <div className="item-header">
                        <div className="category-section">
                          <span className="category-icon">{getCategoryIcon(getCorrectCategory(item.productCategory, item.productName))}</span>
                          <span className="category-badge">{getCorrectCategory(item.productCategory, item.productName)}</span>
                        </div>
                        <h5 className="item-name">{item.productName}</h5>
                      </div>
                      <div className="item-details">
                        <div className="item-basic-info">
                          <div className="item-quantity">
                            <label>數量:</label>
                            <span>x{item.quantity}</span>
                          </div>
                          {/* <div className="item-category-detail">
                            <label>🏷️ 分類:</label>
                            <span className="category-detail-text">
                              {getCategoryIcon(getCorrectCategory(item.productCategory, item.productName))} {getCorrectCategory(item.productCategory, item.productName)}
                            </span>
                          </div> */}
                        </div>
                        {/* <div className="item-price">
                          <label>單價:</label>
                          <span>NT$ {item.price.toLocaleString()}</span>
                        </div>
                        <div className="item-subtotal">
                          <label>小計:</label>
                          <span>NT$ {(item.quantity * item.price).toLocaleString()}</span>
                        </div> */}
                      </div>
                      {Object.keys(item.specs || {}).length > 0 && (
                        <div className="item-specs">
                          <label>商品規格:</label>
                          <div className="specs-list">
                            {Object.entries(item.specs).map(([key, value]) => (
                              <span key={key} className="spec-tag">
                                {key}: {value}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {Object.keys(item.partLabels || {}).length > 0 && (
                        <div className="item-part-labels">
                          <label>🏷️ 零件標籤:</label>
                          <div className="part-labels-list">
                            {Object.entries(item.partLabels).map(([labelName, labelValue]) => (
                              <div key={labelName} className="part-label-badge">
                                <span className="label-name-badge">{labelName}</span>
                                <span className="label-value-badge">{labelValue}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 商品編輯彈出視窗 */}
      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="modal-content item-editing-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>編輯商品明細 - {editingItem.productName}</h3>
              <button className="close-btn" onClick={() => setEditingItem(null)}>✖️</button>
            </div>
            
            <div className="item-editing-content">
              {/* 基本資訊編輯 */}
              <div className="editing-section">
                <h4>基本資訊</h4>
                <div className="info-row">
                  <div className="info-group">
                    <label>商品分類:</label>
                    <span className="category-display">
                      <span className="category-icon">{getCategoryIcon(editingItem.productCategory)}</span>
                      {editingItem.productCategory}
                    </span>
                  </div>
                  <div className="info-group">
                    <label>數量:</label>
                    <input
                      type="number"
                      value={editingItem.quantity}
                      onChange={(e) => updateEditingOrderItemQuantity(editingItem.productId, parseInt(e.target.value) || 0)}
                      min="1"
                      className="quantity-input"
                    />
                  </div>
                  <div className="info-group">
                    <label>單價 (NT$):</label>
                    <input
                      type="number"
                      value={editingItem.price}
                      onChange={(e) => updateEditingOrderItemPrice(editingItem.productId, parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className="price-input"
                    />
                  </div>
                </div>
                <div className="subtotal-display">
                  小計: NT$ {(editingItem.quantity * editingItem.price).toLocaleString()}
                </div>
              </div>

              {/* 商品規格編輯 */}
              <div className="editing-section">
                <div className="specs-header">
                  <h4>商品規格</h4>
                  {Object.keys(editingItem.specs || {}).length > 0 && (
                    <button
                      onClick={() => {
                        if (window.confirm('確定要清除所有商品規格嗎？此操作無法復原。')) {
                          updateEditingOrderItemSpecs(editingItem.productId, {});
                        }
                      }}
                      className="clear-all-specs-btn"
                      title="清除所有規格"
                    >
                      🗑️ 清除所有規格
                    </button>
                  )}
                </div>
                <div className="specs-editing">
                  {Object.entries(editingItem.specs || {}).map(([key, value]) => (
                    <div key={key} className="spec-edit-row">
                      <label>{key}:</label>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => {
                          const newSpecs = { ...editingItem.specs, [key]: e.target.value };
                          updateEditingOrderItemSpecs(editingItem.productId, newSpecs);
                        }}
                        className="spec-input"
                      />
                      <button
                        onClick={() => {
                          const newSpecs = { ...editingItem.specs };
                          delete newSpecs[key];
                          updateEditingOrderItemSpecs(editingItem.productId, newSpecs);
                        }}
                        className="remove-spec-btn"
                        title="刪除此規格"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                  
                  {/* 新增規格功能 */}
                  <div className="add-spec-section">
                    <h5>新增電腦規格</h5>
                    <div className="add-spec-row">
                      <input
                        type="text"
                        value={newSpecKey}
                        onChange={(e) => setNewSpecKey(e.target.value)}
                        placeholder="規格名稱 (例: CPU型號, 記憶體容量)"
                        className="new-spec-key-input"
                      />
                      <input
                        type="text"
                        value={newSpecValue}
                        onChange={(e) => setNewSpecValue(e.target.value)}
                        placeholder="規格值 (例: Intel i7-13700K, 32GB)"
                        className="new-spec-value-input"
                      />
                      <button
                        onClick={() => {
                          if (newSpecKey.trim() && newSpecValue.trim()) {
                            const newSpecs = { 
                              ...editingItem.specs, 
                              [newSpecKey.trim()]: newSpecValue.trim() 
                            };
                            updateEditingOrderItemSpecs(editingItem.productId, newSpecs);
                            setNewSpecKey('');
                            setNewSpecValue('');
                          } else {
                            alert('請輸入規格名稱和規格值');
                          }
                        }}
                        className="add-spec-btn"
                      >
                        ➕ 新增規格
                      </button>
                    </div>
                    
                    {/* 常用電腦規格快速按鈕 */}
                    <div className="quick-specs">
                      <p>常用規格快速添加：</p>
                      <div className="quick-spec-buttons">
                        {[
                          { name: 'CPU', placeholder: 'Intel i7-13700K' },
                          { name: 'GPU', placeholder: 'RTX 4070' },
                          { name: '記憶體', placeholder: '32GB DDR5' },
                          { name: '儲存', placeholder: '1TB NVMe SSD' },
                          { name: '主機板', placeholder: 'ASUS ROG B650E' },
                          { name: '電源', placeholder: '850W 80+ Gold' }
                        ].map(spec => (
                          <button
                            key={spec.name}
                            onClick={() => {
                              setNewSpecKey(spec.name);
                              setNewSpecValue(spec.placeholder);
                            }}
                            className="quick-spec-btn"
                            type="button"
                          >
                            {spec.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 零件標籤編輯 */}
              <div className="editing-section">
                <h4>零件標籤</h4>
                <div className="part-labels-editing">
                  {Object.entries(editingItem.partLabels || {}).map(([labelName, labelValue]) => (
                    <div key={labelName} className="part-label-edit-row">
                      <div className="label-display">
                        <span className="label-name-display">{labelName}:</span>
                        <input
                          type="text"
                          value={labelValue}
                          onChange={(e) => addPartLabel(editingItem.productId, labelName, e.target.value)}
                          className="label-value-input"
                          placeholder="標籤值"
                        />
                        <button
                          onClick={() => removePartLabel(editingItem.productId, labelName)}
                          className="remove-label-btn"
                          title="刪除此標籤"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {/* 新增零件標籤 */}
                  <div className="add-part-label">
                    <input
                      type="text"
                      value={newPartLabelName}
                      onChange={(e) => setNewPartLabelName(e.target.value)}
                      placeholder="標籤名稱 (例: 序號, 批次)"
                      className="new-label-name-input"
                    />
                    <input
                      type="text"
                      value={newPartLabelValue}
                      onChange={(e) => setNewPartLabelValue(e.target.value)}
                      placeholder="標籤值"
                      className="new-label-value-input"
                    />
                    <button
                      onClick={() => {
                        if (newPartLabelName.trim() && newPartLabelValue.trim()) {
                          addPartLabel(editingItem.productId, newPartLabelName.trim(), newPartLabelValue.trim());
                          setNewPartLabelName('');
                          setNewPartLabelValue('');
                        } else {
                          alert('請輸入標籤名稱和標籤值');
                        }
                      }}
                      className="add-label-btn"
                    >
                      ➕ 新增標籤
                    </button>
                  </div>
                </div>
              </div>

              {/* 操作按鈕 */}
              <div className="editing-actions">
                <button
                  onClick={() => setEditingItem(null)}
                  className="confirm-edit-btn"
                >
                  ✅ 完成編輯
                </button>
                <button
                  onClick={() => {
                    removeFromEditingOrder(editingItem.productId);
                    setEditingItem(null);
                  }}
                  className="remove-item-btn"
                >
                  🗑️ 移除商品
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 刪除商品確認對話框 */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ 確認刪除商品</h3>
              <button className="close-btn" onClick={cancelDelete}>
                ❌
              </button>
            </div>
            <div className="modal-body">
              <div className="delete-warning">
                <p>您確定要刪除商品 <strong>"{showDeleteConfirm.name}"</strong> 嗎？</p>
                <div className="warning-notice">
                  <p>⚠️ <strong>警告：</strong></p>
                  <ul>
                    <li>此操作無法撤銷</li>
                    <li>商品將從庫存中永久移除</li>
                    <li>如果該商品已在訂單中，將自動從訂單中移除</li>
                    <li>相關的庫存調整記錄將保留</li>
                  </ul>
                </div>
              </div>
              <div className="delete-actions">
                <button
                  onClick={confirmDelete}
                  className="confirm-delete-btn"
                  disabled={loading}
                >
                  {loading ? '刪除中...' : '🗑️ 確認刪除'}
                </button>
                <button
                  onClick={cancelDelete}
                  className="cancel-delete-btn"
                >
                  ❌ 取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 從庫存添加商品到編輯訂單的彈窗 */}
      {showAddProductModal && editingOrder && (
        <div className="modal-overlay" onClick={closeAddProductModal}>
          <div className="modal-content add-product-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📦 從庫存添加商品到訂單</h3>
              <button className="close-btn" onClick={closeAddProductModal}>
                ❌
              </button>
            </div>
            <div className="modal-body">
              <div className="add-product-info">
                <p>選擇要添加到訂單 #{editingOrder} 的商品：</p>
              </div>
              
              {/* 分類篩選 */}
              <div className="category-filter-modal">
                <label htmlFor="modal-category-select" className="category-label">商品分類：</label>
                <select
                  id="modal-category-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="category-select-modal"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name} ({getCategoryCount(category.id)})
                    </option>
                  ))}
                </select>
              </div>

              {/* 可添加的商品列表 */}
              <div className="available-products-list">
                {filteredProducts.filter(product => product.stock > 0).length === 0 ? (
                  <div className="no-available-products">
                    <p>目前沒有可添加的商品庫存</p>
                  </div>
                ) : (
                  <div className="modal-table-container">
                    <table className="modal-products-table">
                      <thead>
                        <tr>
                          <th>分類</th>
                          <th>商品名稱</th>
                          <th>價格</th>
                          <th>庫存</th>
                          <th>規格</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.filter(product => product.stock > 0).map(product => (
                          <tr key={product.id} className="modal-product-row">
                            <td className="modal-category-cell">
                              <div className="category-info">
                                <span className="category-icon">{getCategoryIcon(product.category)}</span>
                                <span className="category-label">{product.category}</span>
                              </div>
                            </td>
                            
                            <td className="modal-name-cell">
                              <span className="product-name">{product.name}</span>
                            </td>
                            
                            <td className="modal-price-cell">
                              <span className="price">NT$ {product.price.toLocaleString()}</span>
                            </td>
                            
                            <td className="modal-stock-cell">
                              <span className="stock-number">庫存: {product.stock}</span>
                            </td>
                            
                            <td className="modal-specs-cell">
                              <div className="product-specs">
                                {Object.entries(product.specs).slice(0, 2).map(([key, value]) => (
                                  <span key={key} className="spec-item">
                                    {key}: {value}
                                  </span>
                                ))}
                                {Object.keys(product.specs).length > 2 && (
                                  <span className="spec-more">+{Object.keys(product.specs).length - 2} 更多</span>
                                )}
                              </div>
                            </td>
                            
                            <td className="modal-actions-cell">
                              <div className="product-actions-modal">
                                <button
                                  onClick={() => {
                                    addProductToEditingOrder(product);
                                    // 添加成功提示
                                    alert(`商品 "${product.name}" 已添加到訂單`);
                                  }}
                                  className="add-to-order-btn"
                                >
                                  ➕
                                </button>
                                
                                {/* 檢查是否已在訂單中 */}
                                {editingOrderData.items.some(item => item.productId === product.id) && (
                                  <div className="already-in-order">
                                    <small>✅</small>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={closeAddProductModal}
                className="close-modal-btn"
              >
                完成添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryOrderPage;
