const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args)).catch(() => global.fetch(...args));
const { URL } = require('url');
const crypto = require('crypto');

const ALLOWED_HOSTS = new Set([
  'drive.google.com',
  'www.drive.google.com',
  'lh3.googleusercontent.com',
  'googleusercontent.com'
]);

const EXTENSION_BY_CONTENT_TYPE = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf'
};

function sanitizeFileName(name) {
  const base = (name || '').toString().trim().replace(/[\\/:]/g, '_').replace(/\s+/g, '_');
  const cleaned = base.replace(/\.+/g, '.').replace(/\.+$/, '').replace(/\.\./g, '.').replace(/[^A-Za-z0-9_.-]/g, '_');
  const finalName = cleaned || `img_${Date.now()}`;
  return finalName.replace(/_{2,}/g, '_');
}

function extractDriveFileId(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (!ALLOWED_HOSTS.has(parsed.hostname)) return '';
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const fileIdx = pathParts.indexOf('d');
    if (fileIdx !== -1 && pathParts[fileIdx + 1]) return pathParts[fileIdx + 1];
    const altIdx = pathParts.findIndex(p => p === 'uc');
    if (altIdx !== -1 && parsed.searchParams.get('id')) return parsed.searchParams.get('id');
    if (parsed.searchParams.get('id')) return parsed.searchParams.get('id');
    return '';
  } catch (e) {
    return '';
  }
}

function buildDriveDownloadUrl(fileId) {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

function inferExtension(contentType, buffer) {
  if (contentType && EXTENSION_BY_CONTENT_TYPE[contentType.toLowerCase()]) {
    return EXTENSION_BY_CONTENT_TYPE[contentType.toLowerCase()];
  }
  if (!buffer || buffer.length < 4) return '';
  const header = buffer.slice(0, 12).toString('hex');
  if (buffer.slice(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return 'png';
  if (buffer.slice(0, 3).equals(Buffer.from('ffd8ff', 'hex'))) return 'jpg';
  if (buffer.slice(8, 12).toString() === 'WEBP') return 'webp';
  if (header.includes(Buffer.from('<svg', 'utf8').toString('hex'))) return 'svg';
  if (buffer.slice(0, 4).equals(Buffer.from('25504446', 'hex'))) return 'pdf';
  return '';
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const res = await fetch(url, { ...options, signal: controller.signal });
  clearTimeout(timer);
  return res;
}

async function downloadImageToBuffer(originalUrl, opts = {}) {
  const { maxSize = 20 * 1024 * 1024, preferredExt } = opts;
  if (!originalUrl) throw new Error('URL de imagen vacía');

  const parsed = new URL(originalUrl);
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    throw new Error('Dominio no permitido para descarga. Usa enlaces de Google Drive públicos.');
  }

  const fileId = extractDriveFileId(originalUrl);
  let downloadUrl = fileId ? buildDriveDownloadUrl(fileId) : originalUrl;
  let res = await fetchWithTimeout(downloadUrl, { redirect: 'follow' });

  // Detect Google Drive interstitials
  if (res.headers.get('content-type')?.includes('text/html')) {
    const html = await res.text();
    const confirmMatch = html.match(/confirm=([0-9A-Za-z_-]+)&/);
    if (confirmMatch && fileId) {
      const confirmToken = confirmMatch[1];
      const cookie = res.headers.get('set-cookie');
      const headers = cookie ? { Cookie: cookie } : undefined;
      downloadUrl = `${buildDriveDownloadUrl(fileId)}&confirm=${confirmToken}`;
      res = await fetchWithTimeout(downloadUrl, { headers });
    } else {
      throw new Error('Google Drive requiere confirmación o permisos públicos para esta imagen.');
    }
  }

  if (!res.ok) {
    throw new Error(`Error al descargar imagen: ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length > maxSize) {
    throw new Error(`Imagen demasiado grande (${(buffer.length / (1024 * 1024)).toFixed(1)} MB). Máximo permitido ${(maxSize / (1024 * 1024)).toFixed(0)} MB.`);
  }

  const contentType = res.headers.get('content-type') || '';
  const ext = inferExtension(contentType, buffer) || preferredExt || '';
  if (!ext) {
    throw new Error('No se pudo determinar la extensión de la imagen.');
  }

  return { buffer, contentType, extension: ext, downloadUrl };
}

function ensureUniqueName(baseName, ext, used) {
  const base = sanitizeFileName(baseName || 'imagen');
  const cleanExt = (ext || '').replace(/^\./, '') || 'png';
  let candidate = `${base}.${cleanExt}`;
  let counter = 1;
  while (used.has(candidate)) {
    candidate = `${base}_${counter}.${cleanExt}`;
    counter += 1;
  }
  used.add(candidate);
  return { fileName: candidate.split('.')[0], ext: cleanExt, fullName: candidate };
}

function randomName(prefix = 'img') {
  return `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
}

module.exports = {
  sanitizeFileName,
  extractDriveFileId,
  buildDriveDownloadUrl,
  inferExtension,
  downloadImageToBuffer,
  ensureUniqueName,
  randomName
};
