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
  const replacements = buildReplacements(data, safeSlug); 
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

function buildReplacements(data, templateSlug) {
  const isFloral = templateSlug === 'floral-elegance';
  const heroImage = data.media.find((item) => item.media_type === 'coupleHero')?.cloudinary_url || '';
  const family = data.family || {};

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
    EVENTS: isFloral ? buildFloralEvents(data.events) : buildGenericEvents(data.events),
    GALLERY: isFloral ? buildFloralGallery(data.media) : buildGenericGallery(data.media),
    PRIMARY_COLOR: escapeHtml(data.theme.primaryColor),
    ACCENT_COLOR: escapeHtml(data.theme.accentColor),
    FONT_FAMILY: escapeHtml(data.theme.fontFamily),
    MUSIC: escapeHtml(data.music),
    HERO_IMAGE: escapeHtml(heroImage),
    OPENING_BLESSING: escapeHtml(data.openingBlessing || ''),
    FOOTER_QUOTE: escapeHtml(data.footerQuote || ''),
    STORY_TIMELINE: isFloral ? buildTimeline(data.timeline) : '',
    VENUE_DETAILS: isFloral ? buildVenueDetails(data.venueDetails) : '',
    BRIDE_PARENTS: escapeHtml(family.brideParents || ''),
    BRIDE_HOMETOWN: escapeHtml(family.brideHometown || ''),
    GROOM_PARENTS: escapeHtml(family.groomParents || ''),
    GROOM_HOMETOWN: escapeHtml(family.groomHometown || '')
  };
}

function buildGenericEvents(events) {
  return events
    .map((event) => `<article><span>${escapeHtml(formatDate(event.event_date))}</span><h3>${escapeHtml(event.event_name)}</h3><time>${escapeHtml(event.event_time)}</time><p>${escapeHtml(event.event_description)}</p></article>`)
    .join('');
}

function buildGenericGallery(media) {
  return media
    .filter((item) => item.cloudinary_url)
    .map((item) => `<figure><img src="${escapeHtml(item.cloudinary_url)}" alt="${escapeHtml(item.label)}" loading="lazy"><figcaption>${escapeHtml(item.label)}</figcaption></figure>`)
    .join('');
}

function buildFloralEvents(events) {
  return events
    .map((event, index) => {
      const featured = Boolean(event.featured);
      const icon = escapeHtml(event.icon || '🌸');
      const dayLabel = escapeHtml(event.dayLabel || `Day ${index + 1}`);
      const venueTag = event.venueTag
        ? `<div class="event-venue-tag">${escapeHtml(event.venueTag)}</div>`
        : '';
      return `<div class="event-card reveal${featured ? ' featured-event' : ''}" data-event="${slugifyLite(event.event_name)}">
        <div class="event-glow"></div>
        <div class="event-icon-wrap"><span class="event-icon">${icon}</span></div>
        <div class="event-tag${featured ? ' featured-tag' : ''}">${dayLabel}</div>
        <h3 class="event-name">${escapeHtml(event.event_name)}</h3>
        <div class="event-date">${escapeHtml(formatDate(event.event_date))}</div>
        <div class="event-time">${escapeHtml(event.event_time)}</div>
        <p class="event-desc">${escapeHtml(event.event_description)}</p>
        ${venueTag}
      </div>`;
    })
    .join('');
}

function buildFloralGallery(media) {
  return media
    .filter((item) => item.cloudinary_url && item.media_type !== 'coupleHero')
    .map((item) => {
      const layoutClass = item.layout === 'tall' ? ' g-tall' : item.layout === 'wide' ? ' g-wide' : '';
      return `<figure class="gallery-item reveal${layoutClass}">
        <img src="${escapeHtml(item.cloudinary_url)}" alt="${escapeHtml(item.label)}" loading="lazy">
        <figcaption>${escapeHtml(item.label)}</figcaption>
      </figure>`;
    })
    .join('');
}

function buildTimeline(timeline = []) {
  return timeline
    .map((item, index) => {
      const side = index % 2 === 0 ? 'left' : 'right';
      const isLast = index === timeline.length - 1;
      return `<div class="timeline-item ${side} reveal">
        <div class="timeline-card">
          <div class="timeline-icon">${escapeHtml(item.icon || '🌸')}</div>
          <div class="timeline-year">${escapeHtml(item.year)}</div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
        </div>
        <div class="timeline-dot${isLast ? ' last' : ''}"></div>
      </div>`;
    })
    .join('');
}

function buildVenueDetails(details = []) {
  return details
    .map((item) => `<div class="venue-detail-item">
      <span class="vd-icon">${escapeHtml(item.icon || '📍')}</span>
      <div><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.value)}</span></div>
    </div>`)
    .join('');
}

function slugifyLite(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'event';
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
}
