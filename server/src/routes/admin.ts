import { Router } from 'express';
import { client } from '../minns/client.js';
import { MinnsError } from 'minns-sdk';

const router = Router();

function handleError(err: unknown, res: any, fallback: string) {
  if (err instanceof MinnsError) {
    res.status(err.statusCode ?? 500).json({ error: err.message, details: err.details });
  } else {
    res.status(500).json({ error: fallback });
  }
}

// Process embeddings
router.post('/admin/embeddings', async (req, res) => {
  try {
    const limit = req.body.limit ?? 100;
    const result = await client.processEmbeddings(limit);
    res.json(result);
  } catch (err) {
    handleError(err, res, 'Failed to process embeddings');
  }
});

// Export data (binary)
router.get('/admin/export', async (_req, res) => {
  try {
    const data = await client.exportDatabase();
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="minns-export.bin"');
    res.send(Buffer.from(data));
  } catch (err) {
    handleError(err, res, 'Failed to export data');
  }
});

// Import data (binary)
router.post('/admin/import', async (req, res) => {
  try {
    const mode = (req.query.mode as 'replace' | 'merge') ?? 'replace';
    // Expect raw binary body
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const body = Buffer.concat(chunks);
        const result = await client.importDatabase(new Uint8Array(body), mode);
        res.json(result);
      } catch (err) {
        handleError(err, res, 'Failed to import data');
      }
    });
  } catch (err) {
    handleError(err, res, 'Failed to import data');
  }
});

export default router;
