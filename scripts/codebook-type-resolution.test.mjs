import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import ts from 'typescript';

const expectTypeChecks = (source, consumer, resolution) => {
  const program = ts.createProgram([source], {
    noEmit: true,
    strict: true,
    skipLibCheck: false,
    target: ts.ScriptTarget.ES2022,
    module: resolution === 'NodeNext' ? ts.ModuleKind.NodeNext : ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind[resolution]
  });
  const errors = ts.getPreEmitDiagnostics(program)
    .filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, ts.formatDiagnosticsWithColorAndContext(errors, {
    getCanonicalFileName: file => file,
    getCurrentDirectory: () => consumer,
    getNewLine: () => '\n'
  }));
};

const npm = (args, cwd) => {
  const result = spawnSync('npm', args, { cwd, encoding: 'utf8', timeout: 120000 });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
};

for (const resolution of ['Bundler', 'NodeNext']) {
  test(`public codebook types support ${resolution} consumers`, async () => {
    const consumer = await mkdtemp(join(tmpdir(), 'codebook-type-consumer-'));
    try {
      const scope = join(consumer, 'node_modules', '@iqb');
      await mkdir(scope, { recursive: true });
      await symlink(resolve('dist/ngx-coding-components'), join(scope, 'ngx-coding-components'), 'dir');
      const source = join(consumer, 'consumer.mts');
      await writeFile(source, `
        import { CodebookGenerator } from '@iqb/ngx-coding-components/codebook-generator';
        import type { CodeBookContentSetting, UnitPropertiesForCodebook }
          from '@iqb/ngx-coding-components/codebook-models';
        const units: UnitPropertiesForCodebook[] = [{ id: 1, key: 'U', name: 'Typed consumer',
          variables: [{ id: 'V', type: 'string', format: '', multiple: false, nullable: false,
            values: [], valuePositionLabels: [] }] }];
        const options: CodeBookContentSetting = { exportFormat: 'json', missingsProfile: '',
          hasOnlyManualCoding: false, hasClosedVars: false, hasOnlyVarsWithCodes: true,
          hasDerivedVars: true, hasGeneralInstructions: true, codeLabelToUpper: false,
          showScore: true, hideItemVarRelation: false };
        const output: Promise<Blob> = CodebookGenerator.generateCodebook(units, options, []);
        void output;
      `);
      expectTypeChecks(source, consumer, resolution);
    } finally {
      await rm(consumer, { recursive: true, force: true });
    }
  });
}

test('packed public Angular entry points support strict Bundler consumers', async () => {
  const consumer = await mkdtemp(join(tmpdir(), 'packed-ui-type-consumer-'));
  try {
    const library = JSON.parse(await readFile('dist/ngx-coding-components/package.json', 'utf8'));
    const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
    const [tarball] = JSON.parse(npm(['pack', '--ignore-scripts', '--json', '--pack-destination', consumer],
      resolve('dist/ngx-coding-components')));
    // Use the host versions tested by this checkout, including one consistent Angular major.
    const peers = Object.fromEntries(Object.keys(library.peerDependencies).map(name => (
      [name, lock.packages[`node_modules/${name}`].version]
    )));
    await writeFile(join(consumer, 'package.json'), JSON.stringify({
      name: 'packed-ui-type-consumer', private: true, type: 'module',
      dependencies: { ...peers, [library.name]: `file:${join(consumer, tarball.filename)}` }
    }));
    npm(['install', '--ignore-scripts', '--no-audit', '--no-fund'], consumer);
    const source = join(consumer, 'consumer.mts');
    await writeFile(source, `
      import { SchemerComponent } from '@iqb/ngx-coding-components';
      import { CodebookExportComponent } from '@iqb/ngx-coding-components/codebook-export';
      import { CodebookGenerator } from '@iqb/ngx-coding-components/codebook-generator';
      import type { UnitSelectionItem } from '@iqb/ngx-coding-components/codebook-models';
      import * as translations from '@iqb/ngx-coding-components/translations';
      import type { MatTableDataSource } from '@angular/material/table';
      const exportForm = null! as CodebookExportComponent;
      const dataSource: MatTableDataSource<UnitSelectionItem> = exportForm.dataSource;
      void [SchemerComponent, CodebookGenerator, translations, dataSource];
    `);
    expectTypeChecks(source, consumer, 'Bundler');
  } finally {
    await rm(consumer, { recursive: true, force: true });
  }
});
