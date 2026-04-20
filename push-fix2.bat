@echo off
cd /d "%~dp0"
echo Aborting stuck rebase...
git rebase --abort
echo.
echo Pulling with merge strategy (keeping our admin.html fix)...
git pull origin main --no-rebase -X ours
echo.
echo Pushing to production...
git push origin main
echo.
echo Done! Check above for any errors.
pause
