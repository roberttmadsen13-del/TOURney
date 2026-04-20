@echo off
cd /d "%~dp0"
set GIT_EDITOR=true
set GIT_MERGE_AUTOEDIT=no
echo Step 1: Stashing uncommitted changes...
git stash
echo.
echo Step 2: Pulling remote changes...
git pull --no-edit origin main
echo.
echo Step 3: Restoring stashed changes...
git stash pop
echo.
echo Step 4: Pushing to production...
git push origin main
echo.
echo === DONE ===
pause
