import { query, withTransaction } from '../config/db.js';
import { deleteCloudinaryAssets } from './cloudinaryService.js';
import { removeGeneratedFiles } from './generatorService.js';

export async function cleanupExpiredProjects() {
  const result = await query('SELECT id FROM projects WHERE expires_at <= NOW() ORDER BY expires_at ASC LIMIT 50');
  for (const project of result.rows) {
    await deleteProjectDeep(project.id);
  }
  return result.rowCount;
}

export async function deleteProjectDeep(projectId) {
  const snapshot = await query(
    `SELECT p.id, p.generated_path, p.zip_path, COALESCE(array_agg(m.cloudinary_public_id) FILTER (WHERE m.cloudinary_public_id IS NOT NULL), '{}') AS public_ids
     FROM projects p
     LEFT JOIN media m ON m.project_id = p.id
     WHERE p.id = $1
     GROUP BY p.id`,
    [projectId]
  );
  if (!snapshot.rowCount) {
    return;
  }
  const project = snapshot.rows[0];
  await deleteCloudinaryAssets(project.public_ids || []);
  await removeGeneratedFiles(project.generated_path, project.zip_path);
  await withTransaction(async (client) => {
    await client.query('DELETE FROM media WHERE project_id = $1', [projectId]);
    await client.query('DELETE FROM events WHERE project_id = $1', [projectId]);
    await client.query('DELETE FROM projects WHERE id = $1', [projectId]);
  });
}

export function startCleanupScheduler() {
  cleanupExpiredProjects().catch((error) => console.error(error));
  setInterval(() => {
    cleanupExpiredProjects().catch((error) => console.error(error));
  }, 15 * 60 * 1000);
}
