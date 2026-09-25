@echo off
rem Starts the PCMania website on this PC so the app on the phone can reach it over Wi-Fi.
rem
rem The server lives in its own repository (PC-Mania). This script only locates that checkout
rem and hands over to its start-for-phone.cmd, which finds the Wi-Fi address, offers the
rem firewall rule and prints what to type into the app's "Serveri" field.
rem
rem If the server is somewhere unusual, say where before running it:
rem     set "PCMANIA_SERVER=D:\code\PC-Mania"
rem
rem An optional port is passed straight through:  start-server-for-phone.cmd 8071
setlocal enabledelayedexpansion
title PCMania - server per telefon
cd /d "%~dp0"

set "SERVER="
if defined PCMANIA_SERVER if exist "%PCMANIA_SERVER%\start-for-phone.cmd" set "SERVER=%PCMANIA_SERVER%"

if not defined SERVER (
  for %%D in (
    "%~dp0..\PC-Mania"
    "%~dp0..\PCMania"
    "%USERPROFILE%\Desktop\PC-Mania"
    "%USERPROFILE%\Desktop\PCMania"
  ) do (
    if not defined SERVER if exist "%%~D\start-for-phone.cmd" set "SERVER=%%~fD"
  )
)

if not defined SERVER (
  echo.
  echo Nuk u gjet projekti i serverit.
  echo.
  echo Klonojeni prane ketij dosjeje:
  echo     git clone https://github.com/DDDD-stack/PC-Mania.git
  echo.
  echo ose tregoni ku ndodhet dhe provoni perseri:
  echo     set "PCMANIA_SERVER=C:\rruga\drejt\PC-Mania"
  echo.
  pause
  exit /b 1
)

echo Serveri u gjet te: !SERVER!
echo.
call "!SERVER!\start-for-phone.cmd" %*
