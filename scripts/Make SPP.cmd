@echo off
rem Makes a .spp from each folder given, beside it. Put a shortcut to this file in
rem Send To (see templates\spp\README.md) to right-click a folder > Send to > SEIHouse Package.
rem Each folder is passed on quoted, one at a time, so a path with "&" stays a path.
:args
if "%~1"=="" goto done
node "%~dp0makeSpp.mjs" "%~1"
shift
goto args
:done
echo.
pause
