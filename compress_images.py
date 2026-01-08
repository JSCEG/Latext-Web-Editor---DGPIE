#!/usr/bin/env python3
"""
Script para comprimir imágenes en la carpeta /img manteniendo la mejor calidad posible
Objetivo: Reducir el tamaño del PDF final a menos de 10MB
"""

import os
import sys
from PIL import Image, ImageOps
import shutil
from pathlib import Path

def get_file_size_mb(filepath):
    """Obtiene el tamaño del archivo en MB"""
    return os.path.getsize(filepath) / (1024 * 1024)

def compress_image(input_path, output_path, quality=85, max_width=1920, max_height=1080):
    """
    Comprime una imagen manteniendo buena calidad
    
    Args:
        input_path: Ruta de la imagen original
        output_path: Ruta donde guardar la imagen comprimida
        quality: Calidad JPEG (1-100, 85 es un buen balance)
        max_width: Ancho máximo en píxeles
        max_height: Alto máximo en píxeles
    """
    try:
        with Image.open(input_path) as img:
            # Convertir a RGB si es necesario (para PNG con transparencia)
            if img.mode in ('RGBA', 'LA', 'P'):
                # Crear fondo blanco para transparencias
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Redimensionar si es muy grande
            original_size = img.size
            if img.width > max_width or img.height > max_height:
                img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
                print(f"  Redimensionado de {original_size} a {img.size}")
            
            # Optimizar y guardar como JPEG con calidad específica
            img.save(output_path, 'JPEG', quality=quality, optimize=True, progressive=True)
            
            return True
    except Exception as e:
        print(f"  Error procesando {input_path}: {e}")
        return False

def create_backup_folder():
    """Crea una carpeta de respaldo para las imágenes originales"""
    backup_folder = Path("img_backup")
    if not backup_folder.exists():
        backup_folder.mkdir()
        print(f"Creada carpeta de respaldo: {backup_folder}")
    return backup_folder

def compress_images_in_folder(folder_path, backup_folder, quality=85):
    """Comprime todas las imágenes en una carpeta"""
    folder = Path(folder_path)
    if not folder.exists():
        print(f"La carpeta {folder_path} no existe")
        return
    
    # Extensiones de imagen soportadas
    image_extensions = {'.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif'}
    
    total_original_size = 0
    total_compressed_size = 0
    processed_count = 0
    
    print(f"\nProcesando carpeta: {folder_path}")
    print("-" * 50)
    
    for file_path in folder.rglob('*'):
        if file_path.is_file() and file_path.suffix.lower() in image_extensions:
            # Crear estructura de carpetas en backup
            relative_path = file_path.relative_to(folder)
            backup_path = backup_folder / relative_path
            backup_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Hacer backup del original
            shutil.copy2(file_path, backup_path)
            
            # Obtener tamaño original
            original_size = get_file_size_mb(file_path)
            total_original_size += original_size
            
            print(f"Procesando: {file_path.name} ({original_size:.2f} MB)")
            
            # Comprimir imagen
            temp_path = file_path.with_suffix('.tmp.jpg')
            success = compress_image(file_path, temp_path, quality=quality)
            
            if success:
                # Reemplazar archivo original con versión comprimida
                compressed_size = get_file_size_mb(temp_path)
                
                # Solo reemplazar si la compresión fue efectiva
                if compressed_size < original_size:
                    # Cambiar extensión a .jpg
                    new_path = file_path.with_suffix('.jpg')
                    if new_path != file_path:
                        file_path.unlink()  # Eliminar original
                    temp_path.rename(new_path)
                    
                    total_compressed_size += compressed_size
                    reduction = ((original_size - compressed_size) / original_size) * 100
                    print(f"  ✓ Comprimido: {compressed_size:.2f} MB (-{reduction:.1f}%)")
                else:
                    # Si no hubo mejora, mantener original
                    temp_path.unlink()
                    total_compressed_size += original_size
                    print(f"  → Mantenido original (no hubo mejora)")
            else:
                total_compressed_size += original_size
                print(f"  ✗ Error en compresión, mantenido original")
            
            processed_count += 1
    
    # Mostrar resumen
    print("\n" + "=" * 50)
    print("RESUMEN DE COMPRESIÓN")
    print("=" * 50)
    print(f"Archivos procesados: {processed_count}")
    print(f"Tamaño original total: {total_original_size:.2f} MB")
    print(f"Tamaño comprimido total: {total_compressed_size:.2f} MB")
    if total_original_size > 0:
        total_reduction = ((total_original_size - total_compressed_size) / total_original_size) * 100
        print(f"Reducción total: {total_reduction:.1f}%")
    print(f"Respaldo guardado en: {backup_folder}")

def main():
    """Función principal"""
    print("🖼️  COMPRESOR DE IMÁGENES PARA PDF")
    print("=" * 50)
    print("Objetivo: Reducir tamaño de imágenes para PDF < 10MB")
    print("Manteniendo la mejor calidad posible")
    
    # Crear carpeta de respaldo
    backup_folder = create_backup_folder()
    
    # Comprimir imágenes con diferentes niveles de calidad
    img_folder = Path("img")
    
    if not img_folder.exists():
        print("❌ No se encontró la carpeta 'img'")
        return
    
    # Primer intento con calidad alta (92)
    print("\n🔄 Iniciando compresión con calidad alta (92%)...")
    compress_images_in_folder(img_folder, backup_folder, quality=92)
    
    # Calcular tamaño total actual
    total_size = sum(get_file_size_mb(f) for f in img_folder.rglob('*') if f.is_file())
    print(f"\n📊 Tamaño total actual de imágenes: {total_size:.2f} MB")
    
    # Si aún es muy grande, ofrecer compresión adicional
    if total_size > 8:  # Dejamos margen para el resto del PDF
        print("\n⚠️  Las imágenes aún ocupan mucho espacio.")
        response = input("¿Deseas aplicar compresión adicional? (s/n): ").lower().strip()
        
        if response == 's':
            print("\n🔄 Aplicando compresión adicional (calidad 70%)...")
            compress_images_in_folder(img_folder, backup_folder, quality=70)
            
            total_size = sum(get_file_size_mb(f) for f in img_folder.rglob('*') if f.is_file())
            print(f"\n📊 Tamaño final de imágenes: {total_size:.2f} MB")
    
    print("\n✅ ¡Compresión completada!")
    print(f"📁 Originales respaldados en: {backup_folder}")
    print("\n💡 Consejos:")
    print("- Si el PDF sigue siendo muy grande, puedes ejecutar el script nuevamente")
    print("- Los originales están seguros en la carpeta de respaldo")
    print("- Para restaurar originales, copia desde img_backup/ a img/")

if __name__ == "__main__":
    main()