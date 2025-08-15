const API_BASE_URL = 'http://192.168.0.2:3001'; // 根據你的後端服務器地址調整

class ProductAPI {
  // 基本的 API 請求處理函數
  async makeRequest(url, options = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      console.log(`API Request to ${url}:`, response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error for ${url}:`, error);
      throw error;
    }
  }

  // 獲取所有產品
  async getAllProducts() {
    try {
      console.log('Fetching all products...');
      const products = await this.makeRequest('/api/products');
      console.log('Products fetched successfully:', products.length);
      return products;
    } catch (error) {
      console.error('Failed to fetch products:', error);
      throw new Error('無法獲取產品數據');
    }
  }

  // 更新產品庫存
  async updateStock(productId, newStock) {
    try {
      console.log(`Updating stock for product ${productId} to ${newStock}`);
      
      const response = await this.makeRequest(`/api/products/${productId}/stock`, {
        method: 'PUT',
        body: JSON.stringify({ current_stock: newStock }),
      });

      console.log('Stock updated successfully:', response);
      return response;
    } catch (error) {
      console.error(`Failed to update stock for product ${productId}:`, error);
      throw new Error(`更新庫存失敗: ${error.message}`);
    }
  }

  // 更新產品價格
  async updatePrice(productId, newPrice) {
    try {
      console.log(`Updating price for product ${productId} to ${newPrice}`);
      
      const response = await this.makeRequest(`/api/products/${productId}/price`, {
        method: 'PUT',
        body: JSON.stringify({ current_price: newPrice }),
      });

      console.log('Price updated successfully:', response);
      return response;
    } catch (error) {
      console.error(`Failed to update price for product ${productId}:`, error);
      throw new Error(`更新價格失敗: ${error.message}`);
    }
  }

  // 批量更新產品（例如批量庫存調整）
  async batchUpdateProducts(updates) {
    try {
      console.log('Batch updating products:', updates);
      
      const response = await this.makeRequest('/api/products/batch-update', {
        method: 'PUT',
        body: JSON.stringify({ updates }),
      });

      console.log('Batch update successful:', response);
      return response;
    } catch (error) {
      console.error('Batch update failed:', error);
      throw new Error(`批量更新失敗: ${error.message}`);
    }
  }

  // 檢查 API 連接狀態
  async checkConnection() {
    try {
      console.log('Checking API connection...');
      const response = await this.makeRequest('/api/health');
      console.log('API connection OK:', response);
      return true;
    } catch (error) {
      console.error('API connection failed:', error);
      return false;
    }
  }
}

// 創建單例實例
const productAPI = new ProductAPI();

export default productAPI;
