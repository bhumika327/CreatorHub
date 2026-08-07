import fs from 'fs/promises';
import path from 'path';

export const logAudit = async (filename: 'login_attempts.json' | 'api_calls.json', record: object) => {
  const logDir = path.join(process.cwd(), 'logs');
  const filePath = path.join(logDir, filename);

  try {
    // Ensure logs folder exists
    await fs.mkdir(logDir, { recursive: true });

    let logs: any[] = [];
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      logs = JSON.parse(data);
      if (!Array.isArray(logs)) {
        logs = [];
      }
    } catch (e) {
      // File doesn't exist or is invalid JSON
    }

    logs.push({
      ...record,
      timestamp: new Date().toISOString()
    });

    await fs.writeFile(filePath, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[Audit Logger] Failed to write to ${filename}:`, err);
  }
};
