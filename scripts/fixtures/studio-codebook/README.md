# Studio DOCX reference

Generated from iqb-berlin/studio-lite develop commit
`2504265721a59c7c65425072951ce82ab16f0fb8`, class `DownloadDocx`, using docx 8.5.0.
The input is in the `Studio reference preserves ...` contract test.

Only two baseline normalizations:
- `IQB-Studio Codebook` becomes the approved neutral `IQB Codebook`.
- The generation date becomes `{{DATE}}`.

Document XML, styles, numbering, settings and footer must otherwise match exactly.
The fixture deliberately excludes the separately tested approved corrections
(code/missing 0, item relationships, plain instructions and whitespace boundaries).

## Synthetic raw-schema reference

`synthetic-reference.json` contains original Studio JSON and SHA-256 digests of
every DOCX part for 32 formatting combinations, starting from raw invented
schemes in `../codebook-synthetic.mjs`. It covers all 13 supported rule methods,
AND/OR rules and rule sets, array positions, multiple tasks, derived variables,
aliases, formatted text, list paragraphs, images and inline/block formulas.
Whitespace-only general instructions must retain the original Studio layout.

The synthetic categories were informed by five example ZIPs, but none of their
identifiers, task content, instructions, rules or images are included. The example
ZIPs are neither required by tests nor committed as reference fixtures.

Besides the two normalizations above, ZIP container timestamps are irrelevant,
`docProps/core.xml` (creation/modification metadata) is excluded, and random image
filenames are replaced in first-reference order. Image bytes, relationship
targets, document XML, styles, widths, margins, numbering and page fields remain
part of the exact comparison. `codebook-docx-test-utils.mjs` implements this.

The baseline is captured explicitly from the immutable Studio commit above:

```sh
node scripts/capture-studio-codebook-reference.mjs /path/to/studio-checkout
```

CI only reads this fixture. Never regenerate it from the shared generator to make
a failing test pass. Approved semantic corrections are checked independently by
the option matrix rather than being disguised as original Studio behaviour.
