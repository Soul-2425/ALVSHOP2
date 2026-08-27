import { supabase } from '../supabaseClient';

/**
 * Comprime un archivo de imagen en el navegador usando un elemento Canvas off-screen.
 * Reduce fotos de cámaras de teléfonos móviles (2MB - 12MB) a un formato WebP/JPEG optimizado (<150KB)
 * preservando la legibilidad de números de cuenta, boletas y textos.
 * 
 * @param {File|Blob} file - Archivo de imagen original
 * @param {Object} options - Opciones de compresión (maxWidth, maxHeight, quality)
 * @returns {Promise<{ file: Blob, dataUrl: string }>}
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.75,
    mimeType = 'image/webp'
  } = options;

  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file provided for compression'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calcular nuevas dimensiones manteniendo la relación de aspecto
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve({ file, dataUrl: event.target.result });
        }

        // Suavizado de imagen de alta calidad
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a Data URL
        let dataUrl = '';
        try {
          dataUrl = canvas.toDataURL(mimeType, quality);
        } catch (e) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        // Convertir a Blob/File
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve({ file, dataUrl });
            }
            const compressedFile = new File([blob], file.name ? file.name.replace(/\.[^/.]+$/, '.webp') : 'receipt.webp', {
              type: blob.type || mimeType,
              lastModified: Date.now()
            });
            resolve({ file: compressedFile, dataUrl });
          },
          mimeType,
          quality
        );
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Procesa y sube un comprobante de pago:
 * 1. Comprime la imagen en el cliente para que sea ultra-liviana (<150KB).
 * 2. Intenta subirla al Storage de Supabase (bucket 'avatars' o 'receipts').
 * 3. Si el Storage responde con la URL pública, la retorna.
 * 4. Si el Storage falla o está desconectado, retorna el Base64 comprimido (que cabe sin problemas en la BD).
 * 
 * @param {File|Blob} file - Archivo de comprobante
 * @param {string} folder - Carpeta destino en storage (por defecto 'receipts')
 * @returns {Promise<{ url: string, preview: string, size: number }>}
 */
export async function uploadOptimizedReceipt(file, folder = 'receipts') {
  if (!file) return { url: null, preview: null, size: 0 };

  try {
    // 1. Compresión en cliente
    const { file: compressedFile, dataUrl } = await compressImage(file, {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.75
    });

    let publicUrl = null;

    // 2. Intento de subida a Supabase Storage
    try {
      const fileExt = (compressedFile.name || 'receipt.webp').split('.').pop();
      const fileName = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, compressedFile, { upsert: true });

      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        if (urlData?.publicUrl) {
          publicUrl = urlData.publicUrl;
        }
      }
    } catch (storageErr) {
      console.warn('Supabase storage direct upload notice (using fallback compressed data URL):', storageErr);
    }

    // Retorna la URL pública si se subió, o el dataUrl comprimido liviano
    return {
      url: publicUrl || dataUrl,
      preview: dataUrl,
      size: compressedFile.size
    };
  } catch (err) {
    console.error('Error in uploadOptimizedReceipt:', err);
    // Fallback de emergencia: lectura directa
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve({ url: reader.result, preview: reader.result, size: file.size });
      reader.onerror = () => resolve({ url: null, preview: null, size: 0 });
      reader.readAsDataURL(file);
    });
  }
}
