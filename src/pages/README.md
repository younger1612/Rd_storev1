# RD Store 頁面架構文件

## 系統概述
RD Store 是一個基於 React 的庫存管理系統，使用 PostgreSQL 資料庫，支援進貨管理、庫存下單和訂單管理功能。

## 頁面架構總覽

```
src/pages/
├── LoginPage.js         # 登入頁面
├── LoginPage.css        # 登入頁面樣式
├── PurchasePage.js      # 進貨管理頁面
├── PurchasePage.css     # 進貨管理頁面樣式
├── InventoryOrderPage.js # 庫存下單頁面
├── InventoryOrderPage.css # 庫存下單頁面樣式
├── OrderSummaryPage.js   # 訂單總覽頁面
├── OrderSummaryPage.css  # 訂單總覽頁面樣式
├── OrderSummaryPage_table.js  # 訂單總覽表格版本（備用）
└── OrderSummaryPage_table.css # 訂單總覽表格樣式（備用）
```

---

## 1. 登入頁面 (`LoginPage.js`)

### 功能描述
- 使用者身份驗證系統
- 支援記住登入狀態
- 提供快速試用功能

### 主要組件結構
```javascript
const LoginPage = ({ onLogin }) => {
  // 狀態管理
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 主要功能函數
  const handleSubmit = () => { /* 登入驗證邏輯 */ };
  const handleDemoLogin = () => { /* 快速填入試用帳號 */ };
}
```

### 技術特點
- **狀態管理**: React Hooks (`useState`)
- **表單處理**: 受控組件
- **錯誤處理**: 即時錯誤顯示
- **載入狀態**: 登入過程載入動畫
- **預設帳號**: admin / password

### API 整合
- 使用本地驗證（未連接後端 API）
- 模擬 API 調用延遲效果

---

## 2. 進貨管理頁面 (`PurchasePage.js`)

### 功能描述
- 管理商品進貨記錄
- 支援新增、編輯、刪除進貨資訊
- 日期範圍篩選功能
- 進貨統計分析

### 主要組件結構
```javascript
const PurchasePage = () => {
  // 資料狀態
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 表單狀態
  const [newPurchase, setNewPurchase] = useState({
    product_name: '',
    quantity: '',
    unit_cost: '',
    supplier: '',
    purchase_date: ''
  });
  
  // 篩選狀態
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
}
```

### API 服務
```javascript
const purchaseAPI = {
  getAll: async (startDate, endDate) => { /* 獲取進貨記錄 */ },
  add: async (purchaseData) => { /* 新增進貨記錄 */ },
  update: async (purchaseId, updateData) => { /* 更新進貨記錄 */ },
  delete: async (purchaseId) => { /* 刪除進貨記錄 */ }
}
```

### 技術特點
- **資料管理**: 與後端 API 同步
- **表單驗證**: 即時驗證輸入
- **日期處理**: 支援日期範圍篩選
- **編輯功能**: 行內編輯支援
- **統計計算**: 自動計算總金額和數量

---

## 3. 庫存下單頁面 (`InventoryOrderPage.js`)

### 功能描述
- 最複雜的頁面，整合庫存管理和訂單創建
- 商品分類瀏覽和搜尋
- 客戶管理功能
- 即時庫存更新
- 訂單創建和管理

### 主要組件結構
```javascript
const InventoryOrderPage = () => {
  // 產品相關狀態
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filteredProducts, setFilteredProducts] = useState([]);
  
  // 客戶相關狀態
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [newCustomer, setNewCustomer] = useState({
    name: '', phone: '', email: ''
  });
  
  // 訂單相關狀態
  const [orderItems, setOrderItems] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  
  // UI 控制狀態
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [collapsedProducts, setCollapsedProducts] = useState(new Set());
}
```

### 產品分類系統
```javascript
const categories = [
  { id: 'All', name: '全部' },
  { id: 'CPU', name: 'CPU' },
  { id: 'GPU', name: 'GPU' },
  { id: 'RAM', name: '記憶體' },
  { id: 'Storage', name: '儲存裝置' },
  { id: 'Motherboard', name: '主機板' },
  { id: 'Other', name: '其他' }
];
```

### 核心功能
1. **商品管理**
   - 新增商品（含規格管理）
   - 庫存調整（即時更新）
   - 價格編輯
   - 商品刪除

2. **客戶管理**
   - 新增客戶資訊
   - 客戶選擇功能

3. **訂單處理**
   - 購物車管理
   - 訂單創建
   - 庫存即時扣減
   - 訂單歷史記錄

