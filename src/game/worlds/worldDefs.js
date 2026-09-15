/**
 * The eight locations the run cycles through, one every 250 points.
 *
 * Each entry is a flat parameter object rather than draw code: WorldBuilder
 * reads these to generate every texture procedurally, so a world is retuned by
 * changing numbers here, never by editing rendering logic.
 *
 * `seed` makes each world's scatter deterministic — the same skyline every run.
 */

export const WORLD_SPAN = 250; // points between world changes

const WORLDS = [
  {
    key: 'expressway',
    name: 'SG EXPRESSWAY',
    ground:   { top: 0x7EC850, bottom: 0x4E9A38 },
    road:     { surface: 0x6B7A99, line: 0xFFD24A, edge: 0xFFFFFF },
    decor:    { type: 'blocks', colors: [0xE8E2D0, 0xCFC7B0, 0xF2EDE0], lit: 0xFFD24A, density: 3 },
    particle: { type: 'none' },
    palette:  { bg: '#E8F6E0', accent: '#1D4ED8', accent2: '#FFAA00', ink: '#0F172A', glow: 'rgba(255,170,0,0.35)' },
  },
  {
    key: 'sunset',
    name: 'SUNSET COAST',
    ground:   { top: 0xF4A261, bottom: 0xE9C46A },
    road:     { surface: 0x8A7A70, line: 0xFFE8B0, edge: 0xFFF3DC },
    decor:    { type: 'palms', colors: [0x2F6B4F, 0x3F8A63], lit: 0xE76F51, density: 4 },
    particle: { type: 'glint', color: 0xFFF1C9, count: 26, speedRatio: 0.55 },
    palette:  { bg: '#FFF1DC', accent: '#E76F51', accent2: '#FF006E', ink: '#3A1F14', glow: 'rgba(231,111,81,0.4)' },
  },
  {
    key: 'tokyo',
    name: 'NEON TOKYO',
    ground:   { top: 0x5B4B9E, bottom: 0x3D3470 },
    road:     { surface: 0x4A4370, line: 0x00FFFF, edge: 0xFF71CE },
    decor:    { type: 'signs', colors: [0xFF1493, 0x00FFFF, 0xBF00FF], lit: 0xFFFFFF, density: 5 },
    particle: { type: 'rain', color: 0xBFE9FF, count: 46, speedRatio: 1.7 },
    palette:  { bg: '#F3E8FF', accent: '#BF00FF', accent2: '#00FFFF', ink: '#241B4A', glow: 'rgba(191,0,255,0.4)' },
  },
  {
    key: 'nyc',
    name: 'NYC TOWERS',
    ground:   { top: 0x8A97A8, bottom: 0x6E7B8B },
    road:     { surface: 0x5D6675, line: 0xFFD24A, edge: 0xF2F4F8 },
    decor:    { type: 'towers', colors: [0x9FB0C4, 0x7D8FA6, 0xB8C6D6], lit: 0xFFE9A8, density: 4 },
    particle: { type: 'none' },
    palette:  { bg: '#EEF2F8', accent: '#B45309', accent2: '#FFAA00', ink: '#16202E', glow: 'rgba(255,170,0,0.35)' },
  },
  {
    key: 'canyon',
    name: 'DESERT CANYON',
    ground:   { top: 0xF0B357, bottom: 0xD98A3A },
    road:     { surface: 0x9A7F63, line: 0xFFF0C4, edge: 0xFFE3A8 },
    decor:    { type: 'mesas', colors: [0xB7472A, 0xC9613C, 0x8F3520], lit: 0xF9A620, density: 3 },
    particle: { type: 'dust', color: 0xF7E6C4, count: 34, speedRatio: 1.25 },
    palette:  { bg: '#FFF3E0', accent: '#B7472A', accent2: '#F9A620', ink: '#3B1D10', glow: 'rgba(249,166,32,0.4)' },
  },
  {
    key: 'arctic',
    name: 'ARCTIC PASS',
    ground:   { top: 0xE8F2FC, bottom: 0xC3DBF2 },
    road:     { surface: 0x93AFC9, line: 0xFFFFFF, edge: 0xDCEBF8 },
    decor:    { type: 'peaks', colors: [0xA8CBEA, 0x86B0DA, 0xD6E9F8], lit: 0xFFFFFF, density: 3 },
    particle: { type: 'snow', color: 0xFFFFFF, count: 52, speedRatio: 0.85 },
    palette:  { bg: '#EAF4FF', accent: '#4A6FA5', accent2: '#22D3EE', ink: '#12283F', glow: 'rgba(74,111,165,0.35)' },
  },
  {
    key: 'space',
    name: 'DEEP SPACE',
    ground:   { top: 0x2B4BD6, bottom: 0x0EA5E9 },
    road:     { surface: 0x3A4A8A, line: 0x39FF14, edge: 0x7DD3FC },
    decor:    { type: 'planets', colors: [0x39FF14, 0xFFAA00, 0xFF71CE], lit: 0xFFFFFF, density: 2 },
    particle: { type: 'stars', color: 0xFFFFFF, count: 70, speedRatio: 0.4 },
    palette:  { bg: '#E6F6FF', accent: '#0066FF', accent2: '#39FF14', ink: '#0B1B3A', glow: 'rgba(57,255,20,0.4)' },
  },
  {
    key: 'glitch',
    name: 'GLITCH ZONE',
    ground:   { top: 0xCCFF00, bottom: 0x00E5A0 },
    road:     { surface: 0x2C2C54, line: 0xCCFF00, edge: 0xBF00FF },
    decor:    { type: 'glitch', colors: [0xBF00FF, 0xFF006E, 0x00FFFF], lit: 0xCCFF00, density: 6 },
    particle: { type: 'tear', color: 0xFFFFFF, count: 30, speedRatio: 2.1 },
    palette:  { bg: '#F6FFDC', accent: '#BF00FF', accent2: '#CCFF00', ink: '#14231A', glow: 'rgba(204,255,0,0.45)' },
  },
];

export default WORLDS;

/** Index of the world for a given score, cycling forever. */
export function worldIndexForScore(score) {
  return Math.floor(score / WORLD_SPAN) % WORLDS.length;
}
