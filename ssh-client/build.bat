@echo off
echo [1/3] Installation des dependances...
pip install -r requirements.txt

echo [2/3] Compilation en .exe...
pyinstaller --onefile --windowed --name "cmdmem-ssh" --clean main.py

echo [3/3] Termine !
echo L'exe se trouve dans : dist\cmdmem-ssh.exe
pause
