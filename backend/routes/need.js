const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const sendMessage = async (userId, title, content, type = 'system', relatedId = null) => {
  try {
    await pool.execute(
      'INSERT INTO messages (user_id, type, title, content, related_id, is_read) VALUES (?, ?, ?, ?, ?, 0)',
      [userId, type, title, content || '', relatedId]
    );
  } catch (err) {
    console.error('sendMessage error:', err.message);
  }
};

router.get('/list', authMiddleware, async (req, res) => {
  try {
    const { status, page = 1, pageSize = 10 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const sizeNum = parseInt(pageSize, 10) || 10;
    const offsetNum = Math.floor((pageNum - 1) * sizeNum);
    let sql = `
      SELECT n.*, u.nickname as publisher_name, u.avatar as publisher_avatar,
             r.nickname as receiver_name
      FROM needs n
      LEFT JOIN users u ON n.user_id = u.id
      LEFT JOIN users r ON n.receiver_id = r.id
    `;
    let countSql = 'SELECT COUNT(*) as total FROM needs';
    const params = [];
    const countParams = [];

    if (status !== undefined && status !== '' && status !== null) {
      sql += ' WHERE n.status = ?';
      countSql += ' WHERE status = ?';
      const statusNum = parseInt(status, 10);
      params.push(statusNum);
      countParams.push(statusNum);
    } else {
      sql += ' WHERE n.status != 3';
      countSql += ' WHERE status != 3';
    }

    sql += ` ORDER BY n.created_at DESC LIMIT ${sizeNum} OFFSET ${offsetNum}`;

    const [list] = await pool.execute(sql, params);
    const [countResult] = await pool.execute(countSql, countParams);

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list,
        total: countResult[0].total,
        page: pageNum,
        pageSize: sizeNum
      }
    });
  } catch (err) {
    console.error('need/list error:', err);
    res.json({ code: 500, message: '服务器错误: ' + err.message });
  }
});

router.post('/publish', authMiddleware, async (req, res) => {
  try {
    const { title, description, address, latitude, longitude, reward, type = 'express' } = req.body;
    const userId = req.user.id;

    if (!title || !address) {
      return res.json({ code: 400, message: '标题和地址不能为空' });
    }

    const [result] = await pool.execute(
      'INSERT INTO needs (user_id, type, title, description, address, latitude, longitude, reward) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, type, title, description || '', address, latitude || null, longitude || null, reward || 0]
    );

    res.json({
      code: 200,
      message: '发布成功',
      data: { id: result.insertId }
    });
  } catch (err) {
    console.error(err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

router.post('/accept/:id', authMiddleware, async (req, res) => {
  try {
    const needId = req.params.id;
    const userId = req.user.id;

    const [needs] = await pool.execute('SELECT * FROM needs WHERE id = ?', [needId]);
    if (needs.length === 0) {
      return res.json({ code: 400, message: '需求不存在' });
    }

    const need = needs[0];
    if (need.status !== 0) {
      return res.json({ code: 400, message: '该需求已被接取或已完成' });
    }

    if (need.user_id === userId) {
      return res.json({ code: 400, message: '不能接取自己发布的需求' });
    }

    await pool.execute(
      'UPDATE needs SET status = 1, receiver_id = ? WHERE id = ?',
      [userId, needId]
    );

    await sendMessage(
      need.user_id,
      '需求被接取',
      `您发布的"${need.title}"已被接取`,
      'system',
      needId
    );

    res.json({ code: 200, message: '接取成功' });
  } catch (err) {
    console.error(err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

router.post('/complete/:id', authMiddleware, async (req, res) => {
  try {
    const needId = req.params.id;
    const userId = req.user.id;

    const [needs] = await pool.execute('SELECT * FROM needs WHERE id = ?', [needId]);
    if (needs.length === 0) {
      return res.json({ code: 400, message: '需求不存在' });
    }

    const need = needs[0];
    if (need.user_id !== userId) {
      return res.json({ code: 400, message: '只有发布者才能确认完成' });
    }

    if (need.status !== 1) {
      return res.json({ code: 400, message: '该需求状态不正确' });
    }

    await pool.execute('UPDATE needs SET status = 2 WHERE id = ?', [needId]);

    if (need.receiver_id) {
      await sendMessage(
        need.receiver_id,
        '需求已完成',
        `您接取的"${need.title}"已被确认完成`,
        'system',
        needId
      );
    }

    res.json({ code: 200, message: '确认完成成功' });
  } catch (err) {
    console.error(err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

router.post('/cancel/:id', authMiddleware, async (req, res) => {
  try {
    const needId = req.params.id;
    const userId = req.user.id;

    const [needs] = await pool.execute('SELECT * FROM needs WHERE id = ?', [needId]);
    if (needs.length === 0) {
      return res.json({ code: 400, message: '需求不存在' });
    }

    const need = needs[0];
    if (need.user_id !== userId) {
      return res.json({ code: 400, message: '只有发布者才能取消' });
    }

    if (need.status === 2) {
      return res.json({ code: 400, message: '已完成的需求不能取消' });
    }

    await pool.execute('UPDATE needs SET status = 3 WHERE id = ?', [needId]);

    if (need.receiver_id) {
      await sendMessage(
        need.receiver_id,
        '需求已取消',
        `您接取的"${need.title}"已被发布者取消`,
        'system',
        needId
      );
    }

    res.json({ code: 200, message: '取消成功' });
  } catch (err) {
    console.error(err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

router.get('/my/published', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const [list] = await pool.execute(`
      SELECT n.*, r.nickname as receiver_name
      FROM needs n
      LEFT JOIN users r ON n.receiver_id = r.id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
    `, [userId]);

    res.json({ code: 200, message: '获取成功', data: list });
  } catch (err) {
    console.error(err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

router.get('/my/accepted', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const [list] = await pool.execute(`
      SELECT n.*, u.nickname as publisher_name
      FROM needs n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.receiver_id = ?
      ORDER BY n.created_at DESC
    `, [userId]);

    res.json({ code: 200, message: '获取成功', data: list });
  } catch (err) {
    console.error(err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const needId = req.params.id;
    const [needs] = await pool.execute(`
      SELECT n.*, u.nickname as publisher_name, u.avatar as publisher_avatar,
             u.phone as publisher_phone, r.nickname as receiver_name, r.phone as receiver_phone,
             r.avatar as receiver_avatar
      FROM needs n
      LEFT JOIN users u ON n.user_id = u.id
      LEFT JOIN users r ON n.receiver_id = r.id
      WHERE n.id = ?
    `, [needId]);

    if (needs.length === 0) {
      return res.json({ code: 400, message: '需求不存在' });
    }

    res.json({ code: 200, message: '获取成功', data: needs[0] });
  } catch (err) {
    console.error(err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;
