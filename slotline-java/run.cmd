@echo off
cd /d "%~dp0"
if exist "release\slotline.jar" (
  java -jar "release\slotline.jar" %*
) else if exist "target\slotline-1.0.0.jar" (
  java -jar "target\slotline-1.0.0.jar" %*
) else (
  echo Build the project first: mvnw.cmd clean package
  exit /b 1
)
