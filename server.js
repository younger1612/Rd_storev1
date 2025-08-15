const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { Client } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

// PostgreSQL設定
const dbConfig = {
  host: process.env.REACT_APP_DB_HOST || '192.168.0.2',
  port: process.env.REACT_APP_DB_PORT || 5432,
  database: process.env.REACT_APP_DB_NAME || 'rd_store',
  user: process.env.REACT_APP_DB_USER || 'postgres',
  password: process.env.REACT_APP_DB_PASSWORD || 'password',
};

// 資料庫連接狀態
let useDatabase = true;
let mockProducts = [
  { id: 1, name: 'Intel Core i7-13700K', category: 'CPU', current_stock: 18, current_price: 12004.00, specs: {} },
  { id: 2, name: 'NVIDIA RTX 4070', category: 'GPU', current_stock: 15, current_price: 0.00, specs: {} },
  { id: 3, name: 'ASUS ROG B650E-F', category: 'Motherboard', current_stock: 10, current_price: 10000.00, specs: {} },
  { id: 4, name: 'Corsair DDR5-5600 16GB', category: 'RAM', current_stock: 10, current_price: 6500.00, specs: {} },
  { id: 5, name: 'Samsung 980 PRO 1TB', category: 'Storage', current_stock: 14, current_price: 0.00, specs: {} },
  { id: 6, name: 'Corsair RM850x', category: 'PSU', current_stock: 10, current_price: 10000.00, specs: {} }
];
let mockPurchases = [];
let nextPurchaseId = 1;
let nextProductId = 7; // 從 7 開始，因為模擬產品已經使用了 1-6

// 建立資料庫連線
const createClient = () => {
  return new Client(dbConfig);
};

// 資料庫初始化
const initializeDatabase = async () => {
  const client = createClient();
  try {
    await client.connect();
    console.log('✅ 成功連接到PostgreSQL資料庫');
    
    // 建立商品表
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        current_stock INTEGER DEFAULT 0,
        current_price DECIMAL(10, 2) DEFAULT 0,
        specs JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 建立進貨記錄表
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchases (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id),
        product_name VARCHAR(255) NOT NULL,
        is_custom_product BOOLEAN DEFAULT FALSE,
        quantity INTEGER NOT NULL,
        unit_cost DECIMAL(10, 2) NOT NULL,
        total_cost DECIMAL(10, 2) NOT NULL,
        purchase_date DATE NOT NULL,
        supplier VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 添加狀態欄位（如果不存在）
    try {
      await client.query(`
        ALTER TABLE purchases 
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT '未付款';
      `);
      console.log('✅ 成功添加 status 欄位到 purchases 表');
    } catch (error) {
      console.log('ℹ️  status 欄位可能已存在:', error.message);
    }
    
    // 建立庫存調整記錄表
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_adjustments (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id),
        product_name VARCHAR(255) NOT NULL,
        adjustment_type VARCHAR(50) NOT NULL, -- 'stock' or 'price'
        old_value DECIMAL(10, 2) NOT NULL,
        new_value DECIMAL(10, 2) NOT NULL,
        adjustment_reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 建立訂單表
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        customer_name VARCHAR(255),
        customer_phone VARCHAR(50),
        customer_email VARCHAR(255),
        customer_link TEXT,
        total_amount DECIMAL(10, 2) NOT NULL,
        cost DECIMAL(10, 2) DEFAULT 0,
        order_date DATE DEFAULT CURRENT_DATE,
        status VARCHAR(50) DEFAULT '待處理',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 建立訂單項目表
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id),
        product_name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        unit_cost DECIMAL(10, 2) DEFAULT 0,
        subtotal DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
        specs JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 檢查並添加缺失的欄位
    try {
      // 檢查 orders 表是否有 cost 欄位
      const costColumnExists = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'cost'
      `);
      
      if (costColumnExists.rows.length === 0) {
        console.log('🔧 添加 orders.cost 欄位...');
        await client.query(`
          ALTER TABLE orders ADD COLUMN cost DECIMAL(10, 2) DEFAULT 0
        `);
        console.log('✅ orders.cost 欄位添加完成');
      }

      // 檢查 orders 表是否有 customer_link 欄位
      const customerLinkColumnExists = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'customer_link'
      `);
      
      if (customerLinkColumnExists.rows.length === 0) {
        console.log('🔧 添加 orders.customer_link 欄位...');
        await client.query(`
          ALTER TABLE orders ADD COLUMN customer_link TEXT
        `);
        console.log('✅ orders.customer_link 欄位添加完成');
      }

      // 檢查 order_items 表是否有 unit_cost 欄位
      const unitCostColumnExists = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'unit_cost'
      `);
      
      if (unitCostColumnExists.rows.length === 0) {
        console.log('🔧 添加 order_items.unit_cost 欄位...');
        await client.query(`
          ALTER TABLE order_items ADD COLUMN unit_cost DECIMAL(10, 2) DEFAULT 0
        `);
        console.log('✅ order_items.unit_cost 欄位添加完成');
      }

      // 檢查 order_items 表是否有 subtotal 欄位
      const subtotalColumnExists = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'subtotal'
      `);
      
      if (subtotalColumnExists.rows.length === 0) {
        console.log('🔧 添加 order_items.subtotal 欄位...');
        await client.query(`
          ALTER TABLE order_items ADD COLUMN subtotal DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED
        `);
        console.log('✅ order_items.subtotal 欄位添加完成');
      }

    } catch (alterError) {
      console.log('⚠️ 資料庫結構更新時出現問題:', alterError.message);
    }

    console.log('✅ 資料庫表格初始化完成');
    useDatabase = true;
  } catch (error) {
    console.error('❌ 資料庫連接失敗:', error.message);
    console.log('🔄 轉換為模擬資料模式');
    useDatabase = false;
  } finally {
    await client.end();
  }
};

