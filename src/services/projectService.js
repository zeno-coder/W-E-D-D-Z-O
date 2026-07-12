import fs from 'fs/promises';
import slugify from 'slugify';
import { query, withTransaction } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { cleanLong, cleanString, isDate, isTime, isUrl } from '../utils/sanitize.js';
import { isValidCloudinaryUrl, isValidPublicId, secureToken } from './cloudinaryService.js';
import { createZipName, generateInvitationBundle } from './generatorService.js';

const templateSlugs = ['royal-gold', 'traditional-kerala', 'modern-luxury', 'floral-elegance'];
const mediaTypes = [
  'coupleHero',
  'couplePhoto1',
  'couplePhoto2',
  'couplePhoto3',
  'familyPhoto1',
  'familyPhoto2',
  'familyPhoto3',
  'galleryPhoto1',
  'galleryPhoto2',
  'galleryPhoto3',
  'galleryPhoto4',
  'galleryPhoto5',
  'galleryPhoto6'
];

export async function listTemplates() {
  const result = await query('SELECT id, name, slug, preview_image FROM templates ORDER BY name');
  return result.rows;
}

export async function createProject(userId, input) {
  const data = validateProjectInput(input);
  const template = await getTemplate(data.templateSlug);
  const baseSlug = slugify(`${data.couple.brideName}-${data.couple.groomName}-wedding`, { lower: true, strict: true });
  const projectSlug = `${baseSlug}-${secureToken().slice(0, 8)}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const project = await withTransaction(async (client) => {
    const projectResult = await client.query(
      'INSERT INTO projects (user_id, template_id, project_slug, status, invitation_data, expires_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, user_id, template_id, project_slug, status, invitation_data, generated_path, zip_path, created_at, expires_at',
      [userId, template.id, projectSlug, 'generating', JSON.stringify(data), expiresAt]
    );
    const created = projectResult.rows[0];
    for (const event of data.events) {
      await client.query(
        'INSERT INTO events (project_id, event_name, event_date, event_time, event_description) VALUES ($1, $2, $3, $4, $5)',
        [created.id, event.event_name, event.event_date, event.event_time, event.event_description]
      );
    }
    for (const item of data.media) {
      await client.query(
        'INSERT INTO media (project_id, cloudinary_public_id, cloudinary_url, media_type) VALUES ($1, $2, $3, $4)',
        [created.id, item.cloudinary_public_id, item.cloudinary_url, item.media_type]
      );
    }
    return { ...created, template_slug: template.slug, template_name: template.name };
  });
  try {
    const bundle = await generateInvitationBundle(project);
    const updated = await query(
      'UPDATE projects SET status = $1, generated_path = $2, zip_path = $3 WHERE id = $4 RETURNING id, user_id, template_id, project_slug, status, invitation_data, generated_path, zip_path, created_at, expires_at',
      ['ready', bundle.generatedPath, bundle.zipPath, project.id]
    );
    return formatProject({ ...updated.rows[0], template_slug: template.slug, template_name: template.name });
  } catch (error) {
    await query('UPDATE projects SET status = $1 WHERE id = $2', ['failed', project.id]);
    throw error;
  }
}

export async function listProjects(userId) {
  const result = await query(
    `SELECT p.id, p.project_slug, p.status, p.invitation_data, p.created_at, p.expires_at, p.zip_path, t.name AS template_name, t.slug AS template_slug
     FROM projects p
     JOIN templates t ON t.id = p.template_id
     WHERE p.user_id = $1
     ORDER BY p.created_at DESC`,
    [userId]
  );
  return result.rows.map(formatProject);
}

export async function getProjectForUser(projectId, userId) {
  const result = await query(
    `SELECT p.id, p.user_id, p.project_slug, p.status, p.invitation_data, p.generated_path, p.zip_path, p.created_at, p.expires_at, t.name AS template_name, t.slug AS template_slug
     FROM projects p
     JOIN templates t ON t.id = p.template_id
     WHERE p.id = $1 AND p.user_id = $2`,
    [projectId, userId]
  );
  if (!result.rowCount) {
    throw new AppError('Project not found', 404);
  }
  return result.rows[0];
}

export async function getDownload(projectId, userId) {
  const project = await getProjectForUser(projectId, userId);
  if (new Date(project.expires_at).getTime() <= Date.now()) {
    throw new AppError('Download expired', 410);
  }
  let zipPath = project.zip_path;
  try {
    await fs.access(zipPath);
  } catch {
    const bundle = await generateInvitationBundle(project);
    zipPath = bundle.zipPath;
    await query('UPDATE projects SET generated_path = $1, zip_path = $2 WHERE id = $3', [bundle.generatedPath, bundle.zipPath, project.id]);
  }
  return { path: zipPath, name: createZipName(project.invitation_data) };
}

export async function deleteProjectForUser(projectId, userId) {
  const project = await getProjectForUser(projectId, userId);
  const { deleteProjectDeep } = await import('./cleanupService.js');
  await deleteProjectDeep(project.id);
}

function validateProjectInput(input) {
  if (!input || typeof input !== 'object') {
    throw new AppError('Project data is required');
  }
  const templateSlug = cleanString(input.templateSlug, 80);
  if (!templateSlugs.includes(templateSlug)) {
    throw new AppError('Choose a valid template');
  }
  const couple = {
    brideName: cleanString(input.couple?.brideName, 80),
    groomName: cleanString(input.couple?.groomName, 80),
    tagline: cleanString(input.couple?.tagline, 140),
    message: cleanLong(input.couple?.message, 900)
  };
  if (!couple.brideName || !couple.groomName || !couple.tagline || !couple.message) {
    throw new AppError('Complete couple details');
  }
  const wedding = {
    date: cleanString(input.wedding?.date, 10),
    time: cleanString(input.wedding?.time, 5),
    venueName: cleanString(input.wedding?.venueName, 140),
    venueAddress: cleanLong(input.wedding?.venueAddress, 600),
    mapLink: cleanString(input.wedding?.mapLink, 600)
  };
  if (!isDate(wedding.date) || !isTime(wedding.time) || !wedding.venueName || !wedding.venueAddress || !isUrl(wedding.mapLink)) {
    throw new AppError('Complete valid wedding details');
  }
const events = Array.isArray(input.events) ? input.events.slice(0, 12).map(validateEvent) : [];
  if (!events.length) {
    throw new AppError('Add at least one event');
  }
  const timeline = Array.isArray(input.timeline) ? input.timeline.slice(0, 10).map(validateTimelineItem) : [];
  const venueDetails = Array.isArray(input.venueDetails) ? input.venueDetails.slice(0, 8).map(validateVenueDetailItem) : [];
  const family = validateFamily(input.family);
  const openingBlessing = cleanLong(input.openingBlessing, 200) || '';
  const footerQuote = cleanLong(input.footerQuote, 300) || '';
  const primaryColor = cleanString(input.theme?.primaryColor, 7);
  const accentColor = cleanString(input.theme?.accentColor, 7);
  const fontFamily = cleanString(input.theme?.fontFamily, 80);
  if (!/^#[0-9a-fA-F]{6}$/.test(primaryColor) || !/^#[0-9a-fA-F]{6}$/.test(accentColor) || !fontFamily) {
    throw new AppError('Choose valid theme settings');
  }
  const music = cleanString(input.music, 40);
  if (!['Traditional', 'Instrumental', 'Romantic', 'None'].includes(music)) {
    throw new AppError('Choose a valid music option');
  }
  const media = Array.isArray(input.media) ? input.media.map(validateMedia).filter(Boolean) : [];
  if (!media.some((item) => item.media_type === 'coupleHero')) {
    throw new AppError('Couple hero image is required');
  }
  return {
      templateSlug,
      couple,
      wedding,
      events,
      theme: { primaryColor, accentColor, fontFamily },
      music,
      media,
      timeline,
      venueDetails,
      family,
      openingBlessing,
      footerQuote
    };
  }

function validateEvent(event) {
  const clean = {
    event_name: cleanString(event?.event_name, 100),
    event_date: cleanString(event?.event_date, 10),
    event_time: cleanString(event?.event_time, 5),
    event_description: cleanLong(event?.event_description, 600),
    icon: cleanString(event?.icon, 10) || '',
    dayLabel: cleanString(event?.dayLabel, 40) || '',
    venueTag: cleanString(event?.venueTag, 140) || '',
    featured: Boolean(event?.featured)
  };
  if (!clean.event_name || !isDate(clean.event_date) || !isTime(clean.event_time) || !clean.event_description) {
    throw new AppError('Each event needs a valid name, date, time, and description');
  }
  return clean;
}

function validateTimelineItem(item) {
  const clean = {
    year: cleanString(item?.year, 20),
    icon: cleanString(item?.icon, 10) || '',
    title: cleanString(item?.title, 100),
    description: cleanLong(item?.description, 400)
  };
  if (!clean.year || !clean.title || !clean.description) {
    throw new AppError('Each timeline milestone needs a year, title, and description');
  }
  return clean;
}

function validateVenueDetailItem(item) {
  const clean = {
    icon: cleanString(item?.icon, 10) || '',
    label: cleanString(item?.label, 60),
    value: cleanString(item?.value, 140)
  };
  if (!clean.label || !clean.value) {
    throw new AppError('Each venue detail needs a label and value');
  }
  return clean;
}

function validateFamily(family) {
  return {
    brideParents: cleanString(family?.brideParents, 160) || '',
    brideHometown: cleanString(family?.brideHometown, 100) || '',
    groomParents: cleanString(family?.groomParents, 160) || '',
    groomHometown: cleanString(family?.groomHometown, 100) || ''
  };
}

function validateMedia(item) {
  const media_type = cleanString(item?.media_type, 40);
  const cloudinary_public_id = cleanString(item?.cloudinary_public_id, 260);
  const cloudinary_url = cleanString(item?.cloudinary_url, 700);
  const label = cleanString(item?.label || media_type, 80);
  const layout = ['tall', 'wide'].includes(item?.layout) ? item.layout : 'normal';
  if (!mediaTypes.includes(media_type)) {
    return null;
  }
  if (!isValidPublicId(cloudinary_public_id) || !isValidCloudinaryUrl(cloudinary_url)) {
    throw new AppError('Invalid uploaded image');
  }
  return { media_type, cloudinary_public_id, cloudinary_url, label, layout };
}

async function getTemplate(slug) {
  const result = await query('SELECT id, name, slug, preview_image FROM templates WHERE slug = $1', [slug]);
  if (!result.rowCount) {
    throw new AppError('Template not found', 404);
  }
  return result.rows[0];
}

function formatProject(project) {
  return {
    id: project.id,
    projectSlug: project.project_slug,
    projectName: `${project.invitation_data?.couple?.brideName || 'Wedding'} & ${project.invitation_data?.couple?.groomName || 'Invitation'}`,
    templateName: project.template_name,
    templateSlug: project.template_slug,
    status: project.status,
    createdAt: project.created_at,
    expiresAt: project.expires_at,
    downloadName: createZipName(project.invitation_data)
  };
}
