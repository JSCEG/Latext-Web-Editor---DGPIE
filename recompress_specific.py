#!/usr/bin/env python3
"""
Script para recomprimir imágenes específicas con más control
"""

import os
from PIL import Image
from pathlib import Path
import shutil

def recompress_image(image_name, quality=90, max_width=2400):
    """
    Recomprime una imagen específica con parámetros más conservadores
    
    Args:
        image_name: nombre del archivo (ej: "figura_6_6.png")
        quality: calidad JPEG (90 = alta calidad)
        max_width: ancho máximo en píxeles (2400 = muy alta resolución)
    """
    
    # Rutas
    backup_path = Path("img_backup") / image_name
    current_path = Path("img") / image_name.replace('.png', '.jpg')
    
    if not backup_path.exists():
        print(f"❌ No se encontró {backup_path}")
        return
    
    print(f"🔄 Recomprimiendo {image_name} con calidad {quality}%...")
    
    try:
        # Tamaño original
        original_size = backup_path.stat().st_size / (1024*1024)
        print(f"   Tamaño original: {original_size:.1f} MB")
        
        with Image.open(backup_path) as img:
            print(f"   Dimensiones originales: {img.size}")
            
            # Convertir a RGB si es necesario
            if img.mode != 'RGB':
                if img.mode in ('RGBA', 'LA', 'P'):
                    # Crear fondo blanco para transparencias
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    if img.mode == 'RGBA':
                        background.paste(img, mask=img.split()[-1])
                        img = background
                else:
                    img = img.convert('RGB')
            
            # Redimensionar solo si es MUY grande
            if img.width > max_width:
                ratio = max_width / img.width
                new_height = int(img.height * ratio)
                img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
                print(f"   Redimensionado a: {img.size}")
            
            # Guardar con alta calidad
            output_path = Path("img") / (Path(image_name).stem + ".jpg")
            img.save(output_path, 'JPEG', quality=quality, optimize=True)
            
            # Tamaño final
            final_size = output_path.stat().st_size / (1024*1024)
            reduction = ((original_size - final_size) / original_size) * 100
            
            print(f"   ✅ Nuevo tamaño: {final_size:.1f} MB")
            print(f"   📉 Reducción: {reduction:.1f}%")
            
            return final_size
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return None

def main():
    print("🎯 RECOMPRESOR DE IMÁGENES ESPECÍFICAS")
    print("=" * 40)
    
    # Recomprimir figura_6_6 con alta calidad
    print("\n1️⃣ Recomprimiendo figura_6_6.png con calidad alta...")
    size1 = recompress_image("figura_6_6.png", quality=90, max_width=2400)
    
    if size1 and size1 > 3:  # Si aún es muy grande
        print(f"\n⚠️  La imagen sigue siendo grande ({size1:.1f} MB)")
        print("2️⃣ Aplicando compresión moderada...")
        size2 = recompress_image("figura_6_6.png", quality=85, max_width=1800)
        
        if size2 and size2 > 2:  # Si todavía es grande
            print(f"\n⚠️  Aún grande ({size2:.1f} MB)")
            print("3️⃣ Compresión final...")
            recompress_image("figura_6_6.png", quality=80, max_width=1400)
    
    print("\n✅ ¡Proceso completado!")
    print("La imagen ha sido recomprimida con mejor balance calidad/tamaño")

if __name__ == "__main__":
    main()