// 中間件設定
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 靜態文件服務
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname)));

// 初始化資料庫
initializeDatabase().catch(console.error);

// ==================== 進貨管理功能 ====================

// 新增進貨記錄（修正版 - 會自動更新商品庫存）
const addPurchase = async (purchaseData) => {
  if (!useDatabase) {
    // 模擬模式 - 生成唯一 ID
    let newId = nextPurchaseId;
    while (mockPurchases.some(p => p.id === newId)) {
      newId = nextPurchaseId++;
    }
    nextPurchaseId = newId + 1;
    
    const purchase = {
      id: newId,
      product_id: purchaseData.isCustomProduct ? null : purchaseData.productId,
      product_name: purchaseData.productName,
      is_custom_product: purchaseData.isCustomProduct,
      quantity: purchaseData.quantity,
      unit_cost: purchaseData.unitCost,
      total_cost: purchaseData.totalCost,
      purchase_date: purchaseData.purchaseDate,
      supplier: purchaseData.supplier,
      notes: purchaseData.notes,
      status: purchaseData.status || '未付款',
      created_at: new Date().toISOString()
    };
    
    console.log(`新增模擬進貨記錄，ID: ${newId}`);
    mockPurchases.push(purchase);
    return purchase;
  }

  const client = createClient();

  try {
    await client.connect();
    
    // 使用交易來確保資料一致性
    await client.query('BEGIN');

    const {
      productId,
      productName,
      isCustomProduct,
      quantity,
      unitCost,
      totalCost,
      purchaseDate,
      supplier,
      notes,
      status = '未付款' // 預設為未付款
    } = purchaseData;

    // 1. 插入進貨記錄
    const purchaseResult = await client.query(
      `INSERT INTO purchases 
       (product_id, product_name, is_custom_product, quantity, unit_cost, total_cost, purchase_date, supplier, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        isCustomProduct ? null : productId,
        productName,
        isCustomProduct,
        quantity,
        unitCost,
        totalCost,
        purchaseDate,
        supplier,
        notes,
        status
      ]
    );

    // 2. 更新或新增商品到 products 表
    if (isCustomProduct) {
      // 自訂商品：新增到 products 表或更新現有的
      const existingProduct = await client.query(
        'SELECT * FROM products WHERE name = $1',
        [productName]
      );

      if (existingProduct.rows.length > 0) {
        // 更新現有商品的庫存和平均價格
        const product = existingProduct.rows[0];
        const currentStock = parseInt(product.current_stock) || 0;
        const currentPrice = parseFloat(product.current_price) || 0;
        
        // 計算新的庫存和加權平均價格
        const newStock = currentStock + quantity;
        const totalValue = (currentStock * currentPrice) + (quantity * unitCost);
        const newAveragePrice = newStock > 0 ? totalValue / newStock : unitCost;

        await client.query(
          `UPDATE products 
           SET current_stock = $1, current_price = $2, updated_at = CURRENT_TIMESTAMP
           WHERE name = $3`,
          [newStock, newAveragePrice, productName]
        );
        
        console.log(`📦 更新自訂商品：${productName} 庫存: ${currentStock} → ${newStock}`);
      } else {
        // 新增自訂商品到 products 表
        await client.query(
          `INSERT INTO products (name, category, current_stock, current_price, specs)
           VALUES ($1, $2, $3, $4, $5)`,
          [productName, '自訂商品', quantity, unitCost, '{}']
        );
        
        console.log(`🆕 新增自訂商品：${productName} 庫存: ${quantity}`);
      }
    } else if (productId) {
      // 現有商品：更新庫存和平均價格
      const existingProduct = await client.query(
        'SELECT * FROM products WHERE id = $1',
        [productId]
      );

      if (existingProduct.rows.length > 0) {
        const product = existingProduct.rows[0];
        const currentStock = parseInt(product.current_stock) || 0;
        const currentPrice = parseFloat(product.current_price) || 0;
        
        // 計算新的庫存和加權平均價格
        const newStock = currentStock + quantity;
        const totalValue = (currentStock * currentPrice) + (quantity * unitCost);
        const newAveragePrice = newStock > 0 ? totalValue / newStock : unitCost;

        await client.query(
          `UPDATE products 
           SET current_stock = $1, current_price = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [newStock, newAveragePrice, productId]
        );
        
        console.log(`📦 更新商品庫存：${productName} 庫存: ${currentStock} → ${newStock}`);
      } else {
        // 如果商品不存在，根據商品名稱創建
        await client.query(
          `INSERT INTO products (name, category, current_stock, current_price, specs)
           VALUES ($1, $2, $3, $4, $5)`,
          [productName, 'CPU', quantity, unitCost, '{}']
        );
        
        console.log(`🆕 新增商品：${productName} 庫存: ${quantity}`);
      }
    }

    // 提交交易
    await client.query('COMMIT');
    
    console.log(`✅ 進貨成功：${productName} 數量 +${quantity}，已自動更新庫存`);
    return purchaseResult.rows[0];
  } catch (error) {
    // 回滾交易
    await client.query('ROLLBACK');
    console.error('新增進貨失敗:', error);
    throw error;
  } finally {
    await client.end();
  }
};

