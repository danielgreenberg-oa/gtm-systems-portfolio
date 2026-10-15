import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { runScriptFactory } from '../src/script-factory.ts';
import { runOnboarding } from '../src/onboarding.ts';
import { runReconciliation } from '../src/reconciliation.ts';

const runners = { 'script-factory': runScriptFactory, onboarding: runOnboarding, reconciliation: runReconciliation };
// Expected files are hand-authored contract subsets of the full JSON result.
function contract(actual: unknown, expected: unknown): unknown {
  if (Array.isArray(expected)) {
    assert.ok(Array.isArray(actual));
    assert.equal(actual.length, expected.length);
    return expected.map((entry, index) => contract(actual[index], entry));
  }
  if (expected !== null && typeof expected === 'object') {
    assert.ok(actual !== null && typeof actual === 'object');
    return Object.fromEntries(Object.entries(expected).map(([key, value]) => [key, contract((actual as Record<string, unknown>)[key], value)]));
  }
  return actual;
}
for (const [name, run] of Object.entries(runners)) {
  const directory = new URL(`../examples/${name}/`, import.meta.url);
  for (const file of readdirSync(directory).filter(file => file.endsWith('.json') && !file.endsWith('expected.json'))) {
    test(`${name}/${file} matches hand-authored expected contract`, () => {
      const input = JSON.parse(readFileSync(new URL(file, directory), 'utf8')) as unknown;
      const expectedName = file === 'input.json' ? 'expected.json' : file.replace('.json', '.expected.json');
      const expected = JSON.parse(readFileSync(new URL(expectedName, directory), 'utf8')) as unknown;
      const result = run(input);
      assert.deepEqual(contract(result, expected), expected);
      assert.deepEqual(run(input), result, 'replay must be deterministic');
    });
  }
  test(`${name} CLI prints a readable trace and parseable JSON`, () => {
    const result = spawnSync(process.execPath, ['--experimental-strip-types', 'src/cli.ts', name], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const [trace, json] = result.stdout.split('\nJSON result:\n');
    assert.match(trace ?? '', /SYNTHETIC OFFLINE DEMO/);
    assert.equal(JSON.parse(json ?? '').artifact, 'synthetic-offline-demo');
  });
}
test('CLI rejects malformed input with a clear error and no success output', () => {
  const result = spawnSync(process.execPath, ['--experimental-strip-types', 'src/cli.ts', 'script-factory', 'package.json'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Input error:/);
  assert.equal(result.stdout, '');
});
test('CLI rejects missing paths and excess arguments', () => {
  for (const args of [['onboarding', 'missing-fixture.json'], ['onboarding', 'package.json', 'extra']]) {
    const result = spawnSync(process.execPath, ['--experimental-strip-types', 'src/cli.ts', ...args], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Input error:/);
  }
});
test('CLI accepts an explicit alternate fixture path', () => {
  const result = spawnSync(process.execPath, ['--experimental-strip-types', 'src/cli.ts', 'script-factory', 'examples/script-factory/missing-approval.json'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const json = JSON.parse(result.stdout.split('\nJSON result:\n')[1] ?? '');
  assert.equal(json.status, 'held');
  assert.equal(json.package, null);
});
