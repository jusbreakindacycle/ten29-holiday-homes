// Read build artifacts and Git metadata only. Never reads .env files or emits values.
import { readdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
function fail(message) { throw new Error(message); }
const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n');
if (tracked.some(file => /(^|\/)\.env($|\.)/.test(file) && !file.endsWith('.example'))) fail('Populated environment file must not be tracked');
const migrations = readdirSync('supabase/migrations').filter(name => name.endsWith('.sql')).sort();
for (let number = 1; number <= 10; number++) {
  if (migrations.filter(name => name.startsWith(String(number).padStart(4, '0') + '_')).length !== 1) fail('Missing or duplicate migration number');
}
const baseline = '5612bf6c257c171396d4a2ca5036bdd99df39df0';
const changed = execFileSync('git', ['diff', '--name-only', baseline, '--', 'supabase/migrations'], { encoding: 'utf8' });
if (changed.trim()) fail('Previously verified migrations changed; supervised review required');
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
if (JSON.stringify(lock.packages[''].dependencies) !== JSON.stringify(pkg.dependencies)) fail('Dependency lock differs from package manifest');
const privateValues = ['SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY'].map(name => process.env[name]).filter(value => value && value.length > 16);
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
console.log(JSON.stringify({ release_checks: 'passed', immutable_migrations: 10, browser_artifacts: files, browser_artifact_bytes: bytes,
  credential_values_checked: privateValues.length, note: 'Zero configured values is source/accessor validation only; not production-secret verification' }));