// 獲取進貨記錄
const getPurchases = async (startDate, endDate) => {
  if (!useDatabase) {
    // 模擬模式 - 根據日期篩選
    return mockPurchases.filter(p =>
      p.purchase_date >= startDate && p.purchase_date <= endDate
    ).sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date));
  }

  const client = createClient();

  try {
    await client.connect();

    const result = await client.query(
      `SELECT * FROM purchases
       WHERE purchase_date >= $1 AND purchase_date <= $2
       ORDER BY purchase_date DESC`,
      [startDate, endDate]
    );

    return result.rows;
  } catch (error) {
    console.error('獲取進貨記錄失敗:', error);
    throw error;
  } finally {
    await client.end();
  }
};

// 刪除進貨記錄
const deletePurchase = async (purchaseId) => {
  if (!useDatabase) {
    // 模擬模式
    const index = mockPurchases.findIndex(p => p.id == purchaseId);
    if (index !== -1) {
      mockPurchases.splice(index, 1);
      return true;
    }
    return false;
  }

  const client = createClient();

  try {
    await client.connect();
    const result = await client.query('DELETE FROM purchases WHERE id = $1', [purchaseId]);
    return result.rowCount > 0;
  } catch (error) {
    console.error('刪除進貨記錄失敗:', error);
    throw error;
  } finally {
    await client.end();
  }
};

// 更新進貨記錄
const updatePurchase = async (purchaseId, updateData) => {
  if (!useDatabase) {
    // 模擬模式
    const index = mockPurchases.findIndex(p => p.id == purchaseId);
    if (index !== -1) {
      mockPurchases[index] = { ...mockPurchases[index], ...updateData };
      console.log(`✅ 模擬模式：進貨記錄 ${purchaseId} 更新成功`);
      return mockPurchases[index];
    }
    return null;
  }

  const client = createClient();

  try {
    await client.connect();
    
    const { quantity, unitCost, totalCost, supplier, notes, status } = updateData;
    
    const result = await client.query(
      `UPDATE purchases 
       SET quantity = $1, unit_cost = $2, total_cost = $3, supplier = $4, notes = $5, status = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 
       RETURNING *`,
      [quantity, unitCost, totalCost, supplier || '', notes || '', status || '未付款', purchaseId]
    );
    
    if (result.rowCount > 0) {
      console.log(`✅ 進貨記錄 ${purchaseId} 更新成功`);
      return result.rows[0];
    }
    
    return null;
  } catch (error) {
    console.error('更新進貨記錄失敗:', error);
    throw error;
  } finally {
    await client.end();
  }
};

