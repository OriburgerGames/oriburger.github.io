// Ruby 없이 사이트를 검증하는 스크립트 (npm test).
//
// 1. _config.yml, _data/*.yml, 각 문서의 front matter 를 파싱한다.
// 2. assets/css/agency.scss 를 Liquid → Sass 순으로 컴파일한다.
// 3. index / legal / 404 페이지를 Jekyll 과 같은 방식(레이아웃 체인 + include)으로 렌더링한다.
// 4. 렌더 결과에 대해 콘텐츠·경로·태그 균형 검사를 수행하고 .check/ 에 결과물을 남긴다.
//
// Jekyll 의 완전한 대체는 아니다(kramdown 대신 marked 사용 등). 실제 배포 빌드는 GitHub Actions 가 수행한다.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";
import { Liquid } from "liquidjs";
import { marked } from "marked";
import * as sass from "sass";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, ".check");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

const results = [];
function check(ok, message) {
  results.push({ ok: !!ok, message });
  if (!ok) console.error("  FAIL  " + message);
}

function readDoc(rel) {
  const raw = read(rel);
  const m = raw.match(/^---\r?\n(?:([\s\S]*?)\r?\n)?---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, content: raw };
  return { data: (m[1] && m[1].trim() ? yaml.load(m[1]) : null) || {}, content: m[2] };
}

// ---------------------------------------------------------------- site model
const config = yaml.load(read("_config.yml"));
check(config.baseurl === "", `_config.yml baseurl is "" (site is served from the domain root), got ${JSON.stringify(config.baseurl)}`);
check(/^https:\/\/[^/]+$/.test(config.url || ""), `_config.yml url is a bare origin, got ${JSON.stringify(config.url)}`);

const data = {};
for (const file of fs.readdirSync(path.join(root, "_data"))) {
  if (!file.endsWith(".yml")) continue;
  data[path.basename(file, ".yml")] = yaml.load(read(path.join("_data", file)));
}
const text = data.sitetext[config.locale];
check(text, `_data/sitetext.yml has a "${config.locale}" block`);
check(data.navigation[config.locale], `_data/navigation.yml has a "${config.locale}" block`);

const portfolio = fs
  .readdirSync(path.join(root, "_portfolio"))
  .filter((f) => f.endsWith(".md"))
  .sort()
  .map((f) => {
    const doc = readDoc(path.join("_portfolio", f));
    return { ...doc.data, content: marked.parse(doc.content), path: `_portfolio/${f}` };
  });
check(portfolio.length > 0, "portfolio collection is not empty");

const site = { ...config, data, portfolio, time: new Date() };

