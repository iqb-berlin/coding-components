# Synthetic Office acceptance documents

These documents contain invented test data only. They are retained at a public,
versioned URL so Microsoft Office Web Viewer can render the actual DOCX files
without uploading user data to an Office account.

- `rich-scores.docx` and `rich-no-scores.docx` are outputs of
  `scripts/compare-codebook-installations.mjs` using the installed shared package
  at commit `aa404bc2`. Every relevant DOCX part was compared with the immutable
  original Studio reference. The corresponding Kodierbox outputs have identical
  normalized document parts.
- `studio-browser.docx` is an actual browser download from Studio with its real
  production backend and a fresh migrated test database. It includes the rich
  corpus plus NBSP, narrow NBSP and repeated spaces in general/code instructions.

Source fixtures: `../codebook-synthetic.mjs`, `../codebook-whitespace.mjs`.
Package SHA256: `dcee6cc39436baf91cf2558afedfbc202e044ca14dbf72c7bfdf4b381e5c0ccd`.

These files are inputs to visual acceptance, not proof that Office has rendered
or passed them. Execution results are documented separately.

`original-studio-scores.docx` and `original-studio-no-scores.docx` are generated
from the immutable pre-harmonisation Studio renderer and adapter at
`2504265721a59c7c65425072951ce82ab16f0fb8`, using the same synthetic rich corpus
and dependency versions. They support direct same-engine visual comparison.

`editor-combinations.docx` contains all 48 valid shared inline-mark combinations
and mixed formula/list/image cases. Regenerate after `npm run build_cc` with
`node scripts/create-codebook-editor-office-fixture.mjs`. Its executable contract
is `scripts/codebook-editor-matrix.test.mjs` (384 cases, each ESM and CommonJS).
