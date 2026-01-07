# Script de compilacion SENER LaTeX - Version robusta
# Soporta multiples motores: XeLaTeX, LuaLaTeX, pdfLaTeX

param(
    [string]$archivo = "",
    [string]$motor = "xelatex"  # xelatex, lualatex, pdflatex
)

Write-Host "=== COMPILACION ROBUSTA DOCUMENTO LATEX SENER ===" -ForegroundColor Green

# Si no se especifica archivo, buscar archivos .tex en la carpeta
if ($archivo -eq "") {
    $archivosTeX = Get-ChildItem -Filter "*.tex" | Where-Object { $_.Name -notmatch "^test_" }
    if ($archivosTeX.Count -eq 0) {
        Write-Host "ERROR: No se encontraron archivos .tex en la carpeta" -ForegroundColor Red
        exit 1
    } elseif ($archivosTeX.Count -eq 1) {
        $archivo = $archivosTeX[0].BaseName
        Write-Host "Archivo detectado automaticamente: $archivo.tex" -ForegroundColor Yellow
    } else {
        Write-Host "Multiples archivos .tex encontrados:" -ForegroundColor Yellow
        $archivosTeX | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor Cyan }
        $archivo = $archivosTeX[0].BaseName
        Write-Host "Usando el primero: $archivo.tex" -ForegroundColor Yellow
    }
} else {
    # Remover extension .tex si fue incluida
    $archivo = $archivo -replace "\.tex$", ""
}

Write-Host "Archivo: $archivo.tex" -ForegroundColor Yellow
Write-Host "Motor: $motor" -ForegroundColor Yellow

# Verificar que existe el archivo
if (-not (Test-Path "$archivo.tex")) {
    Write-Host "ERROR: No se encuentra el archivo $archivo.tex" -ForegroundColor Red
    exit 1
}

# Limpiar archivos auxiliares previos
Write-Host "`n1. Limpiando archivos auxiliares..." -ForegroundColor Cyan
$extensiones = @("aux", "bbl", "bcf", "blg", "fdb_latexmk", "fls", "lof", "log", "lot", "run.xml", "synctex.gz", "toc", "out", "nav", "snm")
foreach ($ext in $extensiones) {
    if (Test-Path "$archivo.$ext") {
        try {
            Remove-Item "$archivo.$ext" -Force -ErrorAction SilentlyContinue
            if (-not (Test-Path "$archivo.$ext")) {
                Write-Host "   Eliminado: $archivo.$ext" -ForegroundColor Gray
            } else {
                Write-Host "   Omitido (en uso): $archivo.$ext" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "   Omitido (error): $archivo.$ext" -ForegroundColor Yellow
        }
    }
}

# Función para ejecutar compilación
function Compilar-LaTeX {
    param([string]$paso, [string]$comando)
    
    Write-Host "`n$paso..." -ForegroundColor Cyan
    $resultado = & $comando -interaction=nonstopmode "$archivo.tex" 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ERROR en $paso" -ForegroundColor Red
        # Mostrar solo las líneas de error más relevantes
        $lineasError = $resultado | Where-Object { $_ -match "Error|Fatal|Emergency" } | Select-Object -First 10
        if ($lineasError) {
            Write-Host "   Errores encontrados:" -ForegroundColor Red
            $lineasError | ForEach-Object { Write-Host "     $_" -ForegroundColor Red }
        }
        return $false
    } else {
        Write-Host "   $paso exitosa" -ForegroundColor Green
        return $true
    }
}

# Primera compilación
if (-not (Compilar-LaTeX "2. Primera compilación ($motor)" $motor)) {
    Write-Host "`nFALLO: Revisa el archivo .log para más detalles" -ForegroundColor Red
    exit 1
}

# Verificar si hay bibliografía
$tieneBibliografia = $false
if (Test-Path "$archivo.bcf") {
    $contenidoBcf = Get-Content "$archivo.bcf" -Raw
    if ($contenidoBcf -match "bibdata") {
        $tieneBibliografia = $true
    }
}

