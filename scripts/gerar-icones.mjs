// Gera os ícones PNG do app (sem dependências): um sol nascendo sobre o horizonte.
// Uso: node scripts/gerar-icones.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const FUNDO = [31, 42, 68];      // índigo profundo
const SOL = [232, 176, 74];      // âmbar
const LINHA = [244, 236, 220];   // papel

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(tipo, dados) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, "ascii"), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([len, corpo, crc]);
}

// Cor de um ponto (u, v em 0..1). `margem` encolhe o desenho para ícones "maskable".
function cor(u, v, margem) {
  const s = 1 - 2 * margem;
  const x = (u - margem) / s, y = (v - margem) / s;
  const horizonte = 0.64;
  const dx = x - 0.5, dy = y - horizonte;
  const r = Math.hypot(dx, dy);
  if (Math.abs(y - horizonte) < 0.022 && x > 0.16 && x < 0.84) return LINHA;
  if (y < horizonte - 0.022 && r < 0.24) return SOL;
  // raios
  if (y < horizonte - 0.06) {
    const ang = Math.atan2(-dy, dx);
    const setor = Math.abs(((ang / Math.PI) * 6) % 1 - 0.5) < 0.09;
    if (setor && r > 0.29 && r < 0.38) return SOL;
  }
  return FUNDO;
}

function png(tam, margem) {
  const AA = 4;
  const linhas = [];
  for (let py = 0; py < tam; py++) {
    const linha = Buffer.alloc(1 + tam * 3);
    for (let px = 0; px < tam; px++) {
      let rr = 0, gg = 0, bb = 0;
      for (let sy = 0; sy < AA; sy++)
        for (let sx = 0; sx < AA; sx++) {
          const [r, g, b] = cor((px + (sx + 0.5) / AA) / tam, (py + (sy + 0.5) / AA) / tam, margem);
          rr += r; gg += g; bb += b;
        }
      const n = AA * AA;
      linha[1 + px * 3] = Math.round(rr / n);
      linha[2 + px * 3] = Math.round(gg / n);
      linha[3 + px * 3] = Math.round(bb / n);
    }
    linhas.push(linha);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(tam, 0);
  ihdr.writeUInt32BE(tam, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.concat(linhas))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("icons", { recursive: true });
writeFileSync("icons/icon-192.png", png(192, 0));
writeFileSync("icons/icon-512.png", png(512, 0));
writeFileSync("icons/maskable-512.png", png(512, 0.1));
writeFileSync("icons/apple-touch-icon.png", png(180, 0.04));
console.log("ícones gerados em icons/");
