/**
 * The gws program of one release, checked by the sha256 of its archive before every run.
 *
 * gwsProgram: the path of gws for this system, its archive downloaded once into the cache.
 * GWS: the release and, per system, its archive and sha256; a system without a line waits.
 *
 * The hash does for the archive what a commit id does for an action: a replaced archive no longer
 * matches, and nothing of it runs. The archive stays in the cache and is checked again on every
 * run, then unpacked afresh, so a changed program in the cache never runs either. A new system is
 * one more line in GWS, with the sha256 GitHub shows for its archive.
 *
 * Run as a script, it hands its arguments to gws, for the sign-in: pnpm baselines:gws auth login
 *
 * @example const gws = await gwsProgram();
 */
import { execFile, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { $try, RefusalError, causeText } from '@honeyglass/utils/ts';

const run = promisify(execFile);

type Archive = { name: string; sha256: string };

const ARCHIVES: Partial<Record<string, Archive>> = {
  'darwin-arm64': {
    name: 'google-workspace-cli-aarch64-apple-darwin.tar.gz',
    sha256: '1d2a9ffd5bc9b2c2c4b48630daf082fad13d9e57d741988a2c248eed562f7dac',
  },
  'darwin-x64': {
    name: 'google-workspace-cli-x86_64-apple-darwin.tar.gz',
    sha256: '51f9bd731404d4bba26c36e2e30dd68c56dccd1f834c01252cb0b14d6a6544b2',
  },
};

export const GWS = { version: '0.22.5', archives: ARCHIVES };

/** Outside the repository's tracked files, and kept across installs. */
const CACHE = fileURLToPath(new URL('../../node_modules/.cache/oriko', import.meta.url));
/** An archive is about 6 MB; more than this is not the archive the table names. */
const MAX_BYTES = 50_000_000;

type Download = (url: string) => Promise<Uint8Array>;

/**
 * @param cache - the folder that keeps the archive
 * @param system - the platform and architecture, such as darwin-arm64
 * @param download - how the archive is fetched when the cache lacks it
 * @returns the path of the gws program, unpacked from an archive whose sha256 matched
 * @throws RefusalError for a system without an archive, a failed download, or a wrong sha256
 */
export async function gwsProgram(
  cache = CACHE,
  system = `${process.platform}-${process.arch}`,
  download: Download = fromGitHub,
) {
  const archive = GWS.archives[system];
  if (archive === undefined) throw unsupported(system);
  const folder = join(cache, `gws-${GWS.version}-${system}`);
  const path = join(folder, archive.name);
  const cached = await $try(readFile(path), { or: null, expected: isMissing });
  const bytes = cached ?? (await download(urlOf(archive.name)));
  if (sha256(bytes) !== archive.sha256) {
    await rm(folder, { recursive: true, force: true });
    throw mismatch(archive.name, cached !== null);
  }
  await mkdir(folder, { recursive: true });
  if (cached === null) await writeFile(path, bytes);
  await run('tar', ['-xzf', path, '-C', folder, './gws']);
  return join(folder, 'gws');
}

const urlOf = (name: string) =>
  `https://github.com/googleworkspace/cli/releases/download/v${GWS.version}/${name}`;

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

async function fromGitHub(url: string) {
  const response = await $try(fetch(url));
  if (response.error !== null) throw downloadFailed(url, response.error);
  const length = Number(response.data.headers.get('content-length') ?? 0);
  if (response.data.ok === false || length > MAX_BYTES)
    throw downloadFailed(url, `HTTP ${response.data.status}, ${length} bytes`);
  return new Uint8Array(await response.data.arrayBuffer());
}

const isMissing = (error: Error) => 'code' in error && error.code === 'ENOENT';

const unsupported = (system: string) =>
  new RefusalError({
    kind: 'ask',
    step: 'baselines',
    reason: `gws ${GWS.version} is not set up for ${system} yet; GWS in tools/baselines/gws.ts lists only ${Object.keys(GWS.archives).join(', ')}`,
    next: `Ask the person whether to add the ${system} archive of gws ${GWS.version} with the sha256 GitHub shows for it`,
    state: 'Nothing was downloaded.',
  });

const mismatch = (name: string, wasCached: boolean) =>
  new RefusalError({
    kind: 'ask',
    step: 'baselines',
    reason: `the sha256 of ${name} does not match GWS in tools/baselines/gws.ts${wasCached ? ' (the copy in the cache)' : ''}`,
    next: 'Stop and tell the person: the archive may have been replaced; run nothing of it',
    state: 'The archive was deleted from the cache; nothing of it ran.',
  });

const downloadFailed = (url: string, cause: unknown) =>
  new RefusalError({
    kind: 'retry',
    step: 'baselines',
    reason: `the download of ${url} failed: ${causeText(cause)}`,
    next: 'Call again in a minute; after three tries, tell the person',
    state: 'Nothing was written.',
    cause,
  });

// Run as a script: the arguments go to gws, with the terminal, so the sign-in can open a browser.
if (import.meta.main) {
  const gws = await gwsProgram();
  const result = spawnSync(gws, process.argv.slice(2), { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
}
