import assert from 'assert';
import { extractDriveFileId, inferExtension, sanitizeFileName, ensureUniqueName } from '../server/imageUtils.js';

const htmlSvg = Buffer.from('<svg></svg>');
const pngBuf = Buffer.from('89504e470d0a1a0a', 'hex');
const jpgBuf = Buffer.from('ffd8ffe0', 'hex');
const pdfBuf = Buffer.from('255044462d312e', 'hex');

assert.strictEqual(extractDriveFileId('https://drive.google.com/file/d/FILE_ID/view?usp=sharing'), 'FILE_ID');
assert.strictEqual(extractDriveFileId('https://drive.google.com/open?id=FILEX'), 'FILEX');
assert.strictEqual(extractDriveFileId('https://drive.google.com/uc?export=download&id=FILEZ'), 'FILEZ');

assert.strictEqual(inferExtension('image/png', pngBuf), 'png');
assert.strictEqual(inferExtension('', jpgBuf), 'jpg');
assert.strictEqual(inferExtension('application/pdf', pdfBuf), 'pdf');
assert.strictEqual(inferExtension('', htmlSvg), 'svg');

assert.strictEqual(sanitizeFileName(' Mi imagen: prueba '), 'Mi_imagen_prueba');
const used = new Set();
const uniqueA = ensureUniqueName('mapa', 'png', used);
const uniqueB = ensureUniqueName('mapa', 'png', used);
assert.strictEqual(uniqueA.fullName, 'mapa.png');
assert.strictEqual(uniqueB.fullName, 'mapa_1.png');

console.log('OK: image utils tests passed');
