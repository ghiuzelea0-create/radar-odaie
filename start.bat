@echo off
REM Porneste ambele aplicatii Arca (Windows):
REM   - aplicatia Arca (Flask)  pe http://localhost:5000  - aici introduci datele
REM   - dashboardul Operations  pe http://localhost:3000  - aici vezi situatia
REM
REM Prima rulare instaleaza singura tot ce trebuie si dureaza cateva minute.
REM Oprire: inchide cele doua ferestre care se deschid.

setlocal
set "RADACINA=%~dp0"
set "APP_FLASK=%RADACINA%arca-app"
set "APP_DASHBOARD=%RADACINA%arca-operations"

where python >nul 2>&1
if errorlevel 1 (
  echo.
  echo EROARE: Python nu este instalat. Vezi INSTALARE.md.
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo EROARE: Node.js nu este instalat. Vezi INSTALARE.md.
  pause
  exit /b 1
)

if not exist "%APP_FLASK%\.venv" (
  echo.
  echo ==^> Pregatesc aplicatia Arca ^(prima rulare, dureaza un minut^)...
  python -m venv "%APP_FLASK%\.venv"
  "%APP_FLASK%\.venv\Scripts\pip.exe" install --quiet --upgrade pip
  "%APP_FLASK%\.venv\Scripts\pip.exe" install --quiet -r "%APP_FLASK%\requirements.txt"
)

if not exist "%APP_DASHBOARD%\node_modules" (
  echo.
  echo ==^> Pregatesc dashboardul ^(prima rulare, dureaza cateva minute^)...
  pushd "%APP_DASHBOARD%"
  call npm install --no-audit --no-fund
  popd
)

if not exist "%APP_DASHBOARD%\.next" (
  echo.
  echo ==^> Construiesc dashboardul...
  pushd "%APP_DASHBOARD%"
  call npm run build
  popd
)

echo.
echo ==^> Pornesc aplicatia Arca pe http://localhost:5000
start "Arca - aplicatie" cmd /k "cd /d "%APP_FLASK%" && set PORT=5000 && ".venv\Scripts\python.exe" app.py"

echo ==^> Pornesc dashboardul pe http://localhost:3000
start "Arca - dashboard" cmd /k "cd /d "%APP_DASHBOARD%" && npm run start -- -p 3000"

REM Adresa in reteaua locala, ca sa poti deschide aplicatia si de pe telefon.
set "IP_RETEA="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  if not defined IP_RETEA set "IP_RETEA=%%a"
)
if defined IP_RETEA set "IP_RETEA=%IP_RETEA: =%"

echo.
echo ------------------------------------------------------------
echo   Gata. Deschide in browser:
echo.
echo     Dashboard (situatia zilei)   http://localhost:3000
echo     Aplicatia Arca (introduci)   http://localhost:5000
if defined IP_RETEA (
  echo.
  echo   De pe telefon, pe acelasi Wi-Fi:
  echo.
  echo     Dashboard                    http://%IP_RETEA%:3000
  echo     Aplicatia Arca               http://%IP_RETEA%:5000
)
echo.
echo   Proiectele se adauga in aplicatia Arca, la Management.
echo   Dashboardul le arata dupa ce reincarci pagina.
echo.
echo   Oprire: inchide cele doua ferestre deschise.
echo ------------------------------------------------------------
echo.
pause
