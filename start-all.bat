@echo off
echo ========================================
echo      社区互助平台 - 启动脚本
echo ========================================
echo.

echo [1/2] 正在启动后端服务...
start "后端服务" cmd /k "cd backend && npm install && node app.js"

echo.
echo 等待后端服务启动...
timeout /t 5

echo.
echo [2/2] 正在启动前端服务...
start "前端服务" cmd /k "cd frontend && npm install && npm run dev"

echo.
echo ========================================
echo  启动完成！
echo  后端地址: http://localhost:4010
echo  前端地址: http://localhost:5173
echo ========================================
echo.
pause