### 技術特點
- **複雜狀態管理**: 多層級狀態控制
- **即時更新**: 庫存變更即時反映
- **模態框系統**: 多個彈出視窗管理
- **表單驗證**: 完整的輸入驗證
- **響應式設計**: 支援手機版面

---

## 4. 訂單總覽頁面 (`OrderSummaryPage.js`)

### 功能描述
- 訂單數據分析和展示
- 多維度篩選和排序
- 訂單狀態管理
- 客戶資訊編輯

### 主要組件結構
```javascript
const OrderSummaryPage = () => {
  // 訂單資料
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [statistics, setStatistics] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalCost: 0
  });
  
  // 篩選條件
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  
  // 編輯功能
  const [editingOrder, setEditingOrder] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editingValue, setEditingValue] = useState('');
}
```

### 篩選系統
```javascript
const statusOptions = [
  '全部狀態', '處理中', '已完成', '已取消', '待付款', '已付款', '準備出貨', '已出貨'
];

const sortOptions = [
  { value: 'date-desc', label: '日期 (新→舊)' },
  { value: 'date-asc', label: '日期 (舊→新)' },
  { value: 'amount-desc', label: '金額 (高→低)' },
  { value: 'amount-asc', label: '金額 (低→高)' },
  { value: 'customer-asc', label: '客戶 (A→Z)' }
];
```

### 核心功能
1. **資料展示**
   - 統計卡片（總訂單、營業額、利潤）
   - 訂單卡片式展示
   - 客戶聯絡資訊整合

2. **篩選排序**
   - 年份/月份篩選
   - 訂單狀態篩選
   - 多種排序選項

3. **編輯功能**
   - 行內編輯客戶資訊
   - 訂單狀態更新
   - 客戶連結管理

### 特殊功能
- **客戶名稱超連結**: 如果有客戶連結，名稱會變成可點擊的連結
- **聯絡資訊整合**: 統一顯示電話、郵件、外部連結
- **即時更新**: 編輯後立即同步到資料庫

---

## API 服務架構

### 統一配置
```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
```

### API 端點對應
- **Products**: `/api/products`
  - GET: 獲取所有商品
  - POST: 新增商品
  - PUT: 更新商品
  - DELETE: 刪除商品

- **Orders**: `/api/orders`
  - GET: 獲取所有訂單
  - POST: 新增訂單
  - PUT: 更新訂單

- **Purchases**: `/api/purchases`
  - GET: 獲取進貨記錄
  - POST: 新增進貨記錄
  - PUT: 更新進貨記錄

- **Customers**: `/api/customers`
  - GET: 獲取客戶列表
  - POST: 新增客戶

---

## 技術棧總覽

### 前端技術
- **React 18**: 主要框架
- **React Router**: 路由管理
- **React Hooks**: 狀態管理
- **CSS Modules**: 樣式管理
- **Date-fns**: 日期處理

### 開發模式
- **功能組件**: 全面使用 Function Components
- **Hooks 模式**: useState, useEffect 進行狀態管理
- **模組化設計**: 每個頁面獨立的 CSS 檔案
- **響應式設計**: 支援桌面版和手機版

### 錯誤處理
- **API 錯誤處理**: try-catch 包裝所有 API 調用
- **用戶友好提示**: 詳細的錯誤訊息顯示
- **載入狀態**: 適當的載入動畫

### 效能優化
- **懶載入**: 按需載入組件
- **狀態優化**: 避免不必要的重新渲染
- **API 快取**: localStorage 暫存機制

---

## 資料庫整合

### 主要資料表
1. **products** - 商品資訊
2. **orders** - 訂單資訊
3. **purchases** - 進貨記錄
4. **customers** - 客戶資訊

### 資料流向
1. **用戶操作** → **React 組件狀態更新**
2. **狀態更新** → **API 調用**
3. **API 調用** → **PostgreSQL 資料庫**
4. **資料庫響應** → **前端狀態同步**

---

## 部署架構

### 開發環境
```bash
npm start          # 前端開發伺服器 (port 3000)
node server.js     # 後端 API 伺服器 (port 3001)
```

### 生產環境
```bash
npm run build      # 建構生產版本
```

---

## 後續擴展方向

1. **功能擴展**
   - 商品圖片上傳
   - 報表生成功能
   - 庫存警報系統
   - 多語言支援

2. **技術升級**
   - Redux 狀態管理
   - TypeScript 遷移
   - PWA 支援
   - 單元測試覆蓋

3. **使用者體驗**
   - 拖拽排序
   - 批量操作
   - 快捷鍵支援
   - 暗色主題

---

*最後更新: 2025年8月13日*
