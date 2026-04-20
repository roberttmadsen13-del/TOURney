@echo off
cd /d "%~dp0"
echo Killing stuck vim process...
taskkill /f /im vim.exe 2>nul
taskkill /f /im cmd.exe /fi "WINDOWTITLE eq C:\WINDOWS\system32\cmd*" 2>nul
timeout /t 2 /nobreak >nul
echo Cleaning up lock files...
del /f .git\HEAD.lock 2>nul
del /f .git\index.lock 2>nul
del /f .git\MERGE_HEAD 2>nul
del /f .git\MERGE_MSG 2>nul
del /f .git\MERGE_MODE 2>nul
echo Aborting any stuck merge...
set GIT_EDITOR=true
git merge --abort 2>nul
git rebase --abort 2>nul
echo.
echo Pulling with merge (no editor)...
git pull origin main --no-rebase --no-edit -X ours
echo.
echo Pushing to production...
git push origin main
echo.
echo Done! Check above for errors.
pause