// ==================== 商品管理功能 ====================

// 獲取所有商品
const getProducts = async () => {
  if (!useDatabase) {
    return mockProducts;
  }

  const client = createClient();

  try {
    await client.connect();
    const result = await client.query('SELECT * FROM products ORDER BY name');
    return result.rows;
  } catch (error) {
    console.error('獲取商品失敗:', error);
    throw error;
  } finally {
    await client.end();
  }
};

// 更新商品庫存
const updateProductStock = async (productId, newStock, reason) => {
  if (!useDatabase) {
    // 模擬模式 - 更新模擬數據
    const productIndex = mockProducts.findIndex(p => p.id == productId);
    if (productIndex !== -1) {
      const oldStock = mockProducts[productIndex].current_stock;
      mockProducts[productIndex].current_stock = newStock;
      console.log(`📦 模擬模式庫存調整：${mockProducts[productIndex].name} ${oldStock} → ${newStock}`);
      
      return {
        success: true,
        message: `庫存已更新：${mockProducts[productIndex].name} ${oldStock} → ${newStock}`,
        productId,
        oldStock,
        newStock
      };
    } else {
      throw new Error('商品不存在');
    }
  }

  const client = createClient();

  try {
    await client.connect();
    await client.query('BEGIN');

    // 獲取當前商品資訊
    const currentProduct = await client.query(
      'SELECT * FROM products WHERE id = $1',
      [productId]
    );

    if (currentProduct.rows.length === 0) {
      throw new Error('商品不存在');
    }

    const product = currentProduct.rows[0];
    const oldStock = product.current_stock;

    // 更新庫存
    await client.query(
      'UPDATE products SET current_stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newStock, productId]
    );

    // 記錄庫存調整
    await client.query(
      `INSERT INTO stock_adjustments 
       (product_id, product_name, adjustment_type, old_value, new_value, adjustment_reason)
       VALUES ($1, $2, 'stock', $3, $4, $5)`,
      [productId, product.name, oldStock, newStock, reason]
    );

    await client.query('COMMIT');
    
    console.log(`📦 庫存調整：${product.name} ${oldStock} → ${newStock} (${reason})`);
    
    return {
      success: true,
      message: `庫存已更新：${product.name} ${oldStock} → ${newStock}`,
      productId,
      oldStock,
      newStock
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('更新庫存失敗:', error);
    throw error;
  } finally {
    await client.end();
  }
};

// 更新商品價格
const updateProductPrice = async (productId, newPrice, reason) => {
  if (!useDatabase) {
    // 模擬模式 - 更新模擬數據
    const productIndex = mockProducts.findIndex(p => p.id == productId);
    if (productIndex !== -1) {
      const oldPrice = mockProducts[productIndex].current_price;
      mockProducts[productIndex].current_price = newPrice;
      console.log(`💰 模擬模式價格調整：${mockProducts[productIndex].name} $${oldPrice} → $${newPrice}`);
      
      return {
        success: true,
        message: `價格已更新：${mockProducts[productIndex].name} $${oldPrice} → $${newPrice}`,
        productId,
        oldPrice,
        newPrice
      };
    } else {
      throw new Error('商品不存在');
    }
  }

  const client = createClient();

  try {
    await client.connect();
    await client.query('BEGIN');

    // 獲取當前商品資訊
    const currentProduct = await client.query(
      'SELECT * FROM products WHERE id = $1',
      [productId]
    );

    if (currentProduct.rows.length === 0) {
      throw new Error('商品不存在');
    }

    const product = currentProduct.rows[0];
    const oldPrice = product.current_price;

    // 更新價格
    await client.query(
      'UPDATE products SET current_price = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPrice, productId]
    );

    // 記錄價格調整
    await client.query(
      `INSERT INTO stock_adjustments 
       (product_id, product_name, adjustment_type, old_value, new_value, adjustment_reason)
       VALUES ($1, $2, 'price', $3, $4, $5)`,
      [productId, product.name, oldPrice, newPrice, reason]
    );

    await client.query('COMMIT');
    
    console.log(`💰 價格調整：${product.name} $${oldPrice} → $${newPrice} (${reason})`);
    
    return {
      success: true,
      message: `價格已更新：${product.name} $${oldPrice} → $${newPrice}`,
      productId,
      oldPrice,
      newPrice
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('更新價格失敗:', error);
    throw error;
  } finally {
    await client.end();
  }
};

// 刪除商品
const deleteProduct = async (productId) => {
  if (!useDatabase) {
    // 模擬模式
    const productIndex = mockProducts.findIndex(p => p.id == productId);
    if (productIndex === -1) {
      throw new Error('商品不存在');
    }
    
    const deletedProduct = mockProducts[productIndex];
    mockProducts.splice(productIndex, 1);
    
    console.log(`🗑️ 模擬模式商品刪除：${deletedProduct.name}`);
    
    return {
      success: true,
      message: `商品 "${deletedProduct.name}" 已成功刪除`,
      productId,
      productName: deletedProduct.name
    };
  }

  const client = createClient();

  try {
    await client.connect();
    await client.query('BEGIN');

    // 檢查商品是否存在
    const currentProduct = await client.query(
      'SELECT * FROM products WHERE id = $1',
      [productId]
    );

    if (currentProduct.rows.length === 0) {
      throw new Error('商品不存在');
    }

    const product = currentProduct.rows[0];

    // 檢查是否有相關的進貨記錄或訂單項目
    const relatedPurchases = await client.query(
      'SELECT COUNT(*) as count FROM purchases WHERE product_id = $1',
      [productId]
    );

    const relatedOrderItems = await client.query(
      'SELECT COUNT(*) as count FROM order_items WHERE product_id = $1',
      [productId]
    );

    if (relatedPurchases.rows[0].count > 0 || relatedOrderItems.rows[0].count > 0) {
      // 如果有相關記錄，可以選擇軟刪除或禁止刪除
      throw new Error('無法刪除商品：該商品存在相關的進貨記錄或訂單');
    }

    // 刪除相關的庫存調整記錄
    await client.query(
      'DELETE FROM stock_adjustments WHERE product_id = $1',
      [productId]
    );

    // 刪除商品
    await client.query(
      'DELETE FROM products WHERE id = $1',
      [productId]
    );

    await client.query('COMMIT');
    
    console.log(`🗑️ 商品刪除：${product.name}`);
    
    return {
      success: true,
      message: `商品 "${product.name}" 已成功刪除`,
      productId,
      productName: product.name
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('刪除商品失敗:', error);
    throw error;
  } finally {
    await client.end();
  }
};

// ==================== API 路由 ====================

// 進貨管理 API
app.post('/api/purchases', async (req, res) => {
  try {
    const purchase = await addPurchase(req.body);
    res.status(201).json({
      success: true,
      data: purchase,
      message: '進貨記錄新增成功'
    });
  } catch (error) {
    console.error('新增進貨記錄失敗:', error);
    res.status(500).json({
      success: false,
      message: '新增進貨記錄失敗',
      error: error.message
    });
  }
});

app.get('/api/purchases', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const purchases = await getPurchases(startDate, endDate);
    res.json({
      success: true,
      data: purchases
    });
  } catch (error) {
    console.error('獲取進貨記錄失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取進貨記錄失敗',
      error: error.message
    });
  }
});

