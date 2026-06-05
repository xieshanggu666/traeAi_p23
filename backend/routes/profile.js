const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/info', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const [users] = await pool.execute(
      'SELECT id, username, nickname, avatar, phone, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.json({ code: 400, message: '用户不存在' });
    }

    const [publishedCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM needs WHERE user_id = ?',
      [userId]
    );

    const [acceptedCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM needs WHERE receiver_id = ?',
      [userId]
    );

    const [completedCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM needs WHERE user_id = ? AND status = 2',
      [userId]
    );

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        ...users[0],
        published_count: publishedCount[0].count,
        accepted_count: acceptedCount[0].count,
        completed_count: completedCount[0].count
      }
    });
  } catch (err) {
    console.error(err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

router.post('/update', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { nickname, avatar, phone } = req.body;

    const fields = [];
    const values = [];

    if (nickname !== undefined) {
      if (!nickname || nickname.trim() === '') {
        return res.json({ code: 400, message: '昵称不能为空' });
      }
      fields.push('nickname = ?');
      values.push(nickname);
    }
    if (avatar !== undefined) {
      fields.push('avatar = ?');
      values.push(avatar);
    }
    if (phone !== undefined) {
      if (!phone || phone.trim() === '') {
        return res.json({ code: 400, message: '手机号不能为空' });
      }
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return res.json({ code: 400, message: '请输入正确的手机号格式' });
      }
      fields.push('phone = ?');
      values.push(phone);
    }

    if (fields.length === 0) {
      return res.json({ code: 400, message: '没有要更新的内容' });
    }

    values.push(userId);
    await pool.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

    res.json({ code: 200, message: '更新成功' });
  } catch (err) {
    console.error(err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;
