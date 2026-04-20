@echo off
cd /d "%~dp0"
set GIT_EDITOR=true
set GIT_MERGE_AUTOEDIT=no

echo Step 1: Cleaning lock files...
del /f .git\index.lock 2>nul
del /f .git\HEAD.lock 2>nul

echo Step 2: Saving scorecard.html to temp...
copy /y scorecard.html "%TEMP%\scorecard_backup.html" >nul

echo Step 3: Discarding all local changes and resetting to origin/main...
git checkout -- .
git clean -fd 2>nul
git fetch origin
git reset --hard origin/main

echo Step 4: Restoring scorecard.html with our changes...
copy /y "%TEMP%\scorecard_backup.html" scorecard.html >nul

echo Step 5: Committing and pushing...
git add scorecard.html
git commit -m "feat(scorecard): simplify setup - auto-detect player from profile, single opponent, auto-discover opp2 via realtime"
git push origin main

echo.
del /f push-scorecard.bat
echo === DONE ===
pause
