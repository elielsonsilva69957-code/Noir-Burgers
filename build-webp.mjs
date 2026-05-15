/**
 * Gera hero-poster.webp, *.webp (até 720px) e *-sm.webp (até 400px) a partir dos JPGs.
 * Atualiza index.html: <picture> WebP, poster do hero, preload do poster no mobile, scroll suave condicional.
 * Execute: npm install && npm run build:images
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

async function buildHeroPoster() {
  const candidates = ["food6.jpg", "food3.jpg", "bebida1.jpg"];
  let input = null;
  for (const c of candidates) {
    const p = path.join(root, c);
    if (fs.existsSync(p)) {
      input = p;
      break;
    }
  }
  if (!input) {
    console.warn("Nenhum JPG candidato para poster do hero.");
    return;
  }
  await sharp(input)
    .rotate()
    .resize({ width: 1280, height: 720, fit: "cover", position: "centre" })
    .webp({ quality: 82, effort: 4 })
    .toFile(path.join(root, "hero-poster.webp"));
  console.log("OK hero-poster.webp");
}

async function buildCardWebps() {
  const files = fs.readdirSync(root).filter((f) => /\.jpe?g$/i.test(f));

  for (const file of files) {
    const input = path.join(root, file);
    const base = file.replace(/\.jpe?g$/i, "");
    await sharp(input)
      .rotate()
      .resize({ width: 720, withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toFile(path.join(root, `${base}.webp`));
    await sharp(input)
      .rotate()
      .resize({ width: 400, withoutEnlargement: true })
      .webp({ quality: 76, effort: 4 })
      .toFile(path.join(root, `${base}-sm.webp`));
    console.log("OK", file);
  }
}

function patchIndexHtml() {
  const indexPath = path.join(root, "index.html");
  let html = fs.readFileSync(indexPath, "utf8");

  const imgRe = /<img src="([^"]+\.jpg)" alt="([^"]*)" loading="lazy">/g;
  if (imgRe.test(html)) {
    html = html.replace(imgRe, (_, src, alt) => {
      const b = src.replace(/\.(jpg|jpeg)$/i, "");
      return `<picture><source type="image/webp" media="(max-width: 480px)" srcset="${b}-sm.webp"><source type="image/webp" srcset="${b}.webp"><img src="${src}" alt="${alt}" loading="lazy" decoding="async" width="400" height="240" sizes="(max-width: 480px) 50vw, (max-width: 768px) 45vw, 320px"></picture>`;
    });
    console.log("OK index.html (picture + WebP)");
  } else {
    console.log("index.html: tags <img jpg> já convertidas ou ausentes — mantendo markup.");
  }

  html = html.replace(
    /<video autoplay muted loop playsinline class="bg-video">/,
    '<video id="heroVideo" autoplay muted loop playsinline class="bg-video" poster="hero-poster.webp" preload="metadata">'
  );

  if (!html.includes('rel="preload" as="image" href="hero-poster.webp"')) {
    html = html.replace(
      '<link rel="stylesheet" href="style.css">',
      '<link rel="stylesheet" href="style.css">\n  <link rel="preload" as="image" href="hero-poster.webp" media="(max-width: 768px)">'
    );
  }

  html = html.replace(
    /onclick="document\.getElementById\('menu'\)\.scrollIntoView\(\{behavior: 'smooth'\}\)"/,
    'onclick="scrollParaMenuCardapio()"'
  );

  fs.writeFileSync(indexPath, html, "utf8");
}

const main = async () => {
  await buildHeroPoster();
  await buildCardWebps();
  patchIndexHtml();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
