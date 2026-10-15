import { readFileSync } from 'node:fs';
import { runScriptFactory } from './script-factory.ts';
import { runOnboarding } from './onboarding.ts';
import { runReconciliation } from './reconciliation.ts';

/** Artifact: offline fixture runner. Reads a local JSON file, writes stdout only. */
const runners = { 'script-factory': runScriptFactory, onboarding: runOnboarding, reconciliation: runReconciliation };
try {
  const [name, fixture, ...extra] = process.argv.slice(2);
  if (!name || !Object.hasOwn(runners, name) || extra.length) throw new Error('Usage: node src/cli.ts <script-factory|onboarding|reconciliation> [fixture.json]');
  const runner = runners[name as keyof typeof runners];
  const path = fixture ?? new URL(`../examples/${name}/input.json`, import.meta.url);
  const input: unknown = JSON.parse(readFileSync(path, 'utf8'));
  const result = runner(input);
  console.log(`SYNTHETIC OFFLINE DEMO: ${name}`);
  for (const line of result.trace) console.log(`- ${line}`);
  console.log('\nJSON result:');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(`Input error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