app.delete('/api/purchases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await deletePurchase(id);
    if (success) {
      res.json({
        success: true,
        message: '進貨記錄已刪除'
      });
    } else {
      res.status(404).json({
        success: false,
        message: '找不到指定的進貨記錄'
      });
    }
  } catch (error) {
    console.error('刪除進貨記錄失敗:', error);
    res.status(500).json({
      success: false,
      message: '刪除進貨記錄失敗',
      error: error.message
    });
  }
});

// 更新進貨記錄
app.put('/api/purchases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, unitCost, totalCost, supplier, notes, status } = req.body;
    
    console.log(`📝 更新進貨記錄 ${id}:`, { quantity, unitCost, totalCost, supplier, notes, status });
    
    const updatedPurchase = await updatePurchase(id, {
      quantity: parseFloat(quantity) || 0,
      unitCost: parseFloat(unitCost) || 0,
      totalCost: parseFloat(totalCost) || 0,
      supplier: supplier || '',
      notes: notes || '',
      status: status || '未付款'
    });
    
    if (updatedPurchase) {
      res.json({
        success: true,
        message: '進貨記錄更新成功',
        data: updatedPurchase
      });
    } else {
      res.status(404).json({
        success: false,
        message: '找不到指定的進貨記錄'
      });
    }
  } catch (error) {
    console.error('更新進貨記錄失敗:', error);
    res.status(500).json({
      success: false,
      message: '更新進貨記錄失敗',
      error: error.message
    });
  }
});

