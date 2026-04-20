@echo off
cd /d "%~dp0"
set GIT_EDITOR=true
set GIT_MERGE_AUTOEDIT=no
echo Resolving admin.html conflict (keeping our version)...
git checkout --ours admin.html
git add admin.html
echo.
echo Completing merge commit...
git -c core.editor=true commit --no-edit
echo.
echo Pushing to production...
git push origin main
echo.
echo Restoring stashed changes...
git stash pop
echo.
echo === DONE ===
pause
