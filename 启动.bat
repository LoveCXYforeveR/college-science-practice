@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 作品 · 大学课程练习

echo ============================================
echo    作品 · 大学课程练习（本地版）
echo ============================================
echo.
echo   地址：http://localhost:8080
echo.
echo   * 请一直用这个地址打开，记录才会保留
echo   * 不要直接双击 index.html（本地文件模式记录容易丢）
echo   * 关闭这个黑窗口 = 停止服务，记录不会丢
echo   * 记录答一题存一次；换电脑前用「我的 → 导出记录」带走
echo.

set "PY="
where python >nul 2>nul
if not errorlevel 1 set "PY=python"
if not defined PY (
  where py >nul 2>nul
  if not errorlevel 1 set "PY=py"
)
if not defined PY (
  echo [错误] 没有找到 Python，请先安装 Python 3。
  pause
  exit /b 1
)

rem 先安排延时任务：等服务真正起来之后再打开浏览器
rem （旧版是浏览器先开、服务后起，经常先撞上连接失败页）
start "打开浏览器" /min cmd /c "ping -n 3 127.0.0.1 >nul & start http://localhost:8080/"
%PY% -m http.server 8080

echo.
echo [服务已停止] 记录仍保存在浏览器里，下次用本脚本打开即可恢复。
pause