// -------------------------------------------------------- referenced assets
function assetExists(p, label) {
  const rel = String(p).replace(/^\//, "");
  check(exists(rel), `${label}: ${p} exists`);
}
for (const p of portfolio) {
  assetExists(p.caption.thumbnail, `${p.path} thumbnail`);
  if (p.image) assetExists(p.image, `${p.path} image`);
}
for (const e of text.timeline.events) {
  check(e.image || e.icon, `timeline "${e.title}" has an image or icon`);
  if (e.image) assetExists(e.image, `timeline "${e.title}"`);
}
for (const m of text.team.people) if (m.image) assetExists(m.image, `team "${m.name}"`);
for (const c of text.clients.list) assetExists(c.logo, `client "${c.title}"`);

// ------------------------------------------------------------------- liquid
const engine = new Liquid({
  root: path.join(root, "_includes"),
  jekyllInclude: true,
  extname: "",
  strictFilters: true,
});
const isAbsolute = (p) => /^([a-z][a-z0-9+.-]*:)?\/\//i.test(p);
function relativeUrl(p) {
  p = String(p ?? "");
  if (isAbsolute(p)) return p;
  if (!p.startsWith("/")) p = "/" + p;
  return (config.baseurl || "").replace(/\/$/, "") + p;
}
engine.registerFilter("relative_url", relativeUrl);
engine.registerFilter("absolute_url", (p) => (isAbsolute(String(p)) ? p : config.url.replace(/\/$/, "") + relativeUrl(p)));
engine.registerFilter("markdownify", (s) => marked.parse(String(s ?? "")));

async function renderPage(rel, url) {
  const doc = readDoc(rel);
  const page = { ...doc.data, url, path: rel };
  let content = await engine.parseAndRender(doc.content, { site, page });
  if (rel.endsWith(".md")) content = marked.parse(content);
  let layout = doc.data.layout;
  while (layout) {
    const l = readDoc(`_layouts/${layout}.html`);
    content = await engine.parseAndRender(l.content, { site, page, content, layout: l.data });
    layout = l.data.layout;
  }
  return content;
}

// --------------------------------------------------------------------- sass
fs.mkdirSync(outDir, { recursive: true });
let css = "";
try {
  const scssDoc = readDoc("assets/css/agency.scss");
  const scss = await engine.parseAndRender(scssDoc.content, { site });
  css = sass.compileString(scss, {
    loadPaths: [path.join(root, "_sass")],
    silenceDeprecations: ["import", "global-builtin", "color-functions"],
    quietDeps: true,
  }).css;
  fs.writeFileSync(path.join(outDir, "agency.css"), css);
  check(true, "agency.scss compiles");
} catch (err) {
  check(false, `agency.scss compiles: ${err.message}`);
}
check(css.includes("--bg:") && /\[data-theme="?dark"?\]/.test(css) && css.includes("prefers-color-scheme: dark"), "compiled CSS contains light/dark theme tokens");
check(css.includes(".reveal") && css.includes("prefers-reduced-motion"), "compiled CSS contains reveal animations with reduced-motion fallback");
for (const m of css.matchAll(/url\(["']?(\.\.\/[^"')]+)["']?\)/g)) {
  check(exists(path.join("assets/css", m[1])), `CSS asset ${m[1]} exists`);
}

// -------------------------------------------------------------------- pages
const pages = [
  ["index.md", "/", "index.html"],
  ["legal.md", "/legal.html", "legal.html"],
  ["404.html", "/404.html", "404.html"],
];
const html = {};
for (const [rel, url, out] of pages) {
  try {
    html[rel] = await renderPage(rel, url);
    fs.writeFileSync(path.join(outDir, out), html[rel]);
    check(true, `${rel} renders`);
  } catch (err) {
    check(false, `${rel} renders: ${err.message}`);
    html[rel] = "";
  }
}

const count = (s, re) => (s.match(re) || []).length;
for (const [rel] of pages) {
  const h = html[rel];
  if (!h) continue;
  check(!/\{[{%]/.test(h), `${rel}: no unrendered Liquid tags`);
  check(!h.includes("/oriburger.github.io/"), `${rel}: no stale "/oriburger.github.io/" prefix`);
  for (const m of h.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)) {
    const file = m[1].replace(/^\//, "");
    // Jekyll compiles assets/css/*.scss into the .css the page links to
    check(exists(file) || (file.endsWith(".css") && exists(file.replace(/\.css$/, ".scss"))), `${rel}: ${m[1]} exists`);
  }
  for (const m of h.matchAll(/(?:src|href)="((?!https?:|\/|#|data:|mailto:)[^"]+)"/g)) {
    check(false, `${rel}: relative (non-root) URL "${m[1]}" would break under a different baseurl`);
  }
  for (const tag of ["div", "section", "ul", "li", "nav", "header", "footer", "form", "a", "button", "h2", "h3", "h4", "p", "span", "i", "head", "body", "html", "script", "style", "main", "textarea", "title"]) {
    const open = count(h, new RegExp(`<${tag}(?=[\\s>])`, "g"));
    const close = count(h, new RegExp(`</${tag}>`, "g"));
    check(open === close, `${rel}: <${tag}> balanced (${open} open / ${close} close)`);
  }
  check(h.includes('data-theme-toggle'), `${rel}: theme toggle present`);
  check(h.includes('localStorage.getItem("theme")'), `${rel}: early theme script present`);
  check(h.includes('rel="canonical" href="' + config.url), `${rel}: canonical uses site url`);
}

const home = html["index.md"];
if (home) {
  check(count(home, /class="team-member"/g) === text.team.people.length, `home: ${text.team.people.length} team members rendered`);
  check(home.includes("Younghun Park") && home.includes("assets/img/team/4.png"), "home: Younghun Park rendered with his photo");
  check(count(home, /portfolio-item/g) === portfolio.length, `home: ${portfolio.length} award cards`);
  check(count(home, /class="portfolio-modal modal fade"/g) === portfolio.length, `home: ${portfolio.length} award modals`);
  const timelineItems = count(home, /<li class="reveal/g);
  check(timelineItems === text.timeline.events.length, `home: ${text.timeline.events.length} timeline events (${timelineItems})`);
  check(home.includes("Q2, 2026") && home.includes("Oriburger Games Launched") && home.includes("fa-rocket"), "home: Q2 2026 launch event with icon");
  check(home.includes("Q1, 2027"), "home: Early Access dated Q1 2027");
  check(!/Q4,? 2026|fourth quarter of 2026/.test(home), "home: no leftover Q4 2026 references");
  check(count(home, /timeline-inverted/g) === Math.floor(text.timeline.events.length / 2) + 1, "home: timeline panels alternate sides");
  check(count(home, /class="[^"]*\breveal\b/g) >= 20, "home: reveal animation classes applied");
  check(home.includes('href="#services"') && !home.includes('href="/#services"'), "home: nav uses plain hash links so scrollspy works");
  check(home.includes("youtube-nocookie.com/embed/" + text.services.video), "home: trailer embedded from sitetext");
  check(home.includes('<meta property="og:image" content="' + config.url), "home: og:image is absolute");
}
const legal = html["legal.md"];
if (legal) {
  check(legal.includes("navbar-solid"), "legal: navbar rendered solid on sub pages");
  check(legal.includes('href="/#services"'), "legal: nav links point back to the home page sections");
}

// ------------------------------------------------------------------ summary
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed. Rendered output: ${path.relative(root, outDir)}/`);
if (failed.length) {
  console.error(`${failed.length} check(s) failed.`);
  process.exit(1);
}
