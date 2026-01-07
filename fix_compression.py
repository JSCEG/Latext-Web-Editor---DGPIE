#!/usr/bin/env python3
"""
Script para arreglar la compresión completa con mejor control
"""

import os
import shutil
from PIL import Image
from pathlib import Path

def restore_and_recompress():
    """Restaura desde backup y recomprime con mejor control"""
    
    print("🔄 RESTAURACIÓN Y RECOMPRESIÓN CONTROLADA")
    print("=" * 50)
    
    # Eliminar carpeta img actual
    img_folder = Path("img")
    if img_folder.exists():
        shutil.rmtree(img_folder)
        print("✅ Carpeta img eliminada")
    
    # Restaurar desde backup
    backup_folder = Path("img_backup")
    if backup_folder.exists():
        shutil.copytree(backup_folder, img_folder)
        print("✅ Imágenes restauradas desde backup")
    else:
        print("❌ No se encontró carpeta de backup")
        return
    
    # Comprimir con diferentes estrategias según tamaño
    total_before = 0
    total_after = 0
    processed = 0
    
    print("\n🎯 Iniciando compresión inteligente...")
    print("-" * 50)
    
    for file_path in img_folder.rglob("*"):
        if file_path.suffix.lower() in ['.png', '.jpg', '.jpeg']:
            try:
                # Tamaño original
                size_mb = file_path.stat().st_size / (1024*1024)
                total_before += size_mb
                
                print(f"\n📁 {file_path.name} ({size_mb:.1f} MB)")
                
                with Image.open(file_path) as img:
                    # Convertir a RGB
                    if img.mode != 'RGB':
                        if img.mode in ('RGBA', 'LA', 'P'):
                            background = Image.new('RGB', img.size, (255, 255, 255))
                            if img.mode == 'P':
                                img = img.convert('RGBA')
                            if img.mode == 'RGBA':
                                background.paste(img, mask=img.split()[-1])
                                img = background
                        else:
                            img = img.convert('RGB')
                    
                    # Estrategia según tamaño original
                    if size_mb > 10:  # Imágenes muy grandes
                        quality = 85
                        max_width = 1800
                        print(f"   🔥 Imagen muy grande - Compresión agresiva")
                    elif size_mb > 5:  # Imágenes grandes
                        quality = 88
                        max_width = 2000
                        print(f"   📊 Imagen grande - Compresión moderada")
                    elif size_mb > 1:  # Imágenes medianas
                        quality = 90
                        max_width = 2400
                        print(f"   📈 Imagen mediana - Compresión suave")
                    else:  # Imágenes pequeñas
                        quality = 92
                        max_width = 3000
                        print(f"   📋 Imagen pequeña - Compresión mínima")
                    
                    # Redimensionar si es necesario
                    original_size = img.size
                    if img.width > max_width:
                        ratio = max_width / img.width
                        new_height = int(img.height * ratio)
                        img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
                        print(f"   📏 Redimensionado: {original_size} → {img.size}")
                    
                    # Guardar como JPG
                    new_path = file_path.with_suffix('.jpg')
                    img.save(new_path, 'JPEG', quality=quality, optimize=True)
                    
                    # Eliminar original si era PNG
                    if file_path.suffix.lower() == '.png':
                        file_path.unlink()
                    
                    # Calcular nuevo tamaño
                    new_size_mb = new_path.stat().st_size / (1024*1024)
                    total_after += new_size_mb
                    reduction = ((size_mb - new_size_mb) / size_mb) * 100
                    
                    print(f"   ✅ {size_mb:.1f} MB → {new_size_mb:.1f} MB (-{reduction:.0f}%)")
                    processed += 1
                    
            except Exception as e:
                print(f"   ❌ Error: {e}")
                total_after += size_mb
    
    # Resumen final
    print("\n" + "=" * 50)
    print("📊 RESUMEN FINAL")
    print("=" * 50)
    print(f"Archivos procesados: {processed}")
    print(f"Tamaño original: {total_before:.1f} MB")
    print(f"Tamaño final: {total_after:.1f} MB")
    if total_before > 0:
        total_reduction = ((total_before - total_after) / total_before) * 100
        print(f"Reducción total: {total_reduction:.0f}%")
    
    print(f"\n🎯 Objetivo: PDF < 10 MB")
    if total_after < 8:
        print("✅ ¡Perfecto! Las imágenes deberían permitir un PDF < 10 MB")
    elif total_after < 12:
        print("⚠️  Puede estar justo en el límite")
    else:
        print("❌ Necesita más compresión")

if __name__ == "__main__":
    restore_and_recompress()