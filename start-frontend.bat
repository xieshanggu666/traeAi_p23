@echo off
cd frontend
echo 正在安装前端依赖...
npm install
echo.
echo 启动前端开发服务，端口: 5173
npm run dev
pause
