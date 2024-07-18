[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE.md)

This repo provides components for coding responses from assessments done by iqb web applications. The major data specifications can be [found here](https://github.com/iqb-berlin/responses#readme).

# ngx-coding-components

[![npm](https://img.shields.io/npm/v/%40iqb%2Fngx-coding-components)](https://www.npmjs.com/package/@iqb/ngx-coding-components)

Library with angular components for coding.

## Components
* schemer: This component lists all variables (base and derived) and offers editing of coding scheme.
* scheme-checker: simple input form for responses to be processed using the current coding scheme
* schemer-toolbar: Small menu to load and save variable list and coding scheme. Use this component during the development stage

## Testing

During development, use the application in the folder `/src`. The script `start` in `package.json` might help to start. If you did changes in the component library, first start the script `build_cc` in `package.json` to build into the `dist` folder first.

## Publishing

The steps to publish a new release of the library:
* Update the version in `projects/ngx-coding-components/package.json` 
* Update README.md in `projects/ngx-coding-components` to let people know about the changes 
* Build: Use the script `build_cc` in `package.json`
* Publish: Use the script `npm_publish` in `package.json`

# Verona Schemer

![GitHub tag (latest SemVer)](https://img.shields.io/github/v/tag/iqb-berlin/coding-components)

The component `schemer` of this repo is published as a [Verona](https://verona-interfaces.github.io) module. This way, you can load it in any application supporting the specification. See the [release section](https://github.com/iqb-berlin/coding-components/releases/latest) of this repo to get it. See 

The project `schemer` of this repo is a simple wrapper around the component. 

## Publishing

The steps to publish a new release of the schemer:
* edit `projects/schemer/src/html_wrapper/index.html`: Increase the version, check the description
* update the version in `package.json` in the repo root: Path `config.schemer_version`
* Build: Use the script `build_sc` in `package.json`
* Pack: Use the script `pack_sc` in `package.json`; you find the new schemer in the folder `dist`, filename `iqb-schemer@<version>.html`
* Commit, push and create a new release; add the schemer file to the release as asset 

 
 
