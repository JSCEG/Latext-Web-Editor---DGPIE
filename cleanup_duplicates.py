#!/usr/bin/env python3
"""
Script para limpiar archivos duplicados PNG/JPG después de la compresión
"""

import os
from pathlib import Path

def cleanup_duplicates():
    """Elimina archivos PNG que tienen su equivalente JPG comprimido"""
    
    img_folder = Path("img")
    removed_count = 0
    space_freed = 0
    
    print("🧹 LIMPIEZA DE ARCHIVOS DUPLICADOS")
    print("=" * 40)
    
    # Buscar todos los archivos JPG
    jpg_files = list(img_folder.rglob("*.jpg"))
    
    for jpg_file in jpg_files:
        # Buscar el PNG equivalente
        png_file = jpg_file.with_suffix('.png')
        
        if png_file.exists():
            # Obtener tamaños
            png_size = png_file.stat().st_size / (1024*1024)
            jpg_size = jpg_file.stat().st_size / (1024*1024)
            
            print(f"📁 {png_file.name}:")
            print(f"   PNG: {png_size:.1f} MB")
            print(f"   JPG: {jpg_size:.1f} MB")
            
            # Eliminar el PNG
            png_file.unlink()
            removed_count += 1
            space_freed += png_size
            
            print(f"   ✅ PNG eliminado (liberados {png_size:.1f} MB)")
            print()
    
    print("=" * 40)
    print(f"📊 RESUMEN DE LIMPIEZA:")
    print(f"Archivos PNG eliminados: {removed_count}")
    print(f"Espacio liberado: {space_freed:.1f} MB")
    
    # Calcular tamaño total final
    total_size = sum(f.stat().st_size for f in img_folder.rglob('*') if f.is_file()) / (1024*1024)
    print(f"Tamaño total final: {total_size:.1f} MB")

if __name__ == "__main__":
    cleanup_duplicates()