// 商品管理 API
app.get('/api/products', async (req, res) => {
  try {
    const products = await getProducts();
    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('獲取商品失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取商品失敗',
      error: error.message
    });
  }
});

// 新增商品 API
app.post('/api/products', async (req, res) => {
  try {
    const { name, category, current_stock, current_price, specs } = req.body;
    
    console.log('新增商品 API 收到參數:', { name, category, current_stock, current_price, specs });
    
    // 驗證必要參數
    if (!name || !category) {
      return res.status(400).json({
        success: false,
        message: '商品名稱和分類為必填項目'
      });
    }

    const client = createClient();
    await client.connect();

    try {
      await client.query('BEGIN');

      // 新增商品到資料庫
      const result = await client.query(
        `INSERT INTO products (name, category, current_stock, current_price, specs, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          name,
          category,
          parseInt(current_stock) || 0,
          parseFloat(current_price) || 0,
          JSON.stringify(specs || {})
        ]
      );

      await client.query('COMMIT');
      
      const newProduct = result.rows[0];
      console.log('✅ 商品新增成功:', newProduct);

      res.json({
        success: true,
        message: `商品 "${name}" 已成功新增到資料庫`,
        data: newProduct
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      await client.end();
    }

  } catch (error) {
    console.error('新增商品失敗:', error);
    res.status(500).json({
      success: false,
      message: '新增商品失敗',
      error: error.message
    });
  }
});

app.put('/api/products/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { stock, current_stock, reason } = req.body;
    
    // 接受兩種參數名稱：stock 或 current_stock
    const newStock = stock !== undefined ? stock : current_stock;
    const adjustmentReason = reason || '手動庫存調整';
    
    console.log('庫存更新 API 收到參數:', { id, stock, current_stock, newStock, reason: adjustmentReason });
    
    const result = await updateProductStock(id, newStock, adjustmentReason);
    res.json(result);
  } catch (error) {
    console.error('更新庫存失敗:', error);
    res.status(500).json({
      success: false,
      message: '更新庫存失敗',
      error: error.message
    });
  }
});

app.put('/api/products/:id/price', async (req, res) => {
  try {
    const { id } = req.params;
    const { price, current_price, reason } = req.body;
    
    // 接受兩種參數名稱：price 或 current_price
    const newPrice = price !== undefined ? price : current_price;
    const adjustmentReason = reason || '手動價格調整';
    
    console.log('價格更新 API 收到參數:', { id, price, current_price, newPrice, reason: adjustmentReason });
    
    const result = await updateProductPrice(id, newPrice, adjustmentReason);
    res.json(result);
  } catch (error) {
    console.error('更新價格失敗:', error);
    res.status(500).json({
      success: false,
      message: '更新價格失敗',
      error: error.message
    });
  }
});

// 更新商品規格 API
app.put('/api/products/:id/specs', async (req, res) => {
  try {
    const { id } = req.params;
    const { specs } = req.body;
    
    console.log('規格更新 API 收到參數:', { id, specs });
    
    if (!specs || typeof specs !== 'object') {
      return res.status(400).json({
        success: false,
        message: '規格資料格式不正確'
      });
    }

    const client = createClient();
    await client.connect();

    try {
      await client.query('BEGIN');

      // 更新商品規格
      const result = await client.query(
        `UPDATE products 
         SET specs = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [JSON.stringify(specs), id]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: '找不到指定的商品'
        });
      }

      await client.query('COMMIT');
      
      const updatedProduct = result.rows[0];
      console.log('✅ 商品規格更新成功:', updatedProduct);

      res.json({
        success: true,
        message: `商品規格已更新`,
        data: updatedProduct
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      await client.end();
    }

  } catch (error) {
    console.error('更新規格失敗:', error);
    res.status(500).json({
      success: false,
      message: '更新規格失敗',
      error: error.message
    });
  }
});

