// Pins the README's links into this package to the release tag, so the npm
// page of a version keeps showing that version's docs once master moves on.
// The README links its own files by absolute URLs on master; each one that
// points into this package moves to the tag, and must exist there. A link out
// of the package — another repository, or a sibling package of a monorepo,
// which releases on its own — keeps naming master. A relative link stops the
// release: npm would resolve it against the default branch.
//
// Usage, from the package directory: node pin-readme-links.mjs <tag>
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const [tag] = process.argv.slice(2);
const repo = process.env.GITHUB_REPOSITORY;

if (!tag || !repo) throw new Error('Usage: GITHUB_REPOSITORY=owner/name node pin-readme-links.mjs <tag>');

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

const exists = (path) => {
  try {
    git('cat-file', '-e', `${tag}:${path}`);

    return true;
  } catch {
    return false;
  }
};

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The package directory relative to the repository root with a trailing
// slash, '' at the root.
const directory = git('rev-parse', '--show-prefix');
const within = `${escape(directory)}[^\\s)"'<>\\]\`#?]*`;
const pinned = new RegExp(`https://(?:github\\.com/${escape(repo)}/(?:blob|tree)|raw\\.githubusercontent\\.com/${escape(repo)})/master/(${within})`, 'g');
const relative = /\]\(\s*<?(?!#|[a-z][a-z0-9+.-]*:|\/)[^\s)>]|^\s*\[[^\]]+\]:\s*<?(?!#|[a-z][a-z0-9+.-]*:|\/)\S|\b(?:href|src)\s*=\s*["'](?!#|[a-z][a-z0-9+.-]*:|\/)[^\s"'>]/gim;

const source = readFileSync('README.md', 'utf8');

const problems = [
  ...[...source.matchAll(relative)].map(({ index }) => `a relative link: ${source.slice(index).split('\n')[0].slice(0, 80).trim()}`),
  ...[...source.matchAll(pinned)]
    .filter(({ 1: path }) => !exists(decodeURIComponent(path).replace(/\/$/, '') || '.'))
    .map(({ 0: url }) => `nothing at ${tag}: ${url}`),
];

if (problems.length) {
  console.error(`README.md cannot be pinned to ${tag}:\n${problems.map((problem) => `  ${problem}`).join('\n')}`);
  process.exit(1);
}

const ref = encodeURIComponent(tag).replace(/%40/g, '@');

writeFileSync('README.md', source.replace(pinned, (url) => url.replace('/master/', `/${ref}/`)));
console.log(`README.md pinned to ${tag}.`);
