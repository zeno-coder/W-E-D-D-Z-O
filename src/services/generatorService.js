import fs from 'fs/promises';
import fsSync from 'fs';
import os from 'os';
import path from 'path';
import archiver from 'archiver';
import { v4 as uuid } from 'uuid';
import { renderTemplate } from './templateService.js';
import { safeFilename } from '../utils/sanitize.js';

const baseTemp = path.join(os.tmpdir(), 'weddingcraft');

export async function generateInvitationBundle(project) {
  const projectDir = await createProjectDir(project.id);
  const rendered = await renderTemplate(project.template_slug, project.invitation_data);
  await fs.writeFile(path.join(projectDir, 'index.html'), rendered.html);
  await fs.writeFile(path.join(projectDir, 'style.css'), rendered.css);
  await fs.writeFile(path.join(projectDir, 'script.js'), rendered.js);
  await fs.writeFile(path.join(projectDir, 'data.json'), rendered.json);
  const zipName = createZipName(project.invitation_data);
  const zipPath = path.join(projectDir, zipName);
  await zipDirectory(projectDir, zipPath);
  return { generatedPath: projectDir, zipPath };
}

export async function removeGeneratedFiles(...targets) {
  for (const target of targets.filter(Boolean)) {
    if (isInsideTemp(target)) {
      await fs.rm(target, { recursive: true, force: true });
    }
  }
}

export function isInsideTemp(target) {
  const resolved = path.resolve(target);
  const root = path.resolve(baseTemp);
  return resolved === root || resolved.startsWith(`${root}${path.sep}`);
}

export function createZipName(data) {
  const bride = safeFilename(data?.couple?.brideName || 'bride');
  const groom = safeFilename(data?.couple?.groomName || 'groom');
  return `${bride}-${groom}-wedding.zip`;
}

async function createProjectDir(projectId) {
  const dir = path.join(baseTemp, `${projectId}-${uuid()}`);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function zipDirectory(sourceDir, zipPath) {
  return new Promise((resolve, reject) => {
    const output = fsSync.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.file(path.join(sourceDir, 'index.html'), { name: 'index.html' });
    archive.file(path.join(sourceDir, 'style.css'), { name: 'style.css' });
    archive.file(path.join(sourceDir, 'script.js'), { name: 'script.js' });
    archive.file(path.join(sourceDir, 'data.json'), { name: 'data.json' });
    archive.finalize();
  });
}