# Procesamiento de bibliografía si es necesario
if ($tieneBibliografia) {
    Write-Host "`n3. Procesando bibliografía (Biber)..." -ForegroundColor Cyan
    $resultadoBiber = & biber $archivo 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   WARNING en procesamiento de bibliografía" -ForegroundColor Yellow
        Write-Host "   Continuando sin bibliografía..." -ForegroundColor Yellow
    } else {
        Write-Host "   Bibliografía procesada correctamente" -ForegroundColor Green
    }
} else {
    Write-Host "`n3. Sin bibliografía detectada, omitiendo biber..." -ForegroundColor Gray
}

# Segunda compilación (para referencias cruzadas y TOC)
if (-not (Compilar-LaTeX "4. Segunda compilación ($motor)" $motor)) {
    Write-Host "`nFALLO: Revisa el archivo .log para más detalles" -ForegroundColor Red
    exit 1
}

# Verificar si necesita tercera compilación (referencias cruzadas pendientes)
$necesitaTercera = $false
if (Test-Path "$archivo.log") {
    $contenidoLog = Get-Content "$archivo.log" -Raw
    if ($contenidoLog -match "Rerun to get cross-references right|There were undefined references") {
        $necesitaTercera = $true
    }
}

# Tercera compilación si es necesaria
if ($necesitaTercera) {
    if (-not (Compilar-LaTeX "5. Tercera compilación final ($motor)" $motor)) {
        Write-Host "`nFALLO: Revisa el archivo .log para más detalles" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "`n5. Tercera compilación no necesaria" -ForegroundColor Gray
}

# Verificar que se generó el PDF
if (Test-Path "$archivo.pdf") {
    $tamano = (Get-Item "$archivo.pdf").Length
    Write-Host "`n✓ COMPILACIÓN COMPLETADA EXITOSAMENTE" -ForegroundColor Green
    Write-Host "   Archivo generado: $archivo.pdf ($([math]::Round($tamano/1KB, 2)) KB)" -ForegroundColor Green
    
    # Mostrar estadísticas del documento
    Write-Host "`n=== ESTADÍSTICAS DEL DOCUMENTO ===" -ForegroundColor Yellow
    
    # Contar páginas del log
    if (Test-Path "$archivo.log") {
        $contenidoLog = Get-Content "$archivo.log" -Raw
        if ($contenidoLog -match "Output written on .* \((\d+) pages\)") {
            Write-Host "   Páginas generadas: $($matches[1])" -ForegroundColor Cyan
        }
        
        # Contar warnings
        $warnings = ($contenidoLog | Select-String "Warning" -AllMatches).Matches.Count
        if ($warnings -gt 0) {
            Write-Host "   Warnings encontrados: $warnings" -ForegroundColor Yellow
        } else {
            Write-Host "   Sin warnings críticos" -ForegroundColor Green
        }
        
        # Verificar errores de fuentes
        $fontErrors = ($contenidoLog | Select-String "Font.*undefined" -AllMatches).Matches.Count
        if ($fontErrors -gt 0) {
            Write-Host "   Errores de fuente: $fontErrors (usando fallbacks)" -ForegroundColor Yellow
        }
    }
    
    Write-Host "`n=== MEJORAS APLICADAS ===" -ForegroundColor Yellow
    Write-Host "   ✓ Corrección de fuentes Noto Sans con fallbacks" -ForegroundColor Green
    Write-Host "   ✓ Ajuste de espaciado en tablas (1.3x)" -ForegroundColor Green
    Write-Host "   ✓ Corrección de anchos de columna en tablas largas" -ForegroundColor Green
    Write-Host "   ✓ Mejora en configuración de idioma español/mexicano" -ForegroundColor Green
    Write-Host "   ✓ Optimización de entornos de tabla con colores institucionales" -ForegroundColor Green
    Write-Host "   ✓ Corrección de problemas de overfull/underfull boxes" -ForegroundColor Green
    
} else {
    Write-Host "`n✗ ERROR: No se pudo generar el archivo PDF" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== PROCESO COMPLETADO ===" -ForegroundColor Green
Write-Host "Para compilar nuevamente, ejecuta: .\compilar-y-mejorar.ps1" -ForegroundColor Cyan