import { createProject, deleteProjectForUser, getDownload, listProjects, listTemplates } from '../services/projectService.js';

export async function templatesController(req, res) {
  res.json({ templates: await listTemplates() });
}

export async function createProjectController(req, res) {
  const project = await createProject(req.user.id, req.body);
  res.status(201).json({ project });
}

export async function listProjectsController(req, res) {
  res.json({ projects: await listProjects(req.user.id) });
}

export async function downloadProjectController(req, res) {
  const download = await getDownload(req.params.id, req.user.id);
  res.download(download.path, download.name);
}

export async function deleteProjectController(req, res) {
  await deleteProjectForUser(req.params.id, req.user.id);
  res.json({ ok: true });
}
