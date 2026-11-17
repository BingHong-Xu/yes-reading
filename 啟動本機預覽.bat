@echo off
chcp 65001 >nul
echo 正在啟動【永貞國小數位閱讀成果網】本機預覽伺服器...
echo 瀏覽器將於 http://127.0.0.1:8080/index.html 開啟（關閉此視窗即停止伺服器）
start "" http://127.0.0.1:8080/index.html
python -m http.server 8080 --bind 127.0.0.1 --directory "%~dp0"
