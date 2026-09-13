@echo off
title Compilador Solanum - Codigo Ofuscado (512KB MAX)

echo ====================================================
echo    COMPILADOR SOLANUM - VERSION OFUSCADA (512KB MAX)
echo ====================================================
echo.

cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js no esta instalado o no se encuentra en el PATH.
    echo Por favor instala Node.js desde https://nodejs.org/
    echo.
    goto END
)

if not exist "node_modules" (
    echo [INFO] Instalando dependencias necesarias...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Fallo la instalacion de dependencias con npm.
        echo.
        goto END
    )
)

echo [INFO] Ejecutando proceso de compilacion y ofuscacion...
echo.
call node compile.js

if errorlevel 1 (
    echo.
    echo [ERROR] La compilacion ha fallado. Revisa los mensajes anteriores.
) else (
    echo.
    echo ====================================================
    echo    COMPILACION FINALIZADA CON EXITO!
    echo    La carpeta "compiled" ya contiene la version lista.
    echo ====================================================
)

:END
echo.
echo Presiona cualquier tecla para cerrar esta ventana...
pause
