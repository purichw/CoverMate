import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Icon geometry: Lucide (ISC), see assets/vendor/lucide-LICENSE.txt.
// Decorative artwork: original CoverMate email vector geometry, September 2026.
const output = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets/brand');
const ink = '#493020';
const icons = {
  file: '<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8M16 13H8M16 17H8"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
};

function svg(width, height, body, viewBox = `0 0 ${width} ${height}`) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}">${body}</svg>`;
}

async function write(name, source, width, height) {
  await sharp(Buffer.from(source)).resize(width * 2, height * 2).png().toFile(path.join(output, `email-${name}.png`));
  console.log(`email-${name}.png: ${width * 2} × ${height * 2} px (display ${width} × ${height})`);
}

for (const [name, body] of Object.entries(icons)) {
  const size = name === 'file' || name === 'clock' ? 32 : 24;
  await write(name, svg(24, 24, `<g fill="none" stroke="${ink}" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${body}</g>`), size, size);
}

await write('check', svg(24, 24, '<circle cx="12" cy="12" r="12" fill="#438431"/><path d="m6.5 12 3.6 3.6 7.4-7.4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'), 20, 20);
await write('chevron', svg(12, 20, '<path d="m3 3 6 7-6 7" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'), 12, 20);

await write('header-leaves', svg(126, 108, `
  <g fill="#f1eee4">
    <path d="M0 108C16 75 34 54 54 37C40 56 28 77 17 101Z"/>
    <path d="M31 75C15 56 20 32 38 17C46 40 44 59 31 75Z"/>
    <path d="M43 64C48 34 67 13 103 7C97 37 77 58 43 64Z"/>
    <path d="M18 98C38 72 68 67 92 72C77 92 51 104 18 98Z"/>
  </g>
`), 126, 108);

const footerLeaves = `
  <g fill="#efecdf">
    <path d="M30 110C27 79 17 51 4 27C20 42 34 69 38 108Z"/>
    <path d="M18 66C-1 52-3 29 0 3C22 20 25 40 18 66Z"/>
    <path d="M26 84C24 55 42 30 68 26C65 52 52 73 26 84Z"/>
    <path d="M36 104C47 77 66 69 90 73C79 96 61 107 36 104Z"/>
    <path d="M28 108C9 97 0 83 0 64C21 70 31 87 28 108Z"/>
    <path d="M55 110C62 97 74 91 89 92L89 110Z"/>
  </g>`;
const footerGarden = `
  <path d="M466 110C502 86 528 94 550 77C588 47 644 47 680 72V110Z" fill="#eeeee3"/>
  <path d="M497 110C525 90 554 91 580 96C613 82 649 91 680 103V110Z" fill="#d8ddc4"/>
  <path d="M553 110C582 98 610 101 635 110Z" fill="#c9d1ad"/>
  <g stroke="#a7ac83" stroke-width="1.8" stroke-linecap="round">
    <path d="M526 99V67M546 100V83M650 99V82"/>
  </g>
  <path d="M526 57C519 59 515 73 516 80C517 87 535 87 536 80C537 73 532 58 526 57Z" fill="#a8b289"/>
  <path d="M546 75C541 77 538 85 540 90C542 94 549 94 552 90C554 86 550 77 546 75Z" fill="#b0b793"/>
  <path d="M650 71C644 75 641 84 643 90C645 96 655 96 658 90C660 84 655 74 650 71Z" fill="#aeb594"/>
  <path d="M577 78L601 53L625 78V100H577Z" fill="#f7eddb"/>
  <path d="M601 53L625 78V100H616V76Z" fill="#e9d6b9"/>
  <path d="M573 79L601 51L630 79" fill="none" stroke="#d5b696" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M590 100V88C590 84 598 84 598 88V100Z" fill="#dbbfa0"/>
  <path transform="translate(-30 0)" d="M575 30C565 23 565 17 569 15C572 13 575 15 576 18C578 13 583 13 585 17C588 23 580 28 575 33Z" fill="#cd946d"/>
`;
await write('footer-garden', svg(680, 110, `${footerLeaves}${footerGarden}`), 680, 110);
await write('footer-garden-mobile', svg(390, 110, `${footerLeaves}<g transform="translate(-290 0)">${footerGarden}</g>`), 390, 110);
