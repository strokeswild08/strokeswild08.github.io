@echo off
setlocal
if not defined FORGE_UE_ROOT (
  echo Set FORGE_UE_ROOT to your Unreal Engine 5.5 installation directory.
  exit /b 1
)
for %%I in ("%~dp0..\AbilityForge.uproject") do set "FORGE_PROJECT=%%~fI"
call "%FORGE_UE_ROOT%\Engine\Build\BatchFiles\Build.bat" AbilityForgeEditor Win64 Development "%FORGE_PROJECT%" -WaitMutex -NoHotReloadFromIDE
exit /b %errorlevel%
