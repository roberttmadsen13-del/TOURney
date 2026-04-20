@echo off
cd /d "%~dp0"
git add login.html scoreboard.html scorecard.html profile.html vercel.json
git commit -m "feat: add player auth to scoreboard, scorecard, profile + login page"
git push --force origin main
echo.
echo Done\! Auth changes are now live.
pause
