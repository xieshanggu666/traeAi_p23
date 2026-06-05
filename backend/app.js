const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./config/db');

const userRoutes = require('./routes/user');
const needRoutes = require('./routes/need');
const messageRoutes = require('./routes/message');
const profileRoutes = require('./routes/profile');

const app = express();
const PORT = 4010;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + Math.random().toString(36).slice(2, 8) + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件格式'));
    }
  }
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.json({ code: 400, message: '请选择文件' });
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({ code: 200, message: '上传成功', data: { url } });
});

app.use('/api/user', userRoutes);
app.use('/api/need', needRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/profile', profileRoutes);

app.get('/api/health', (req, res) => {
  res.json({ code: 200, message: '服务运行正常', data: { time: new Date().toISOString() } });
});

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`社区互助平台后端服务已启动，端口: ${PORT}`);
    console.log(`健康检查: http://localhost:${PORT}/api/health`);
  });
});
