import QRCode from 'qrcode';
import ip from 'ip';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Recreate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Build absolute path safely
const outputPath = path.resolve(__dirname, '../../frontend/public/qr-code.png');

// Ensure folder exists before writing
fs.mkdirSync(path.dirname(outputPath), { recursive: true });

const localIP = ip.address();
const port = 5173;
const url = `http://${localIP}:${port}/PlayerLogin`;

QRCode.toFile(
  outputPath,
  url,
  {
    color: {
      dark: '#000',  // QR code color
      light: '#FFF'  // Background color
    }
  },
  (err: Error | null | undefined) => {
    if (err) return console.error('Failed to save QR code:', err);
    console.log(`✅ QR code saved to: ${outputPath}`);
  }
);
