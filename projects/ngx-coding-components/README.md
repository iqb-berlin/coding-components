# @iqb/ngx-coding-components

Angular components for creating, validating, and testing coding schemes in educational assessments.

This library provides the UI for the **IQB Schemer**, a powerful tool to manage coding variables and rules based on the IQB data specifications.

## Version 5 integration

Version 5 requires Angular 21, Tiptap 3.32 or later within major version 3, and
ngx-tiptap 14.0.1 or later within major version 14. Update all Tiptap peers in the
host together; version 4's Tiptap 2 peers cannot be mixed with this release.

Existing coding schemes and rich-text instructions remain supported. The editor
preserves repeated/non-breaking spaces, legacy formula attributes, embedded images
and the existing 20px default on styled instruction text. The font-size extension
now extends Tiptap's implementation, including its set/unset commands. Loading
content through Angular forms does not emit authored-change events.

Direct callers of editor commands must use Tiptap 3's options object, for example
`setContent(html, { emitUpdate: false })`. The whitespace extension accepts parser
overrides through `parseOptions` on that same object.

## Key Components

- **`<iqb-schemer>`**: The main coding scheme editor.
- **`<scheme-checker>`**: A utility to test schemes against sample responses.
- **`<schemer-standalone-menu>`**: A development helper for loading/saving JSON files.

### Coding results dialog

When opening `ShowCodingResultsComponent` through Angular Material, use the
exported `ShowCodingResultsData` interface. In addition to the coded
`responses` and `varsWithCodes`, pass the complete `variableCodings` used for
coding. The component needs them to resolve aliases and display fragmented or
sorted response values.

## Features

- Real-time validation of coding logic.
- Support for base and derived variables.
- Integrated rich-text editing for manual instructions.
- Standalone component architecture.
- Exportable as Web Components (Angular Elements).


# Dialog boxes

* dialog to show coding scheme
* dialog to show list of responses (before or after coding)
* dialog to show problems of coding scheme (after validation)
* simple message dialog
* simple confirm dialog
* simple input dialog

## Documentation

For full documentation, installation guides, and API examples, please refer to the [main repository README](https://github.com/iqb-berlin/coding-components#readme).

## License

MIT
