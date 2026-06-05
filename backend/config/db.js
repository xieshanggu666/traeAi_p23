const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'zhongxin123',
  database: 'community_help',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const initDatabase = async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'zhongxin123'
    });

    await connection.execute('CREATE DATABASE IF NOT EXISTS community_help CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    await connection.end();

    await createTables();
    console.log('数据库初始化成功');
  } catch (err) {
    console.error('数据库初始化失败:', err);
  }
};

const createTables = async () => {
  const usersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      nickname VARCHAR(50),
      avatar VARCHAR(255),
      phone VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;

  const needsTable = `
    CREATE TABLE IF NOT EXISTS needs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type VARCHAR(20) DEFAULT 'express',
      title VARCHAR(100) NOT NULL,
      description TEXT,
      address VARCHAR(255) NOT NULL,
      latitude DECIMAL(10,7),
      longitude DECIMAL(10,7),
      reward DECIMAL(10,2) DEFAULT 0,
      status TINYINT DEFAULT 0 COMMENT '0:待接单 1:已接单 2:已完成 3:已取消',
      pickup_code VARCHAR(50) DEFAULT NULL,
      receiver_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;

  const alterNeedsTable = async () => {
    try {
      await pool.execute('ALTER TABLE needs ADD COLUMN latitude DECIMAL(10,7)');
    } catch (err) {
      if (!err.message.includes('Duplicate column name')) {
        console.error('添加latitude列失败:', err.message);
      }
    }
    try {
      await pool.execute('ALTER TABLE needs ADD COLUMN longitude DECIMAL(10,7)');
    } catch (err) {
      if (!err.message.includes('Duplicate column name')) {
        console.error('添加longitude列失败:', err.message);
      }
    }
    try {
      await pool.execute('ALTER TABLE needs ADD COLUMN pickup_code VARCHAR(50) DEFAULT NULL');
    } catch (err) {
      if (!err.message.includes('Duplicate column name')) {
        console.error('添加pickup_code列失败:', err.message);
      }
    }
    try {
      await pool.execute('ALTER TABLE needs ADD COLUMN pet_info VARCHAR(255) DEFAULT NULL');
    } catch (err) {
      if (!err.message.includes('Duplicate column name')) {
        console.error('添加pet_info列失败:', err.message);
      }
    }
    try {
      await pool.execute('ALTER TABLE needs ADD COLUMN pet_size VARCHAR(20) DEFAULT NULL');
    } catch (err) {
      if (!err.message.includes('Duplicate column name')) {
        console.error('添加pet_size列失败:', err.message);
      }
    }
    try {
      await pool.execute('ALTER TABLE needs ADD COLUMN pet_gentle TINYINT DEFAULT NULL');
    } catch (err) {
      if (!err.message.includes('Duplicate column name')) {
        console.error('添加pet_gentle列失败:', err.message);
      }
    }
    try {
      await pool.execute('ALTER TABLE needs ADD COLUMN item_info VARCHAR(255) DEFAULT NULL');
    } catch (err) {
      if (!err.message.includes('Duplicate column name')) {
        console.error('添加item_info列失败:', err.message);
      }
    }
    try {
      await pool.execute('ALTER TABLE needs ADD COLUMN item_size VARCHAR(20) DEFAULT NULL');
    } catch (err) {
      if (!err.message.includes('Duplicate column name')) {
        console.error('添加item_size列失败:', err.message);
      }
    }
    try {
      await pool.execute('ALTER TABLE needs ADD COLUMN dest_address VARCHAR(255) DEFAULT NULL');
    } catch (err) {
      if (!err.message.includes('Duplicate column name')) {
        console.error('添加dest_address列失败:', err.message);
      }
    }
    try {
      await pool.execute('ALTER TABLE needs ADD COLUMN dest_latitude DECIMAL(10,7) DEFAULT NULL');
    } catch (err) {
      if (!err.message.includes('Duplicate column name')) {
        console.error('添加dest_latitude列失败:', err.message);
      }
    }
    try {
      await pool.execute('ALTER TABLE needs ADD COLUMN dest_longitude DECIMAL(10,7) DEFAULT NULL');
    } catch (err) {
      if (!err.message.includes('Duplicate column name')) {
        console.error('添加dest_longitude列失败:', err.message);
      }
    }
  };

  const alterMessagesTable = async () => {
    try {
      await pool.execute('ALTER TABLE messages MODIFY COLUMN type VARCHAR(20) DEFAULT \'system\'');
    } catch (err) {
      console.error('修改messages表type列失败:', err.message);
    }
  };

  const messagesTable = `
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type VARCHAR(20) DEFAULT 'system',
      title VARCHAR(100) NOT NULL,
      content TEXT,
      is_read TINYINT DEFAULT 0,
      related_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;

  const privateMessagesTable = `
    CREATE TABLE IF NOT EXISTS private_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sender_id INT NOT NULL,
      receiver_id INT NOT NULL,
      content TEXT NOT NULL,
      is_read TINYINT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;

  await pool.execute(usersTable);
  await pool.execute(needsTable);
  await pool.execute(messagesTable);
  await pool.execute(privateMessagesTable);
  await alterNeedsTable();
  await alterMessagesTable();
};

module.exports = { pool, initDatabase };
