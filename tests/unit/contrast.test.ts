import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
const css = readFileSync('src/app/globals.css', 'utf8');
function luminance(name: string) {
  const hex = css.match(new RegExp(`--ten29-${name}: #([0-9a-f]{6})`))![1];
  return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
}
it.each([['ink', 'ivory'], ['muted', 'ivory'], ['muted', 'sand'], ['warning', 'ivory'], ['ivory', 'forest']])(
  'core text token %s on %s reaches 4.5:1', (foreground, background) => {
    const [low, high] = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
    expect((high + 0.05) / (low + 0.05)).toBeGreaterThanOrEqual(4.5);
  });
