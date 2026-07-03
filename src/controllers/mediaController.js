import { createUploadSignature } from '../services/cloudinaryService.js';

export async function signatureController(req, res) {
  res.json(createUploadSignature(req.user.id));
}