// 刪除商品 API
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`收到刪除商品請求，ID: ${id}`);
    
    const result = await deleteProduct(id);
    res.json({
      success: true,
      message: result.message,
      productId: id
    });
  } catch (error) {
    console.error('刪除商品失敗:', error);
    res.status(500).json({
      success: false,
      message: '刪除商品失敗',
      error: error.message
    });
  }
});

// ==================== 訂單管理 API ====================

// 創建訂單
app.post('/api/orders', async (req, res) => {
  if (!useDatabase) {
    return res.status(503).json({
      success: false,
      message: '訂單功能需要資料庫支援'
    });
  }

  const client = createClient();
  
  try {
    await client.connect();
    
    const {
      customer_name,
      customer_phone,
      customer_email,
      total_amount,
      cost = 0,
      status = '待收訂金', // 默認狀態改為待收訂金
      notes,
      items = []
    } = req.body;

    // 驗證必要欄位
    if (!total_amount || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: '訂單金額和商品項目不能為空'
      });
    }

    // 開始交易
    await client.query('BEGIN');

    // 插入訂單主記錄
    const orderResult = await client.query(`
      INSERT INTO orders (customer_name, customer_phone, customer_email, total_amount, cost, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, created_at
    `, [customer_name, customer_phone, customer_email, total_amount, cost, status, notes]);

    const orderId = orderResult.rows[0].id;
    const orderCreatedAt = orderResult.rows[0].created_at;

    // 插入訂單項目
    for (const item of items) {
      await client.query(`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, unit_cost, specs)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        orderId,
        item.productId,
        item.productName,
        item.quantity,
        item.price,
        item.cost || 0,
        JSON.stringify(item.specs || {})
      ]);
    }

    // 提交交易
    await client.query('COMMIT');

    console.log(`✅ 訂單創建成功，ID: ${orderId}`);

    res.json({
      success: true,
      message: '訂單創建成功',
      data: {
        id: orderId,
        created_at: orderCreatedAt,
        items_count: items.length
      }
    });

  } catch (error) {
    // 回滾交易
    await client.query('ROLLBACK');
    
    console.error('創建訂單錯誤:', error);
    res.status(500).json({
      success: false,
      message: '創建訂單失敗',
      error: error.message
    });
  } finally {
    await client.end();
  }
});

// 獲取所有訂單
app.get('/api/orders', async (req, res) => {
  if (!useDatabase) {
    return res.status(503).json({
      success: false,
      message: '訂單功能需要資料庫支援'
    });
  }

  const client = createClient();
  
  try {
    await client.connect();
    
    // 獲取所有訂單
    const ordersResult = await client.query(`
      SELECT * FROM orders 
      ORDER BY created_at DESC
    `);

    // 為每個訂單獲取商品明細
    const ordersWithItems = await Promise.all(
      ordersResult.rows.map(async (order) => {
        const itemsResult = await client.query(`
          SELECT 
            oi.*,
            p.category as product_category
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = $1
          ORDER BY oi.id
        `, [order.id]);

        return {
          ...order,
          items: itemsResult.rows
        };
      })
    );

    res.json({
      success: true,
      data: ordersWithItems
    });

  } catch (error) {
    console.error('獲取訂單列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取訂單列表失敗',
      error: error.message
    });
  } finally {
    await client.end();
  }
});

// 獲取單一訂單詳情
app.get('/api/orders/:id', async (req, res) => {
  if (!useDatabase) {
    return res.status(503).json({
      success: false,
      message: '訂單功能需要資料庫支援'
    });
  }

  const client = createClient();
  const { id } = req.params;
  
  try {
    await client.connect();
    
    // 獲取訂單基本資料
    const orderResult = await client.query(
      'SELECT * FROM orders WHERE id = $1',
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '訂單不存在'
      });
    }

    // 獲取訂單項目
    const itemsResult = await client.query(`
      SELECT 
        oi.*,
        p.category as product_category
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
      ORDER BY oi.id
    `, [id]);

    const order = orderResult.rows[0];
    order.items = itemsResult.rows.map(item => ({
      ...item,
      specs: typeof item.specs === 'string' ? JSON.parse(item.specs) : item.specs
    }));

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('獲取訂單詳情錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取訂單詳情失敗',
      error: error.message
    });
  } finally {
    await client.end();
  }
});

// 更新訂單
app.put('/api/orders/:id', async (req, res) => {
  if (!useDatabase) {
    return res.status(503).json({
      success: false,
      message: '訂單功能需要資料庫支援'
    });
  }

  const client = createClient();
  const { id } = req.params;
  
  try {
    await client.connect();
    
    // 開始交易
    await client.query('BEGIN');
    
    const updateFields = [];
    const values = [];
    let paramIndex = 1;
    
    // 動態構建更新查詢
    const allowedFields = [
      'customer_name', 'customer_phone', 'customer_email', 'customer_link',
      'total_amount', 'status', 'notes', 'cost'
    ];
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        values.push(req.body[field]);
        paramIndex++;
      }
    }
    
    if (updateFields.length === 0 && !req.body.items) {
      return res.status(400).json({
        success: false,
        message: '沒有提供要更新的欄位'
      });
    }
    
    // 更新訂單基本資料
    if (updateFields.length > 0) {
      values.push(id);
      const updateQuery = `
        UPDATE orders 
        SET ${updateFields.join(', ')} 
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      const result = await client.query(updateQuery, values);
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: '訂單不存在'
        });
      }
    }
    
    // 更新訂單項目（如果提供了items）
    if (req.body.items && Array.isArray(req.body.items)) {
      // 先刪除舊的訂單項目
      await client.query('DELETE FROM order_items WHERE order_id = $1', [id]);
      
      // 插入新的訂單項目
      for (const item of req.body.items) {
        await client.query(`
          INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, unit_cost, specs)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          id,
          item.productId,
          item.productName,
          item.quantity,
          item.price,
          item.cost || 0,
          JSON.stringify(item.specs || {})
        ]);
      }
    }
    
    // 提交交易
    await client.query('COMMIT');

    console.log(`✅ 訂單更新成功，ID: ${id}`);

    res.json({
      success: true,
      message: '訂單更新成功',
      data: { id: id, updated_items: req.body.items?.length || 0 }
    });

  } catch (error) {
    // 回滾交易
    await client.query('ROLLBACK');
    
    console.error('更新訂單錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新訂單失敗',
      error: error.message
    });
  } finally {
    await client.end();
  }
});

// 刪除訂單
app.delete('/api/orders/:id', async (req, res) => {
  if (!useDatabase) {
    return res.status(503).json({
      success: false,
      message: '訂單功能需要資料庫支援'
    });
  }

  const client = createClient();
  const { id } = req.params;
  
  try {
    await client.connect();
    
    // 檢查訂單是否存在
    const checkResult = await client.query(
      'SELECT id FROM orders WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '訂單不存在'
      });
    }

    // 開始交易
    await client.query('BEGIN');

    // 刪除訂單項目（CASCADE會自動處理）
    await client.query('DELETE FROM order_items WHERE order_id = $1', [id]);
    
    // 刪除訂單
    await client.query('DELETE FROM orders WHERE id = $1', [id]);

    // 提交交易
    await client.query('COMMIT');

    console.log(`✅ 訂單刪除成功，ID: ${id}`);

    res.json({
      success: true,
      message: '訂單刪除成功'
    });

  } catch (error) {
    // 回滾交易
    await client.query('ROLLBACK');
    
    console.error('刪除訂單錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除訂單失敗',
      error: error.message
    });
  } finally {
    await client.end();
  }
});

// 健康檢查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    database: useDatabase ? 'Connected' : 'Mock Mode',
    timestamp: new Date().toISOString()
  });
});

// 根路由
app.get('/', (req, res) => {
  res.send('RD Store API Server is running!');
});

// 啟動伺服器
app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ 成功連接到PostgreSQL資料庫');
  console.log('✅ 資料庫表格初始化完成');
  console.log(`🚀 API服務器啟動成功，監聽端口 ${PORT}`);
  console.log(`📊 健康檢查: http://192.168.0.2:${PORT}/api/health`);
  console.log(`🌐 網路訪問: http://0.0.0.0:${PORT}/api/health`);
  console.log(`💾 資料庫模式: ${useDatabase ? 'PostgreSQL' : 'Mock Data'}`);
});