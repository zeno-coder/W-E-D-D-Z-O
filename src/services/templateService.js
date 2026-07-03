import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { escapeHtml } from '../utils/sanitize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..', '..');
const templatesRoot = path.join(root, 'templates');

export async function renderTemplate(templateSlug, data) {
  const safeSlug = assertTemplateSlug(templateSlug);
  const templateDir = path.join(templatesRoot, safeSlug);
  const [index, style, script] = await Promise.all([
    fs.readFile(path.join(templateDir, 'index.html'), 'utf8'),
    fs.readFile(path.join(templateDir, 'style.css'), 'utf8'),
    fs.readFile(path.join(templateDir, 'script.js'), 'utf8')
  ]);
  const replacements = buildReplacements(data);
  return {
    html: replacePlaceholders(index, replacements),
    css: replacePlaceholders(style, replacements),
    js: replacePlaceholders(script, replacements),
    json: JSON.stringify(data, null, 2)
  };
}

function assertTemplateSlug(value) {
  if (!['royal-gold', 'traditional-kerala', 'modern-luxury', 'floral-elegance'].includes(value)) {
    throw new Error('Invalid template');
  }
  return value;
}

function replacePlaceholders(source, replacements) {
  return Object.entries(replacements).reduce((output, [key, value]) => output.replaceAll(`{{${key}}}`, value), source);
}

function buildReplacements(data) {
  const gallery = data.media
    .filter((item) => item.cloudinary_url)
    .map((item) => `<figure><img src="${escapeHtml(item.cloudinary_url)}" alt="${escapeHtml(item.label)}" loading="lazy"><figcaption>${escapeHtml(item.label)}</figcaption></figure>`)
    .join('');
  const events = data.events
    .map((event) => `<article><span>${escapeHtml(formatDate(event.event_date))}</span><h3>${escapeHtml(event.event_name)}</h3><time>${escapeHtml(event.event_time)}</time><p>${escapeHtml(event.event_description)}</p></article>`)
    .join('');
  return {
    BRIDE_NAME: escapeHtml(data.couple.brideName),
    GROOM_NAME: escapeHtml(data.couple.groomName),
    TAGLINE: escapeHtml(data.couple.tagline),
    CUSTOM_MESSAGE: escapeHtml(data.couple.message),
    WEDDING_DATE: escapeHtml(formatDate(data.wedding.date)),
    WEDDING_TIME: escapeHtml(data.wedding.time),
    VENUE_NAME: escapeHtml(data.wedding.venueName),
    VENUE_ADDRESS: escapeHtml(data.wedding.venueAddress),
    MAP_LINK: escapeHtml(data.wedding.mapLink),
    EVENTS: events,
    GALLERY: gallery,
    PRIMARY_COLOR: escapeHtml(data.theme.primaryColor),
    ACCENT_COLOR: escapeHtml(data.theme.accentColor),
    FONT_FAMILY: escapeHtml(data.theme.fontFamily),
    MUSIC: escapeHtml(data.music),
    HERO_IMAGE: escapeHtml(data.media.find((item) => item.media_type === 'coupleHero')?.cloudinary_url || '')
  };
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
}
