@echo off
setlocal
cd /d "%~dp0"
if not exist build mkdir build
java com.sun.tools.javac.Main --release 17 -d build src\strokes\quests\*.java
if errorlevel 1 exit /b 1
java -cp build strokes.quests.Main %*
