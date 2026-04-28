@echo off
cd /d "C:\Users\Rob\Documents\Greenskeeper Studios\Bova Invitational"
"C:\Program Files\Git\cmd\git.exe" add -A
"C:\Program Files\Git\cmd\git.exe" commit -m "fix: root URL now serves marketing page"
"C:\Program Files\Git\cmd\git.exe" push origin main
echo DONE
pause
