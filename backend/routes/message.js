const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/list', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [systemMsgs] = await pool.execute(
      `SELECT id, type, title, content, is_read, related_id, created_at, '' as sender_name, '' as sender_avatar, 0 as unread_count
       FROM messages WHERE user_id = ? AND type != 'private'
       ORDER BY created_at DESC`,
      [userId]
    );

    const [conversations] = await pool.execute(
      `SELECT
        pm.latest_id as id,
        'private' as type,
        CONCAT(u.nickname, '的对话') as title,
        pm.latest_content as content,
        CASE WHEN pm.unread_count > 0 THEN 0 ELSE 1 END as is_read,
        CASE WHEN pm.other_user_id = pm.latest_sender_id THEN pm.latest_sender_id ELSE pm.latest_receiver_id END as related_id,
        pm.latest_time as created_at,
        u.nickname as sender_name,
        u.avatar as sender_avatar,
        pm.unread_count
       FROM (
         SELECT
           other_user_id,
           MAX(id) as latest_id,
           (SELECT content FROM private_messages WHERE id = MAX(pm2.id)) as latest_content,
           (SELECT sender_id FROM private_messages WHERE id = MAX(pm2.id)) as latest_sender_id,
           (SELECT receiver_id FROM private_messages WHERE id = MAX(pm2.id)) as latest_receiver_id,
           MAX(created_at) as latest_time,
           SUM(CASE WHEN receiver_id = ? AND is_read = 0 THEN 1 ELSE 0 END) as unread_count
         FROM (
           SELECT
             CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as other_user_id,
             id, sender_id, receiver_id, content, is_read, created_at
           FROM private_messages
           WHERE sender_id = ? OR receiver_id = ?
         ) pm2
         GROUP BY other_user_id
       ) pm
       JOIN users u ON u.id = pm.other_user_id
       ORDER BY pm.latest_time DESC`,
      [userId, userId, userId, userId]
    );

    const allMessages = [...conversations, ...systemMsgs];
    allMessages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ code: 200, message: '获取成功', data: allMessages });
  } catch (err) {
    console.error('get message list error:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

router.get('/unread/count', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const [sysResult] = await pool.execute(
      'SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND is_read = 0 AND type != ?',
      [userId, 'private']
    );
    const [pmResult] = await pool.execute(
      'SELECT COUNT(*) as count FROM private_messages WHERE receiver_id = ? AND is_read = 0',
      [userId]
    );
    const total = (sysResult[0].count || 0) + (pmResult[0].count || 0);
    res.json({ code: 200, message: '获取成功', data: { count: total } });
  } catch (err) {
    console.error(err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

router.get('/chat/:userId', authMiddleware, async (req, res) => {
  try {
    const myId = req.user.id;
    const otherUserId = parseInt(req.params.userId, 10);
    if (isNaN(otherUserId)) {
      return res.json({ code: 400, message: '用户ID无效' });
    }

    const [messages] = await pool.execute(
      `SELECT pm.*, u.nickname as sender_name, u.avatar as sender_avatar
       FROM private_messages pm
       JOIN users u ON pm.sender_id = u.id
       WHERE (pm.sender_id = ? AND pm.receiver_id = ?) OR (pm.sender_id = ? AND pm.receiver_id = ?)
       ORDER BY pm.created_at ASC`,
      [myId, otherUserId, otherUserId, myId]
    );

    await pool.execute(
      'UPDATE private_messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0',
      [otherUserId, myId]
    );

    res.json({ code: 200, message: '获取成功', data: messages });
  } catch (err) {
    console.error('get chat error:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

router.post('/read/:id', authMiddleware, async (req, res) => {
  try {
    const messageId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    const [messages] = await pool.execute(
      'SELECT * FROM messages WHERE id = ? AND user_id = ?',
      [messageId, userId]
    );

    if (messages.length > 0) {
      await pool.execute('UPDATE messages SET is_read = 1 WHERE id = ?', [messageId]);
      return res.json({ code: 200, message: '标记成功' });
    }

    const [pmessages] = await pool.execute(
      'SELECT * FROM private_messages WHERE id = ? AND (sender_id = ? OR receiver_id = ?)',
      [messageId, userId, userId]
    );

    if (pmessages.length > 0) {
      if (pmessages[0].receiver_id === userId) {
        await pool.execute('UPDATE private_messages SET is_read = 1 WHERE id = ?', [messageId]);
      }
      return res.json({ code: 200, message: '标记成功' });
    }

    return res.json({ code: 400, message: '消息不存在' });
  } catch (err) {
    console.error(err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

router.post('/read/conversation/:userId', authMiddleware, async (req, res) => {
  try {
    const myId = req.user.id;
    const otherUserId = parseInt(req.params.userId, 10);
    
    if (isNaN(otherUserId)) {
      return res.json({ code: 400, message: '用户ID无效' });
    }

    await pool.execute(
      'UPDATE private_messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0',
      [otherUserId, myId]
    );

    res.json({ code: 200, message: '标记成功' });
  } catch (err) {
    console.error('mark conversation read error:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

router.post('/read/all', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    await pool.execute('UPDATE messages SET is_read = 1 WHERE user_id = ?', [userId]);
    await pool.execute('UPDATE private_messages SET is_read = 1 WHERE receiver_id = ?', [userId]);
    res.json({ code: 200, message: '全部已读' });
  } catch (err) {
    console.error(err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

router.post('/send', authMiddleware, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, content } = req.body;

    if (!receiverId || !content || content.trim() === '') {
      return res.json({ code: 400, message: '接收者和内容不能为空' });
    }

    const receiverIdNum = parseInt(receiverId, 10);
    if (isNaN(receiverIdNum)) {
      return res.json({ code: 400, message: '接收者ID无效' });
    }

    if (receiverIdNum === senderId) {
      return res.json({ code: 400, message: '不能给自己发送私信' });
    }

    const [receivers] = await pool.execute('SELECT id FROM users WHERE id = ?', [receiverIdNum]);
    if (receivers.length === 0) {
      return res.json({ code: 400, message: '接收者不存在' });
    }

    await pool.execute(
      'INSERT INTO private_messages (sender_id, receiver_id, content, is_read) VALUES (?, ?, ?, 0)',
      [senderId, receiverIdNum, content.trim()]
    );

    res.json({ code: 200, message: '发送成功' });
  } catch (err) {
    console.error('send message error:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;
