// Gera os icones do PWA sem dependencias externas (encoder PNG minimo).
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public')
mkdirSync(outDir, { recursive: true })

// --- CRC32 ---
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function hexToRgb(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
}

// Desenha o icone: fundo teal arredondado + moeda (circulo) + cifrao simples
function drawIcon(size) {
  const bg = hexToRgb('#0f766e')
  const coin = hexToRgb('#fbbf24')
  const coinDark = hexToRgb('#f59e0b')
  const white = [255, 255, 255]
  const data = Buffer.alloc(size * size * 4)
  const r = size * 0.22 // raio do canto arredondado
  const cx = size / 2
  const cy = size / 2
  const coinR = size * 0.30

  function rounded(x, y) {
    // dentro do quadrado com cantos arredondados?
    const dx = Math.min(x, size - x)
    const dy = Math.min(y, size - y)
    if (dx > r && dy > r) return true
    if (dx > r || dy > r) return true
    const ddx = r - Math.min(dx, r)
    const ddy = r - Math.min(dy, r)
    return ddx * ddx + ddy * ddy <= r * r
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      let col = null
      let alpha = 0
      if (rounded(x + 0.5, y + 0.5)) {
        col = bg
        alpha = 255
        const dist = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
        if (dist <= coinR) {
          col = coin
          if (dist > coinR - size * 0.02) col = coinDark
        }
      }
      if (col) {
        data[i] = col[0]
        data[i + 1] = col[1]
        data[i + 2] = col[2]
        data[i + 3] = alpha
      }
    }
  }

  // Desenha um "C" branco simples no centro (arco)
  const ringR = size * 0.17
  const thick = size * 0.045
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx
      const dy = y + 0.5 - cy
      const dist = Math.hypot(dx, dy)
      const ang = Math.atan2(dy, dx) // -pi..pi
      if (Math.abs(dist - ringR) <= thick) {
        // abre o C do lado direito (angulos entre -0.6 e 0.6 rad ficam vazios)
        if (Math.abs(ang) > 0.7) {
          const i = (y * size + x) * 4
          data[i] = white[0]
          data[i + 1] = white[1]
          data[i + 2] = white[2]
          data[i + 3] = 255
        }
      }
    }
  }

  return data
}

function encodePNG(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  // scanlines com filtro 0
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function gerar(size, nome) {
  const rgba = drawIcon(size)
  const png = encodePNG(size, rgba)
  writeFileSync(join(outDir, nome), png)
  console.log('gerado', nome, png.length, 'bytes')
}

gerar(192, 'pwa-192x192.png')
gerar(512, 'pwa-512x512.png')
gerar(180, 'apple-touch-icon.png')

// favicon SVG
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#0f766e"/>
  <circle cx="32" cy="32" r="19" fill="#fbbf24" stroke="#f59e0b" stroke-width="2"/>
  <path d="M39 24 A11 11 0 1 0 39 40" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
</svg>
`
writeFileSync(join(outDir, 'favicon.svg'), favicon)
console.log('gerado favicon.svg')
