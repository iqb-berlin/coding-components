import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import ts from 'typescript';

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
      const program = ts.createProgram([source], {
        noEmit: true,
        strict: true,
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
    } finally {
      await rm(consumer, { recursive: true, force: true });
    }
  });
}
