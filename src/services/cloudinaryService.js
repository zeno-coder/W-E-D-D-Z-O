import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret
});

export function hasCloudinary() {
  return Boolean(env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret);
}

export function createUploadSignature(userId) {
  if (!hasCloudinary()) {
    throw new AppError('Cloudinary is not configured', 503);
  }
  const timestamp = Math.round(Date.now() / 1000);
  const folder = `weddingcraft/${userId}`;
  const params = { folder, timestamp };
  const signature = cloudinary.utils.api_sign_request(params, env.cloudinaryApiSecret);
  return {
    cloudName: env.cloudinaryCloudName,
    apiKey: env.cloudinaryApiKey,
    timestamp,
    folder,
    signature
  };
}

export async function deleteCloudinaryAssets(publicIds) {
  if (!hasCloudinary() || !publicIds.length) {
    return;
  }
  const uniqueIds = [...new Set(publicIds.filter(Boolean))];
  for (let i = 0; i < uniqueIds.length; i += 100) {
    const batch = uniqueIds.slice(i, i + 100);
    await cloudinary.api.delete_resources(batch, { resource_type: 'image' });
  }
}

export function isValidPublicId(value) {
  return typeof value === 'string' && /^weddingcraft\/[a-f0-9-]+\/[A-Za-z0-9_./-]+$/.test(value);
}

export function isValidCloudinaryUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com';
  } catch {
    return false;
  }
}

export function secureToken() {
  return crypto.randomBytes(16).toString('hex');
}
