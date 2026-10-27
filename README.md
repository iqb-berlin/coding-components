[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE.md)

This repository contains UI components used to **create, validate and test coding schemes** and to **code responses** (as used by IQB assessment applications).

The underlying data specifications are maintained in:

- **Coding scheme spec**: `@iqbspecs/coding-scheme`
- **Response spec**: `@iqbspecs/response`
- **Variable info spec**: [`@iqbspecs/variable-info`](https://iqb-specifications.github.io/concepts/plugins/variable-info.html)
- **Coding engine / helpers**: `@iqb/responses`

[IQB Specifications on GitHub](https://github.com/iqb-specifications/)

This repo provides two main deliverables:

- **Angular library**: `@iqb/ngx-coding-components`
- **Verona module**: A packaged *Schemer* UI (HTML bundle) for hosts implementing the Verona interfaces.

---

# ngx-coding-components

[![npm](https://img.shields.io/npm/v/%40iqb%2Fngx-coding-components)](https://www.npmjs.com/package/@iqb/ngx-coding-components)

## Who is this for?

- **End users (coders / test developers)**
  - Use the *Schemer* UI to edit a coding scheme, manage codes, and inspect validation issues.
  - Use the *Scheme Checker* UI to quickly try out responses against a scheme.
- **Developers / integrators**
  - Embed the components into your Angular application.
  - Or use the Verona packaged module if you are not building an Angular UI.

## What you get

- **`<iqb-schemer>`**
  - Main editor UI for `CodingScheme` based on a `VariableInfo[]` list.
- **`<scheme-checker>`**
  - Small utility UI: enter base variable values and run the coding engine to see the resulting codes/scores.
- **`<schemer-standalone-menu>`**
  - Floating menu used during development:
    - load variable list from JSON
    - load/save coding scheme JSON
    - switch user role (read-only vs. minimal vs. maximal editing)

Additionally, this library exports multiple dialogs and helpers (see “Public API / Exports”).

## Key Features

- **Rich Editor**: Full coding scheme editor with support for codes, rule sets, and manual instructions.
- **Validation**: Real-time validation of coding schemes (circular dependencies, missing references, etc.).
- **Rich Text Support**: Integrated TipTap editor for manual instructions.
- **Testing Utility**: Built-in "Scheme Checker" to simulate response coding.
- **Framework Agnostic**: Exported as Angular Elements (Web Components).

---

# Installation (Angular)

## Coding Components 5: Tiptap 3

The library requires Angular 21, Tiptap 3.32+ within major version 3 and
ngx-tiptap 14.0.1+ within major version 14. Upgrade the host's Tiptap packages
together with `@iqb/ngx-coding-components`; the old Tiptap 2 peer graph is
incompatible. This dependency change is the reason for the library's major bump.
The packaged Verona Schemer carries its own editor dependencies and can be
upgraded independently of other iframe modules.

## Partial credit (Schemer 2.9.0)

In the source/derivation parameters of `SUM_SCORE`, `SUM_CODE` and `CONCAT_CODE`,
two independent options allow displayed source responses or empty invalid source
responses to contribute to a partially answered task. Both are disabled by
default. They require at least one regularly coded answer; completely
unprocessed tasks retain their original status, and pending coding is deferred.

The contribution is `0` for sums and `x` for concatenated codes (`0_x`, distinct
from `0_0`). Only `null`, empty text and an empty list count as empty invalid
answers; `false` and `0` remain values. Original source responses are preserved.
The options, descriptions and `x` combinations survive scheme import/export.
Existing SOLVER policies are unchanged.

This feature requires `@iqbspecs/coding-scheme@3.5.0` and
`@iqb/responses@5.4.0`, both published on npm. The lockfile resolves published
registry packages; a fresh `npm ci` installs the release dependencies without
local sibling checkouts or prepared tarballs.

## Schemer viewport support

The Schemer supports container widths of **320 CSS pixels and above**, including
375, 768, 1024 and 1440 px. At narrow widths the variable navigation moves above
the editor, editor cards stack and toolbars wrap. The variable list and editor
scroll vertically independently so their actions remain reachable. The layout
uses the component's container width, including when embedded in a Verona iframe.
Below 320 px the component retains its minimum width; the host must provide
horizontal scrolling.

Run the browser regression tests with `npm run test:schemer:responsive` after
`npx playwright install chromium`. For a visible local browser run, append
`-- --headed`. The tests start their own Schemer server on port 4210.

## Prerequisites

This library is built for modern Angular and requires:

- **Angular Material**: Used for all UI components.
- **@ngx-translate/core**: Used for internationalization.
- **TipTap**: Used for rich text editing.

### Peer Dependencies

Install the required peer dependencies if not already present:

```bash
npm i @angular/material @angular/cdk @ngx-translate/core
npm i @tiptap/core @tiptap/extension-bold @tiptap/extension-italic @tiptap/extension-bullet-list ... (see package.json for full list)
npm i ngx-tiptap
```

### Install the library

```bash
npm i @iqb/ngx-coding-components
```

You must also satisfy its peer dependencies in your app (Angular, Material, ngx-translate, etc.).

## Import style: standalone components

The components are implemented as **standalone** Angular components. You typically import them directly:

```ts
import { SchemerComponent } from '@iqb/ngx-coding-components';
import { SchemeCheckerComponent } from '@iqb/ngx-coding-components';
import { SchemerStandaloneMenuComponent } from '@iqb/ngx-coding-components';
```

During development inside this repository, the demo app uses a TS path alias:

```json
{
  "paths": {
    "@ngx-coding-components/*": ["projects/ngx-coding-components/src/lib/*"]
  }
}
```

External consumers should use the npm package name `@iqb/ngx-coding-components`.

---

# Quick Start

To use the `SchemerComponent` in your standalone Angular component:

```ts
import { Component } from '@angular/core';
import { SchemerComponent, CodingScheme } from '@iqb/ngx-coding-components';
import { VariableInfo } from '@iqbspecs/variable-info';

@Component({
  selector: 'my-app',
  standalone: true,
  imports: [SchemerComponent],
  template: `
    <iqb-schemer
      [varList]="myVariables"
      [codingScheme]="myScheme"
      [userRole]="'RW_MAXIMAL'"
      (codingSchemeChanged)="onSchemeChanged($event)">
    </iqb-schemer>
  `
})
export class MyAppComponent {
  myVariables: VariableInfo[] = [/* ... */];
  myScheme: CodingScheme = new CodingScheme([/* ... */]);

  onSchemeChanged(newScheme: CodingScheme | null) {
    console.log('Scheme updated:', newScheme);
  }
}
```

---

# User Roles

The `userRole` input controls the editing capabilities:

- **`RO` (Read-only)**: Users can view the scheme but cannot change anything.
- **`RW_MINIMAL` (Restricted Edit)**: Users can edit manual instructions and basic code properties but cannot add/remove codes or change complex rules.
- **`RW_MAXIMAL` (Full Edit)**: Full access to all editing features (adding variables, codes, rules, etc.).

---

# Data Structures (Examples)

### VariableInfo (`@iqbspecs/variable-info`)
Describes the input variables from the assessment.

```json
{
  "id": "VAR_01",
  "type": "string",
  "multiple": false,
  "values": [
    { "value": "A", "label": "Option A" },
    { "value": "B", "label": "Option B" }
  ]
}
```

### CodingScheme (`@iqbspecs/coding-scheme`)
Defines how values are transformed into codes/scores.

```json
{
  "variableCodings": [
    {
      "id": "VAR_01",
      "sourceType": "BASE",
      "codes": [
        {
          "id": 1,
          "type": "FULL_CREDIT",
          "score": 1,
          "ruleSets": [{
            "rules": [{ "method": "MATCH", "parameters": ["A"] }]
          }]
        }
      ]
    }
  ]
}
```

---

# Component Reference

## `SchemerComponent` (`<iqb-schemer>`)

Main editor UI.

| Input | Type | Description |
| :--- | :--- | :--- |
| `codingScheme` | `CodingScheme \| null` | The scheme to edit. |
| `varList` | `VariableInfo[]` | List of available variables. |
| `userRole` | `'RO' \| 'RW_MINIMAL' \| 'RW_MAXIMAL'` | Editing permissions. |

| Output | Type | Description |
| :--- | :--- | :--- |
| `codingSchemeChanged` | `CodingScheme \| null` | Emitted whenever the scheme is modified. |

## `SchemeCheckerComponent` (`<scheme-checker>`)

Utility to test the coding scheme with dummy values.

**Purpose**

- Creates a small input form for all base variables of the scheme.
- Runs the coding engine (`CodingSchemeFactory.code(...)`).
- Opens a dialog that displays coded responses.

**Selector**

- `scheme-checker`

**Input**

- `codingScheme: CodingScheme | null`

**How input values are interpreted**

- Empty -> `''`
- If the text starts with `[` it tries to parse JSON and accepts arrays
- Otherwise it is treated as a string

**Typical usage**

```html
<scheme-checker [codingScheme]="codingScheme"></scheme-checker>
```

## `SchemerStandaloneMenuComponent` (`<schemer-standalone-menu>`)

**Purpose**

- Convenience UI for development / standalone usage.
- Lets you load and save JSON files.
- Emits role changes.

**Selector**

- `schemer-standalone-menu`

**Inputs**

- `codingScheme: CodingScheme | null`
- `varList: VariableInfo[]`
- `userRole: 'RO' | 'RW_MINIMAL' | 'RW_MAXIMAL'`

**Outputs**

- `userRoleChanged: EventEmitter<UserRoleType>`
- `codingSchemeChanged: EventEmitter<CodingScheme | null>`
- `varListChanged: EventEmitter<VariableInfo[] | null>`

**Notes**

- `saveCodingScheme()` downloads a `coding-scheme.json`.
- `loadCodingScheme()` accepts either:
  - an object with `variableCodings`, or
  - an array of variable codings

---

# Dialogs API

The library exports several MatDialog-ready components:

- **`ConfirmDialogComponent`**: Standard yes/no confirmation.
- **`MessageDialogComponent`**: Informational alert.
- **`SimpleInputDialogComponent`**: Single-field text input.
- **`ShowCodingProblemsDialogComponent`**: Displays validation errors/warnings from the coding scheme.
- **`SelectVariableDialogComponent`**: Picker for variables from the `varList`.
- **`CodingSchemeDialogComponent`**: Wrapper to show a read-only view of a scheme.

---

# Internationalization (ngx-translate)

The library ships with German (`de`) translations. Use the `NgxCodingComponentsTranslateLoader` to integrate them.

```ts
import {
  NgxCodingComponentsTranslateLoader
} from '@iqb/ngx-coding-components/translations';

// In your app providers:
TranslateModule.forRoot({
  loader: {
    provide: TranslateLoader,
    useClass: NgxCodingComponentsTranslateLoader
  }
})
```

The `translations` secondary entry point contains the translation loader,
German dictionary and merge helpers. Importing from it does not pull the full
component library into the application's initial bundle. Applications with an
existing loader can merge `NGX_CODING_COMPONENTS_DE_TRANSLATIONS` into their
own translations.

The dictionary also includes the `codebook.*` labels, tooltips and selection
counts used by `CodebookExportComponent`; no Studio translation file is needed.

Configure `TranslateModule.forRoot` once at the application root. The components
reuse that translation service. If your application loads its own dictionaries,
recursively merge the library dictionary as defaults and apply application texts
as overrides. Your own files only need application texts and intentional
overrides; copying all library labels into them is unnecessary.
The exported `mergeTranslations` helper performs that recursive merge without
mutating either input. `selectTranslationsForLanguage` selects a locale, its
base language, or the German fallback before applying application overrides.

If your app already has `TranslateModule` configured, you usually do not need a second root configuration; just make sure translations include the keys used by these components.

---

# Styling

1.  **Material Theme**: Ensure a Material theme is loaded in your application.
2.  **Material Icons**: Include the Material Icons font in your `index.html`.
3.  **CSS**: The components use standard flexbox layouts. Ensure the parent container has a defined height.

---

# Public API / Exports

The library entry point is `projects/ngx-coding-components/src/public-api.ts`.

Exports include:

- Components:
  - `SchemeCheckerComponent`
  - `ShowCodingResultsComponent`
  - `VarCodingComponent`
  - `SchemerComponent`
  - `SchemerStandaloneMenuComponent`
- Translate loader:
  - `NgxCodingComponentsTranslateLoader`
- Dialog components:
  - `ConfirmDialogComponent`
  - `ShowCodingProblemsDialogComponent`
  - `MessageDialogComponent`
  - `SelectVariableDialogComponent`
  - `ShowCodingDialogComponent`
  - `SimpleInputDialogComponent`
  - `CodingSchemeDialogComponent`

- Custom Elements helper:
  - `registerNgxCodingComponentsElements`

---

# End-user guide (quick)

## Typical workflow

- **Load variables** (if you use the standalone menu)
  - Provide a `VariableInfo[]` JSON file.
- **Edit coding scheme**
  - Add/modify codes and rules per variable.
  - Switch role if you need to restrict editing.
- **Validate and test**
  - Use the Scheme Checker to input sample responses.
  - Inspect resulting codes/scores.
- **Save coding scheme**
  - Export JSON and integrate it into your assessment runtime.

---

# Development

## Scripts

| Command | Description |
| :--- | :--- |
| `npm start` | Run the demo application. |
| `npm run build_cc` | Build the library (`ngx-coding-components`). |
| `npm run test:cc` | Run library unit tests. |
| `npm run lint` | Run ESLint across the project. |
| `npm run audit:prod` | Audit production dependencies. |
| `npm run build:elements` | Build the Web Components bundle. |
| `npm run buildAndPack_sc` | Build and package the Verona Schemer. |

## CI gates

Pull requests and pushes run GitHub Actions checks for production dependency security, linting, and coverage tests. The `security-audit` job runs `npm audit --omit=dev --audit-level=high`; high or critical production dependency findings must be resolved before merging.

## Demo App
The folder `/src` contains a demo application that showcases all components. Use `npm start` to run it locally.

---

# Publishing `@iqb/ngx-coding-components`

The steps to publish a new release of the library:

- **Update version** in `projects/ngx-coding-components/package.json`
- **Update docs** (this `README.md` and/or `projects/ngx-coding-components/README.md`)
- **Build** with `build_cc`
- **Publish** with `npm_publish`

---

# Verona Schemer

![GitHub tag (latest SemVer)](https://img.shields.io/github/v/tag/iqb-berlin/coding-components)

The `schemer` UI is also published as a
[Schemer plugin](https://iqb-specifications.github.io/concepts/plugins/schemer.html).

Schemer 2.9.0 uses the [Verona Schemer 3.2.0 message contract](https://github.com/iqb-specifications/plugin-schemer/tree/3.2.0)
with Variable Info 1.x. The wrapper's `apiVersion` identifies this communication
contract, independently of the Coding-Scheme 3.5 format stored in `codingScheme`.
Ready notifications carry the JSON-LD object as a JSON string in `metadata`;
scheme-change notifications use ISO timestamps and the active host session.
Start commands require a non-empty session ID; omitted variables default to an
empty list and configuration is optional. Incoming messages are accepted only
from the direct parent window, including hosts with an opaque origin. Messages
from other frames or without a sender are ignored. The Studio `role` extension
and the existing `variables` extension on scheme-change notifications remain supported.
The module does not currently emit shared-parameter updates or coding dependencies.

The browser suite validates messages against fixed local copies of the official
3.2.0/Variable Info 1.3 schemas. CI also builds and exercises the packed HTML,
including its advertised API version and the existing Studio-style message flow.

- **Download**: [Latest releases](https://github.com/iqb-berlin/coding-components/releases/latest)
- **Integration**: Simply add the `.html` bundle to your Verona-compatible host.

---

# Web Components (Angular Elements)

This repository can also build the main UI components as **Web Components** using **Angular Elements**.

Build the framework-agnostic bundle:

```bash
npm run build:elements
```

Register the elements in your JS application:

```ts
import { registerNgxCodingComponentsElements } from '@iqb/ngx-coding-components';
// ... obtain injector
registerNgxCodingComponentsElements(injector, { prefix: 'ngx' });
```

This will register tags like `<ngx-schemer>` and `<ngx-scheme-checker>`.

---
