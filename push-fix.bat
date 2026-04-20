@echo off
cd /d "%~dp0"
echo Removing stale lock files...
del /f .git\HEAD.lock 2>nul
del /f .git\index.lock 2>nul
del /f .git\objects\maintenance.lock 2>nul
echo Stashing uncommitted changes...
git stash
echo Pulling latest from remote...
git pull --rebase origin main
echo Restoring stashed changes...
git stash pop
echo Pushing to production...
git push origin main
echo.
echo Done! Check above for any errors.
pause
