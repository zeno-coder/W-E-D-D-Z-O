import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const schema = await fs.readFile(path.join(root, 'db', 'schema.sql'), 'utf8');
const seed = await fs.readFile(path.join(root, 'db', 'seed.sql'), 'utf8');

try {
  await pool.query(schema);
  await pool.query(seed);
  console.log('WeddingCraft database initialized');
} finally {
  await pool.end();
}
