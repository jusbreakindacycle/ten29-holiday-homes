// Read build artifacts and Git metadata only. Never reads .env files or emits values.
import { readdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
function fail(message) { throw new Error(message); }
const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n');
if (tracked.some(file => /(^|\/)\.env($|\.)/.test(file) && !file.endsWith('.example'))) fail('Populated environment file must not be tracked');
const migrations = readdirSync('supabase/migrations').filter(name => name.endsWith('.sql')).sort();
for (let number = 1; number <= 11; number++) {
  if (migrations.filter(name => name.startsWith(String(number).padStart(4, '0') + '_')).length !== 1) fail('Missing or duplicate migration number');
}
const baseline = 'a095fd6083d3d235e5c21214675744afee8b5c22';
const changed = execFileSync('git', ['diff', '--name-only', baseline, '--', ...migrations.filter(name => !name.startsWith('0011_')).map(name => 'supabase/migrations/' + name)], { encoding: 'utf8' });
if (changed.trim()) fail('Previously verified migrations changed; supervised review required');
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
if (JSON.stringify(lock.packages[''].dependencies) !== JSON.stringify(pkg.dependencies)) fail('Dependency lock differs from package manifest');
const privateValues = ['SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY'].map(name => process.env[name]).filter(value => value && value.length > 16);
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
let privileged = publicKey.startsWith('sb_secret_');
try { privileged ||= JSON.parse(Buffer.from(publicKey.split('.')[1], 'base64url').toString()).role === 'service_role'; } catch { /* Opaque publishable keys are supported. */ }
if (privileged) fail('Privileged Supabase credential configured as browser-public');
let files = 0, bytes = 0;
function inspect(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) inspect(file);
    else {
      const body = readFileSync(file); files++; bytes += body.length;
      if (privateValues.some(value => body.includes(Buffer.from(value)))) fail('Server credential found in browser artifact');
      if (/\.(js|map)$/.test(file) && /SUPABASE_SERVICE_ROLE_KEY|RESEND_API_KEY/.test(body.toString())) fail('Server credential accessor found in browser artifact');
    }
  }
}
inspect('.next/static');
try {
  execFileSync(process.execPath, ['-e', 'require("sharp")'], {
    cwd: path.resolve('.next/standalone'),
    stdio: 'pipe',
  });
} catch {
  fail('Standalone server output cannot load its Sharp native runtime');
}
console.log(JSON.stringify({ release_checks: 'passed', immutable_migrations: 10, browser_artifacts: files, browser_artifact_bytes: bytes,
  credential_values_checked: privateValues.length, note: 'Zero configured values is source/accessor validation only; not production-secret verification' }));
