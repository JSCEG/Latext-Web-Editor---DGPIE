@echo off
echo ========================================
echo    COMPRESOR DE IMAGENES PARA PDF
echo ========================================
echo.

REM Verificar si Python está instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python no está instalado o no está en el PATH
    echo Por favor instala Python desde https://python.org
    pause
    exit /b 1
)

echo ✓ Python encontrado

REM Instalar dependencias
echo.
echo Instalando dependencias...
pip install -r requirements_compress.txt

if errorlevel 1 (
    echo.
    echo ERROR: No se pudieron instalar las dependencias
    echo Intentando con pip3...
    pip3 install Pillow
)

echo.
echo ========================================
echo Iniciando compresión de imágenes...
echo ========================================
echo.

REM Ejecutar el script de compresión
python compress_quick.py

echo.
echo ========================================
echo ¡Proceso completado!
echo ========================================
echo.
echo Las imágenes han sido comprimidas.
echo Los archivos originales están respaldados en img_backup/
echo.
pause