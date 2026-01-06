[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE.md)

This repository contains UI components used to **create, validate and test coding schemes** and to **code responses** (as used by IQB assessment applications).

The underlying data specifications are maintained in:

- **Coding scheme spec**: `@iqbspecs/coding-scheme`
- **Response spec**: `@iqbspecs/response`
- **Variable info spec**: `@iqbspecs/variable-info`
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
import { NgxCodingComponentsTranslateLoader } from '@iqb/ngx-coding-components';

// In your app providers:
TranslateModule.forRoot({
  loader: {
    provide: TranslateLoader,
    useClass: NgxCodingComponentsTranslateLoader
  }
})
```

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
| `npm run build:elements` | Build the Web Components bundle. |
| `npm run buildAndPack_sc` | Build and package the Verona Schemer. |

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

The `schemer` UI is also published as a [Verona](https://verona-interfaces.github.io) module.

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
