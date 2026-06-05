const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { username, password, nickname, phone } = req.body;

    if (!username || !password) {
      return res.json({ code: 400, message: '用户名和密码不能为空' });
    }

    const [users] = await pool.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (users.length > 0) {
      return res.json({ code: 400, message: '用户名已存在' });
    }

    const hashPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, nickname, phone) VALUES (?, ?, ?, ?)',
      [username, hashPassword, nickname || username, phone || '']
    );

    const user = {
      id: result.insertId,
      username,
      nickname: nickname || username
    };

    const token = generateToken(user);
    res.json({ code: 200, message: '注册成功', data: { ...user, token } });
  } catch (err) {
    console.error(err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.json({ code: 400, message: '用户名和密码不能为空' });
    }

    const [users] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.json({ code: 400, message: '用户不存在' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ code: 400, message: '密码错误' });
    }

    const token = generateToken(user);
    res.json({
      code: 200,
      message: '登录成功',
      data: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        phone: user.phone,
        token
      }
    });
  } catch (err) {
    console.error(err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;
