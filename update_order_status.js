const { Client } = require('pg');

const dbConfig = {
  host: process.env.REACT_APP_DB_HOST || '192.168.0.2',
  port: process.env.REACT_APP_DB_PORT || 5432,
  database: process.env.REACT_APP_DB_NAME || 'rd_store',
  user: process.env.REACT_APP_DB_USER || 'postgres',
  password: process.env.REACT_APP_DB_PASSWORD || 'password',
};

async function updateOrderStatus() {
  const client = new Client(dbConfig);
  try {
    await client.connect();
    console.log('✅ 已連接到資料庫');
    
    // 查看目前所有訂單的狀態
    const result = await client.query('SELECT id, status, customer_name, created_at FROM orders ORDER BY created_at DESC');
    console.log('\n📋 目前訂單狀態:');
    result.rows.forEach(row => {
      console.log(`訂單 #${row.id}: ${row.status} (客戶: ${row.customer_name || 'N/A'}, 建立時間: ${row.created_at})`);
    });
    
    // 更新所有 '已收訂金' 狀態的訂單為 '待收訂金'
    const updateResult = await client.query("UPDATE orders SET status = '待收訂金' WHERE status = '已收訂金' RETURNING id, customer_name");
    console.log(`\n🔄 已更新 ${updateResult.rows.length} 筆訂單狀態為 '待收訂金'`);
    
    if (updateResult.rows.length > 0) {
      console.log('更新的訂單:');
      updateResult.rows.forEach(row => {
        console.log(`- 訂單 #${row.id} (客戶: ${row.customer_name || 'N/A'})`);
      });
    }
    
    // 再次查看更新後的狀態
    const updatedResult = await client.query('SELECT id, status, customer_name, created_at FROM orders ORDER BY created_at DESC');
    console.log('\n✅ 更新後的訂單狀態:');
    updatedResult.rows.forEach(row => {
      console.log(`訂單 #${row.id}: ${row.status} (客戶: ${row.customer_name || 'N/A'}, 建立時間: ${row.created_at})`);
    });
    
  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await client.end();
    console.log('🔌 已斷開資料庫連接');
  }
}

updateOrderStatus();
