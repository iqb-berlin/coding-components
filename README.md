[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE.md)

This repository contains UI components used to **create, validate and test coding schemes** and to **code responses** (as used by IQB assessment applications).

The underlying data specifications are maintained in:

- **Coding scheme spec**: `@iqbspecs/coding-scheme`
- **Response spec**: `@iqbspecs/response`
- **Variable info spec**: `@iqbspecs/variable-info`
- **Coding engine / helpers**: `@iqb/responses`

https://github.com/iqb-specifications/

This repo provides two deliverables:

- **Angular library**: `@iqb/ngx-coding-components`
- **Verona module**: a packaged *Schemer* UI (HTML bundle) for hosts implementing the Verona interfaces

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
    - switch user role (read-only vs minimal vs maximal editing)

Additionally, this library exports multiple dialogs and helpers (see “Public API / Exports”).

---

# Installation (Angular)

## Prerequisites

This library is built for modern Angular and uses:

- Angular (see `projects/ngx-coding-components/package.json` peer deps)
- Angular Material
- `@ngx-translate/core`
- TipTap / ngx-tiptap (used for rich text editing)

Install the package:

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

# Internationalization (ngx-translate)

The UI strings are wired through `@ngx-translate/core`. This library ships at least German translations.

## Minimal setup

In your app’s providers, configure `TranslateModule.forRoot(...)` and choose a loader.

This library exports a `TranslateLoader` implementation:

- `NgxCodingComponentsTranslateLoader` (currently always returns German translations)

Example:

```ts
import { importProvidersFrom } from '@angular/core';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { NgxCodingComponentsTranslateLoader } from '@iqb/ngx-coding-components';

export const APP_PROVIDERS = [
  importProvidersFrom(
    TranslateModule.forRoot({
      defaultLanguage: 'de',
      loader: {
        provide: TranslateLoader,
        useClass: NgxCodingComponentsTranslateLoader
      }
    })
  )
];
```

If your app already has `TranslateModule` configured, you usually do not need a second root configuration; just make sure translations include the keys used by these components.

---

# Angular Material & styling

These components use Angular Material. Your host app must:

- Include a Material theme (prebuilt or custom)
- Include Material icons (if you want the icons to display)

In this repo’s demo app, the theme + icons are included via `angular.json` styles.

---

# Core data types

This library works with the IQB specs types:

## `CodingScheme`

From `@iqbspecs/coding-scheme`.

- Contains `variableCodings`.
- Each variable coding can be `BASE` or derived and may define codes and rules.

## `VariableInfo[]`

From `@iqbspecs/variable-info`.

- Describes variables shown/edited in the UI.
- Used by the Schemer to provide labels, types, allowed values, etc.

## `Response[]`

From `@iqbspecs/response`.

- Used by the coding engine (`@iqb/responses`) and by the Scheme Checker.

---

# Component documentation

## `SchemerComponent` (`<iqb-schemer>`)

**Purpose**

- Displays base and derived variables.
- Lets users edit a `CodingScheme`.
- Provides validation feedback.

**Selector**

- `iqb-schemer`

**Inputs**

- `codingScheme: CodingScheme | null`
- `varList: VariableInfo[]`
- `userRole: 'RO' | 'RW_MINIMAL' | 'RW_MAXIMAL'`

**Outputs**

- `codingSchemeChanged: EventEmitter<CodingScheme | null>`

**Typical usage**

```html
<iqb-schemer
  [varList]="varList"
  [userRole]="userRole"
  [codingScheme]="codingScheme"
  (codingSchemeChanged)="onCodingSchemeChanged($event)"
></iqb-schemer>
```

## `SchemeCheckerComponent` (`<scheme-checker>`)

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

# Development in this repository

## Demo / manual testing

During development, use the application in `/src`.

- Start the demo app:
  - use the script `start` in `package.json`
- If you changed the component library:
  - run `build_cc` first to build into `dist`

## Running tests

Use the scripts in the root `package.json`:

- `test:cc` / `test:cc:watch`
- `test:schemer` / `test:schemer:watch`

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

The `schemer` UI is also published as a [Verona](https://verona-interfaces.github.io) module.

This allows embedding the Schemer in any host application that supports the Verona specification.

Get the latest HTML bundle from the GitHub releases:

- https://github.com/iqb-berlin/coding-components/releases/latest

The project `projects/schemer` is a wrapper around the Schemer component.

## Publishing the Verona schemer

The steps to publish a new release of the schemer:

- edit `projects/schemer/src/html_wrapper/index.html`:
  - increase the version
  - check/update the description
- update the version in the repo root `package.json`:
  - path `config.schemer_version`
- build:
  - use the script `build_sc`
- pack:
  - use the script `pack_sc`
  - output: `dist/iqb-schemer@<version>.html`
- commit, push and create a GitHub release
  - attach the built HTML file as a release asset

