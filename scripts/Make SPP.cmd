@echo off
rem Makes a .spp from each folder given, beside it. Put a shortcut to this file in
rem Send To (see templates\spp\README.md) to right-click a folder > Send to > SEIHouse Package.
node "%~dp0makeSpp.mjs" %*
echo.
pause
