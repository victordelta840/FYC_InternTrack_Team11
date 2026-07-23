/**
 * Generates an RS256 keypair for JWT signing.
 * Writes:
 *   keys/jwt-private.pem
 *   keys/jwt-public.pem
 */
import { generateKeyPairSync } from 'crypto';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';

function main() {
  const privPath = resolve(process.cwd(), 'keys/jwt-private.pem');
  const pubPath = resolve(process.cwd(), 'keys/jwt-public.pem');
  mkdirSync(dirname(privPath), { recursive: true });

  if (existsSync(privPath) && existsSync(pubPath)) {
    console.log('[keys] Existing keypair found. Skipping.');
    return;
  }

  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  writeFileSync(privPath, privateKey, { mode: 0o600 });
  writeFileSync(pubPath, publicKey, { mode: 0o644 });

  console.log('[keys] RS256 keypair generated at:');
  console.log('  ', privPath);
  console.log('  ', pubPath);
}

main();
