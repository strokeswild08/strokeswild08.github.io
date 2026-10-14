@echo off
setlocal
cd /d "%~dp0"
if not exist build\classes mkdir build\classes
javac --release 17 -Xlint:all -Werror -d build\classes src\shelf\*.java
if errorlevel 1 exit /b 1
jar --create --file AssetShelf.jar --main-class shelf.App -C build\classes .
if errorlevel 1 exit /b 1
echo Built AssetShelf.jar. Run: java -jar AssetShelf.jar
