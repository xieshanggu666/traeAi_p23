@echo off
cd backend
echo 正在安装后端依赖...
npm install
echo.
echo 启动后端服务，端口: 4010
node app.js
pause
