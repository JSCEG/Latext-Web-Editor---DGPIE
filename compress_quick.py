#!/usr/bin/env python3
"""
Script rápido para comprimir imágenes - Versión simplificada
"""

import os
from PIL import Image
from pathlib import Path
import shutil

def compress_all_images():
    """Comprime todas las imágenes de manera rápida y efectiva"""
    
    # Crear backup
    if not os.path.exists("img_backup"):
        shutil.copytree("img", "img_backup")
        print("✅ Backup creado en img_backup/")
    
    img_folder = Path("img")
    total_before = 0
    total_after = 0
    count = 0
    
    # Procesar todas las imágenes
    for file_path in img_folder.rglob("*"):
        if file_path.suffix.lower() in ['.png', '.jpg', '.jpeg', '.bmp']:
            try:
                # Tamaño original
                size_before = file_path.stat().st_size / (1024*1024)
                total_before += size_before
                
                # Abrir y comprimir
                with Image.open(file_path) as img:
                    # Convertir a RGB si es necesario
                    if img.mode != 'RGB':
                        img = img.convert('RGB')
                    
                    # Redimensionar si es muy grande (máximo 3000px de ancho)
                    if img.width > 3000:
                        ratio = 3000 / img.width
                        new_height = int(img.height * ratio)
                        img = img.resize((3000, new_height), Image.Resampling.LANCZOS)
                    
                    # Guardar como JPG con buena calidad
                    new_path = file_path.with_suffix('.jpg')
                    img.save(new_path, 'JPEG', quality=90, optimize=True)
                    
                    # Eliminar original si era PNG
                    if file_path.suffix.lower() == '.png' and new_path != file_path:
                        file_path.unlink()
                
                # Tamaño después
                final_path = file_path.with_suffix('.jpg')
                size_after = final_path.stat().st_size / (1024*1024)
                total_after += size_after
                
                reduction = ((size_before - size_after) / size_before) * 100
                print(f"✓ {file_path.name}: {size_before:.1f}MB → {size_after:.1f}MB (-{reduction:.0f}%)")
                count += 1
                
            except Exception as e:
                print(f"✗ Error con {file_path.name}: {e}")
    
    # Resumen
    print(f"\n📊 RESUMEN:")
    print(f"Archivos procesados: {count}")
    print(f"Tamaño total antes: {total_before:.1f} MB")
    print(f"Tamaño total después: {total_after:.1f} MB")
    print(f"Reducción: {((total_before-total_after)/total_before)*100:.0f}%")
    print(f"Backup en: img_backup/")

if __name__ == "__main__":
    compress_all_images()