import { computeFigureId, computeTableId, generateManyIds } from '../utils/idUtils.js';

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

// Basic cases
assert(computeTableId('2', '1') === 'TBL-2-1', 'Table ID basic');
assert(computeFigureId('3', '2') === 'FIG-3-2', 'Figure ID basic');
assert(computeTableId('', '5') === 'TBL-5', 'Table ID without section');
assert(computeFigureId('', '7') === 'FIG-7', 'Figure ID without section');

// Uniqueness for 100+
const many = generateManyIds(120);
const uniqueTables = new Set(many.tables);
const uniqueFigures = new Set(many.figures);
assert(uniqueTables.size === many.tables.length, 'Tables IDs are unique');
assert(uniqueFigures.size === many.figures.length, 'Figures IDs are unique');

console.log('OK: idUtils tests passed');
