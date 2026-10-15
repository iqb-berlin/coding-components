import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  NumberFormat,
  HorizontalPositionAlign,
  HorizontalPositionRelativeFrom,
  VerticalPositionRelativeFrom,
  TextWrappingType,
  TextWrappingSide,
  TabStopType,
  Tab,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  Footer,
  WidthType,
  PageNumber,
  ITableCellBorders,
  ImportedXmlComponent,
  ParagraphChild,
  IRunOptions
} from 'docx';

import {
  CodeBookContentSetting,
  CodebookUnitDto,
  BookVariable,
  ItemMetadata
} from '@iqb/ngx-coding-components/codebook-models';
import * as cheerio from 'cheerio';
import { Buffer } from 'buffer';
import type { Element, AnyNode } from 'domhandler';
import { BasicAcceptedElems } from 'cheerio';

import { imageSize } from 'image-size';

// katex is CommonJS with no statically detectable named exports: under ESM `import * as katex`
// yields only `{ default }`, and every `katex.x` is undefined. The default import works in both.
import katex from 'katex';
import { mml2omml } from 'mathml2omml';
import { WebColors } from './web-colors';
// Type-only, like every deep import into a package: were it ever emitted as a runtime require,
// an `exports` map in that package would kill the boot -- see the swagger import in
// setting.controller.ts.
type FileChild = Paragraph | Table;
type InstructionParagraph = {
  element: Element;
  marker?: string;
  listDepth?: number;
  listIndent?: number;
  quoteDepth?: number;
  imageWidth?: number;
};

export class CodebookDocxGenerator {
  private static ommlCache: Record<string, string> = {};

  static async generateDocx(
    codingBookUnits: CodebookUnitDto[],
    contentSetting: CodeBookContentSetting
  ): Promise<Blob> {
    const units: FileChild[] = [];
    const missingDefinitions = new Map<string, CodebookUnitDto['missings'][number]>();
    codingBookUnits.forEach(unit => {
      unit.missings.forEach(missing => missingDefinitions.set(JSON.stringify(missing), missing));
      if (unit.variables.length) {
        units.push(...this.createDocXForUnit(unit.items || [], unit.variables, contentSetting, this.getUnitHeader(unit)));
      }
    });
    const missings = this.getMissings({
      key: '', name: '', variables: [], missings: [...missingDefinitions.values()]
    });
    return Packer.toBlob(this.setDocXDocument(units, missings));
  }

  private static getUnitHeader(variableCoding: CodebookUnitDto): Paragraph {
    return new Paragraph({
      border: {
        bottom: {
          color: '#000000',
          style: 'single',
          size: 10
        },
        top: {
          color: '#000000',
          style: 'single',
          size: 10
        }
      },
      spacing: {
        after: 200
      },
      text: `${variableCoding.key}  ${variableCoding.name}`,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER
    });
  }

  private static getMissings(variableCoding: CodebookUnitDto): Paragraph[] {
    const missings: Paragraph[] = [];
    try {
      variableCoding.missings.forEach(missing => {
        if (missing.code !== undefined && missing.code !== null && `${missing.code}` !== '' && missing.label && missing.description) {
          missings.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${missing.code} ${missing.label}`,
                  bold: true
                })
              ],
              spacing: {
                after: 20
              }
            })
          );
          missings.push(
            new Paragraph({
              text: `${missing.description}`,
              spacing: {
                after: 100
              }
            })
          );
        } else {
          missings.push(
            new Paragraph({
              text: 'kein valides Missing ',
              spacing: {
                after: 200
              }
            })
          );
        }
      });
    } catch {
      missings.push(
        new Paragraph({
          text: 'kein validen Missings gefunden',
          spacing: {
            after: 200
          }
        })
      );
    }
    return missings;
  }

  private static get TableBoarders(): ITableCellBorders {
    return {
      top: {
        size: 1,
        color: '#000000',
        style: 'single'
      },
      bottom: {
        size: 1,
        color: '#000000',
        style: 'single'
      },
      left: {
        size: 1,
        color: '#000000',
        style: 'single'
      },
      right: {
        size: 1,
        color: '#000000',
        style: 'single'
      }
    };
  }

  private static getCodeRows(
    variable: BookVariable,
    contentSetting: CodeBookContentSetting
  ): TableRow[] {
    return variable.codes.map(
      code => new TableRow({
        cantSplit: true,
        children: [
          CodebookDocxGenerator.createCodeCell(
            CodebookDocxGenerator.createCellChildren(code.id),
            CodebookDocxGenerator.getColumnWidths(contentSetting)[0]
          ),
          CodebookDocxGenerator.createCodeCell(
            CodebookDocxGenerator.createCellChildren(code.label),
            CodebookDocxGenerator.getColumnWidths(contentSetting)[1]
          ),
          ...(contentSetting.showScore ?
            [
              CodebookDocxGenerator.createCodeCell(
                CodebookDocxGenerator.createCellChildren(code.score ?? ''),
                CodebookDocxGenerator.getColumnWidths(contentSetting)[2]
              )
            ] :
            []),
          CodebookDocxGenerator.createCodeCell(
            [...CodebookDocxGenerator.htmlToDocx(code.description, contentSetting)],
            CodebookDocxGenerator.getColumnWidths(contentSetting)[
              CodebookDocxGenerator.getColumnWidths(contentSetting).length - 1
            ]
          )
        ]
      })
    );
  }

  private static createCellChildren(value: string): Paragraph[] {
    return [
      new Paragraph({
        text: value,
        spacing: {
          before: 100,
          after: 100
        },
        indent: { start: 100, end: 100 }
      })
    ];
  }

  private static createCodeCell(
    children: Paragraph[],
    width: number
  ): TableCell {
    return new TableCell({
      borders: CodebookDocxGenerator.TableBoarders,
      children: children,
      // Need for Word, but not for Writer
      width: {
        size: width,
        type: WidthType.PERCENTAGE
      }
    });
  }

  private static setDocXDocument(
    units: FileChild[],
    missings: Paragraph[]
  ): Document {
    return new Document({
      background: {
        color: '#FFFFFF'
      },
      sections: [
        {
          properties: {
            page: {
              pageNumbers: {
                start: 1,
                formatType: NumberFormat.DECIMAL
              }
            }
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun('IQB Codebook '),
                    new TextRun(new Date().toLocaleDateString())
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      color: '000000',
                      children: [' Seite ', PageNumber.CURRENT]
                    }),
                    new TextRun({
                      color: '000000',
                      children: [' von ', PageNumber.TOTAL_PAGES]
                    })
                  ]
                })
              ]
            })
          },
          children: [...missings, ...units]
        }
      ]
    });
  }

  private static getVariableHeader(variable: BookVariable): Paragraph {
    return new Paragraph({
      text: `${variable.id}  ${variable.label}`,
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.LEFT,
      spacing: {
        before: 200,
        after: 200
      }
    });
  }

  private static getVariableItems(
    variable: BookVariable,
    varItems: ItemMetadata[]
  ): Paragraph[] {
    const filteredVarItems = varItems.filter(
      item => item.variableId === variable.id
    );
    let itemString = '';
    filteredVarItems.forEach(item => {
      itemString += `${item.id}   `;
    });
    if (filteredVarItems.length === 0) {
      return [];
    }

    return [new Paragraph({
      text: `Item(s): ${itemString}`,
      heading: HeadingLevel.HEADING_3,
      alignment: AlignmentType.LEFT,
      spacing: {
        before: 200,
        after: 200
      }
    })];
  }

  private static getGeneralInstructions(
    contentSetting: CodeBookContentSetting,
    codeBookVariable: BookVariable
  ): Paragraph[] {
    return contentSetting.hasGeneralInstructions ?
      CodebookDocxGenerator.htmlToDocx(
        codeBookVariable.generalInstruction,
        contentSetting
      ) :
      [];
  }

  private static getCodeTable(
    codeBookVariable: BookVariable,
    contentSetting: CodeBookContentSetting
  ): Table {
    return new Table({
      rows: CodebookDocxGenerator.getCodeRows(codeBookVariable, contentSetting),
      width: {
        size: 100,
        type: WidthType.PERCENTAGE
      },
      columnWidths: CodebookDocxGenerator.getColumnWidths(contentSetting) // Need for Writer, but not for Word
    });
  }

  private static getColumnWidths(
    contentSetting: CodeBookContentSetting
  ): number[] {
    return contentSetting.showScore ? [8, 24, 8, 60] : [8, 24, 68];
  }

  private static getVariables(
    codeBookVariable: BookVariable[],
    contentSetting: CodeBookContentSetting,
    varItems: ItemMetadata[]
  ): FileChild[] {
    const variables: FileChild[] = [];
    codeBookVariable.forEach(variable => {
      variables.push(
        ...[
          CodebookDocxGenerator.getVariableHeader(variable),
          ...(contentSetting.hideItemVarRelation ? [] : CodebookDocxGenerator.getVariableItems(variable, varItems)),
          ...CodebookDocxGenerator.getGeneralInstructions(contentSetting, variable),
          CodebookDocxGenerator.getCodeTable(variable, contentSetting)
        ]
      );
    });
    return variables;
  }

  private static createDocXForUnit(
    varItems: ItemMetadata[],
    codeBookVariable: BookVariable[],
    contentSetting: CodeBookContentSetting,
    unitHeader: Paragraph
  ): FileChild[] {
    return [
      unitHeader,
      ...CodebookDocxGenerator.getVariables(codeBookVariable, contentSetting, varItems),
      new Paragraph({
        text: '',
        spacing: {
          before: 100,
          after: 100
        }
      })
    ];
  }

  private static getChildren(
    cheerioAPI: cheerio.CheerioAPI,
    elem: BasicAcceptedElems<AnyNode>
  ): AnyNode[] {
    return cheerioAPI(elem).toArray();
  }

  private static processInlineElements(
    nodes: AnyNode[],
    children: ParagraphChild[],
    colorParsed: string,
    backgroundColor: string,
    size: string,
    formatting: Pick<IRunOptions, 'bold' | 'italics' | 'underline' | 'strike' | 'subScript' | 'superScript'> = {},
    imageWidth = 334
  ): void {
    const runStyle = {
      ...formatting,
      color: colorParsed,
      shading: { fill: backgroundColor },
      size: CodebookDocxGenerator.getFontSize(size)
    };
    nodes.forEach(node => {
      if (node.type === 'text') {
        // Preserve non-breaking spaces and repeated spacing from Studio instructions.
        node.data.split('\n').forEach((line, index) => {
          if (index) children.push(new TextRun({ break: 1, ...runStyle }));
          if (line) children.push(new TextRun({ text: line, ...runStyle }));
        });
        return;
      }
      if (node.type !== 'tag') return;
      const element = node as Element;
      const tagName = element.name.toLowerCase();
      const styles = CodebookDocxGenerator.inlineStyles(element);
      const nestedColor = CodebookDocxGenerator.cssColor(styles['color'], colorParsed);
      const nestedBackground = CodebookDocxGenerator.cssColor(styles['background-color'], backgroundColor);
      const nestedSize = styles['font-size'] || size;
      if ((tagName === 'span' && element.attribs?.['class']?.split(/\s+/).includes('iqb-math-formula')) ||
          tagName === 'aspect-nodeview-math-formula') {
        const storedLatex = element.attribs?.['data-latex'] || element.attribs?.['formula'] || '';
        const latex = CodebookDocxGenerator.decodeLatex(storedLatex).trim();
        if (latex) {
          const mathStyle: IRunOptions = {
            ...formatting,
            size: CodebookDocxGenerator.getFontSize(nestedSize),
            color: nestedColor,
            shading: { fill: nestedBackground }
          };
          children.push(
            CodebookDocxGenerator.latexToOmml(latex, mathStyle) || new TextRun({ text: latex, ...mathStyle })
          );
        }
        return;
      }
      if (tagName === 'img') {
        try {
          const fontPixels = (CodebookDocxGenerator.getFontSize(size) * 2) / 3;
          children.push(CodebookDocxGenerator.createImageRun(element, imageWidth, fontPixels));
        } catch {
          // An invalid image must not discard the surrounding instruction paragraph.
          children.push(new TextRun({ text: 'HTML konnte nicht verarbeitet werden.', ...runStyle }));
        }
        return;
      }
      if (tagName === 'br') {
        children.push(new TextRun({ break: 1, ...runStyle }));
        return;
      }
      const nestedFormatting = { ...formatting };
      if (tagName === 'strong' || tagName === 'b') nestedFormatting.bold = true;
      if (tagName === 'em' || tagName === 'i') nestedFormatting.italics = true;
      if (tagName === 'u') nestedFormatting.underline = {};
      if (tagName === 's' || tagName === 'strike') nestedFormatting.strike = true;
      if (tagName === 'sub') { nestedFormatting.subScript = true; nestedFormatting.superScript = false; }
      if (tagName === 'sup') { nestedFormatting.superScript = true; nestedFormatting.subScript = false; }
      CodebookDocxGenerator.processInlineElements(
        element.children, children, nestedColor, nestedBackground, nestedSize, nestedFormatting, imageWidth
      );
    });
  }

  private static getImageSize(imageBuffer: Buffer): { width: number; height: number } {
    const size = imageSize(imageBuffer as unknown as Uint8Array);
    if (!size.width || !size.height) throw new Error('Ungültige Bildgröße');
    return { width: size.width, height: size.height };
  }

  private static getTransformation(
    actualSize: { width: number; height: number },
    max: number
  ): { width: number; height: number } {
    const transformedSize: { width: number; height: number } = {
      width: actualSize.width,
      height: actualSize.height
    };
    const maxWidth = max;
    const maxHeight = max;
    if (actualSize.width > maxWidth || actualSize.height > maxHeight) {
      const ratio = Math.min(
        maxWidth / actualSize.width,
        maxHeight / actualSize.height
      );
      transformedSize.width = actualSize.width * ratio;
      transformedSize.height = actualSize.height * ratio;
    }
    return transformedSize;
  }

  private static createImagePragraph(
    elem: Element,
    contentSetting: CodeBookContentSetting
  ): Paragraph {
    return new Paragraph({
      spacing: {
        before: 100,
        after: 100
      },
      indent: {
        start: 100,
        end: 100
      },
      children: [
        CodebookDocxGenerator.createImageRun(elem, contentSetting.showScore ? 334 : 382)
      ]
    });
  }

  private static createImageRun(elem: Element, maxWidth: number, fontPixels = 20): ImageRun {
    const source = elem.attribs['src'] || '';
    const imageBuffer = Buffer.from(source.substring(source.indexOf(',') + 1), 'base64');
    const actual = CodebookDocxGenerator.getImageSize(imageBuffer);
    const styles = CodebookDocxGenerator.inlineStyles(elem);
    let height = actual.height;
    if (styles['height'] === '1em') height = fontPixels;
    else if (/^\d+(\.\d+)?px$/.test(styles['height'] || '')) height = parseFloat(styles['height']);
    const width = /^\d+(\.\d+)?px$/.test(styles['width'] || '') ?
      parseFloat(styles['width']) : (actual.width * height) / actual.height;
    const side = styles['float'];
    return new ImageRun({
      data: imageBuffer,
      transformation: CodebookDocxGenerator.getTransformation({ width, height }, maxWidth),
      ...(side === 'left' || side === 'right' ? {
        floating: {
          horizontalPosition: {
            relative: HorizontalPositionRelativeFrom.COLUMN,
            align: side === 'left' ? HorizontalPositionAlign.LEFT : HorizontalPositionAlign.RIGHT
          },
          verticalPosition: { relative: VerticalPositionRelativeFrom.PARAGRAPH, offset: 0 },
          layoutInCell: true,
          allowOverlap: false,
          wrap: {
            type: TextWrappingType.SQUARE,
            side: side === 'left' ? TextWrappingSide.RIGHT : TextWrappingSide.LEFT,
            margins: { [side === 'left' ? 'right' : 'left']: 9525 * 10 }
          }
        }
      } : {})
    });
  }

  private static inlineStyles(elem: Element): Record<string, string> {
    return Object.fromEntries((elem.attribs['style'] || '').split(';').flatMap(declaration => {
      const colon = declaration.indexOf(':');
      if (colon < 0) return [];
      const property = declaration.substring(0, colon).trim().toLowerCase();
      const value = declaration.substring(colon + 1).trim();
      return [[property, value]];
    }));
  }

  private static cssColor(value: string | undefined, fallback: string): string {
    if (!value || value === 'inherit' || value === 'initial' || value === 'currentColor') return fallback;
    if (/^#[0-9a-f]{6}$/i.test(value)) return value.substring(1).toUpperCase();
    if (/^#[0-9a-f]{3}$/i.test(value)) {
      return value.substring(1).split('').map(part => part + part).join('')
        .toUpperCase();
    }
    if (value.startsWith('rgb')) {
      const rgb = CodebookDocxGenerator.parseCssRgbString(value);
      if (rgb?.length === 3 && rgb.every(component => Number.isFinite(component))) {
        return CodebookDocxGenerator.toHex(rgb[0], rgb[1], rgb[2]).toUpperCase();
      }
    }
    return WebColors.getHexFromWebColor(value.toLowerCase())?.replace(/^#/, '').toUpperCase() || fallback;
  }

  private static getTextAlignment(
    cheerioAPI: cheerio.CheerioAPI,
    elem: Element
  ): string {
    return cheerioAPI(elem).css('text-align') || 'left';
  }

  private static stripFromLeadingEmptyParagraph(html: string): string {
    return html.replace(/^<p><\/p>/, '');
  }

  private static prepareHtml(html: string): string {
    // Newlines in LaTeX/HTML attributes are data, not paragraph breaks.
    return CodebookDocxGenerator.stripFromLeadingEmptyParagraph(html);
  }

  private static decodeLatex(latex: string): string {
    if (!latex) return '';
    try {
      return decodeURIComponent(latex);
    } catch {
      return latex;
    }
  }

  private static latexToOmml(latex: string, style?: IRunOptions): ImportedXmlComponent | null {
    const trimmed = latex.trim();
    if (!trimmed) return null;
    try {
      if (!CodebookDocxGenerator.ommlCache[trimmed]) {
        const mathml = katex.renderToString(trimmed, {
          output: 'mathml',
          throwOnError: false,
          strict: 'ignore'
        });
        CodebookDocxGenerator.ommlCache[trimmed] = CodebookDocxGenerator.normalizeStretchyBars(
          mathml, mml2omml(mathml)
        );
      }
      const omml = CodebookDocxGenerator.styleMathRuns(CodebookDocxGenerator.ommlCache[trimmed], style);
      return CodebookDocxGenerator.unwrapImportedXmlRoot(
        ImportedXmlComponent.fromXmlString(
          CodebookDocxGenerator.sanitizeOmmlXml(omml)
        )
      );
    } catch {
      return null;
    }
  }

  /** The converter treats wide over/underlines as fixed-width accents and loses their position. */
  private static normalizeStretchyBars(mathml: string, omml: string): string {
    const math = cheerio.load(mathml, { xml: true }, false);
    const positions: Array<'top' | 'bot' | undefined> = [];
    math('mover,munder').each((_, node) => {
      const operator = math(node).children().last();
      if (operator[0]?.name === 'mo' && operator.text() === '\u203e') {
        let position: 'top' | 'bot' | undefined;
        if (operator.attr('stretchy') !== 'false') position = node.name === 'munder' ? 'bot' : 'top';
        positions.push(position);
      }
    });
    if (!positions.some(position => position)) return omml;
    const $ = cheerio.load(omml, { xml: true }, false);
    let index = 0;
    $('m\\:acc').each((_, node) => {
      const accent = $(node);
      if (accent.children('m\\:accPr').children('m\\:chr').attr('m:val') !== '\u203e') return;
      const position = positions[index];
      index += 1;
      if (!position) return;
      const bar = $('<m:bar/>');
      const properties = $('<m:barPr/>').append(`<m:pos m:val="${position}"/>`);
      properties.append(accent.children('m\\:accPr').children('m\\:ctrlPr'));
      bar.append(properties).append(accent.children('m\\:e'));
      accent.replaceWith(bar);
    });
    return $.xml();
  }

  /** Apply surrounding editor marks without changing cached LaTeX or unstyled Studio math. */
  private static styleMathRuns(omml: string, style?: IRunOptions): string {
    if (!style) return omml;
    const properties: Record<string, Record<string, string>> = {};
    if (style.bold) properties['b'] = {};
    if (style.italics) properties['i'] = {};
    if (style.underline) properties['u'] = { 'w:val': 'single' };
    if (style.strike) properties['strike'] = {};
    if (style.size !== 20) {
      properties['sz'] = { 'w:val': String(style.size) };
      properties['szCs'] = { 'w:val': String(style.size) };
    }
    if (style.color && !['#000000', '000000'].includes(style.color)) {
      properties['color'] = { 'w:val': style.color.replace(/^#/, '') };
    }
    const fill = style.shading?.fill;
    if (fill && !['#FFFFFF', 'FFFFFF'].includes(fill)) properties['shd'] = { 'w:fill': fill.replace(/^#/, '') };
    if (!Object.keys(properties).length) return omml;
    const $ = cheerio.load(omml, { xml: true }, false);
    const applyProperties = (parent: cheerio.Cheerio<Element>): void => {
      let runProperties = parent.children('w\\:rPr').first();
      if (!runProperties.length) {
        parent.append('<w:rPr/>');
        runProperties = parent.children('w\\:rPr').first();
      }
      Object.entries(properties).forEach(([name, attributes]) => {
        runProperties.children(`w\\:${name}`).remove();
        runProperties.append(`<w:${name}/>`);
        runProperties.children(`w\\:${name}`).last().attr(attributes);
      });
      const order = ['b', 'bCs', 'i', 'iCs', 'strike', 'color', 'sz', 'szCs', 'u', 'shd'];
      const children = runProperties.children().toArray().sort((a, b) => (
        order.indexOf(a.name.substring(2)) - order.indexOf(b.name.substring(2))
      ));
      runProperties.empty().append(children);
    };
    $('m\\:r').each((_, run) => {
      const element = $(run);
      applyProperties(element);
      element.prepend(element.children('w\\:rPr').remove());
      const mathProperties = element.children('m\\:rPr').remove();
      if (mathProperties.length) element.prepend(mathProperties);
    });
    // Math control properties also style fraction bars, radicals and large operators.
    ['acc', 'bar', 'borderBox', 'box', 'd', 'eqArr', 'f', 'func', 'groupChr',
      'limLow', 'limUpp', 'm', 'nary', 'phant', 'rad', 'sPre', 'sSub', 'sSubSup', 'sSup'].forEach(name => {
      $(`m\\:${name}`).each((_, node) => {
        const element = $(node);
        let structureProperties = element.children(`m\\:${name}Pr`).first();
        if (!structureProperties.length) {
          element.prepend(`<m:${name}Pr/>`);
          structureProperties = element.children(`m\\:${name}Pr`).first();
        }
        let control = structureProperties.children('m\\:ctrlPr').first();
        if (!control.length) {
          structureProperties.append('<m:ctrlPr/>');
          control = structureProperties.children('m\\:ctrlPr').first();
        }
        applyProperties(control);
      });
    });
    return $.xml();
  }

  private static unwrapImportedXmlRoot(
    component: ImportedXmlComponent
  ): ImportedXmlComponent {
    const importedComponent = component as ImportedXmlComponent & {
      root?: Array<ImportedXmlComponent | string>;
      rootKey?: string;
    };
    if (importedComponent.rootKey !== undefined) {
      return component;
    }

    const firstChild = importedComponent.root?.[0];
    return typeof firstChild === 'object' && firstChild !== null ?
      firstChild as ImportedXmlComponent :
      component;
  }

  private static isMathComponent(
    child: ParagraphChild
  ): child is ImportedXmlComponent {
    if (typeof child !== 'object' || child === null) {
      return false;
    }
    const importedChild = child as ImportedXmlComponent & {
      rootKey?: string;
    };
    return importedChild.rootKey === 'm:oMath' ||
      importedChild.rootKey === 'm:oMathPara';
  }

  private static createLeftAlignedMathParagraph(
    mathChildren: ImportedXmlComponent[],
    alignment = 'left'
  ): ImportedXmlComponent {
    const mathParagraph = new ImportedXmlComponent('m:oMathPara');
    const mathParagraphProperties = new ImportedXmlComponent('m:oMathParaPr');
    mathParagraphProperties.push(
      new ImportedXmlComponent('m:jc', { 'm:val': ['center', 'right'].includes(alignment) ? alignment : 'left' })
    );
    mathParagraph.push(mathParagraphProperties);
    mathChildren.forEach(mathChild => mathParagraph.push(mathChild));
    return mathParagraph;
  }

  private static normalizeParagraphChildren(
    children: ParagraphChild[],
    alignment = 'left'
  ): ParagraphChild[] {
    if (!children.length) {
      return children;
    }

    const mathChildren = children.filter(
      CodebookDocxGenerator.isMathComponent
    ) as ImportedXmlComponent[];
    if (mathChildren.length === children.length) {
      return [CodebookDocxGenerator.createLeftAlignedMathParagraph(mathChildren, alignment)];
    }

    return children;
  }

  private static sanitizeOmmlXml(omml: string): string {
    if (!omml) return omml;
    return omml.replace(
      /(<m:t\b[^>]*>)([\s\S]*?)(<\/m:t>)/g,
      (_, prefix: string, rawText: string, suffix: string) => `${prefix}${CodebookDocxGenerator.escapeXmlText(rawText)}${suffix}`
    );
  }

  private static escapeXmlText(text: string): string {
    return text
      .replace(
        /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g,
        '&amp;'
      )
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private static normalizeMathTokens(html: string): string {
    return html.replace(
      /\[\[iqb-math:([\s\S]*?)]]/g,
      (_, encodedFormula: string) => {
        const latex = this.decodeLatex(encodedFormula);
        const escapedLatex = latex.replace(/"/g, '&quot;');
        return `<span class="iqb-math-formula" data-latex="${escapedLatex}"></span>`;
      }
    );
  }

  /** Put loose text and inline marks into paragraphs without duplicating existing blocks. */
  private static wrapInlineParagraphs(cheerioAPI: cheerio.CheerioAPI, parent: AnyNode): void {
    let inlineNodes: AnyNode[] = [];
    const flush = () => {
      if (inlineNodes.some(node => node.type === 'tag' || (node.type === 'text' && node.data.trim()))) {
        cheerioAPI(inlineNodes).wrapAll('<p></p>');
      }
      inlineNodes = [];
    };
    cheerioAPI(parent).contents().toArray().forEach(node => {
      if (node.type === 'tag' && (
        /^(p|h[1-4]|img|hr|ul|ol|li|div|blockquote)$/.test(node.name) ||
        cheerioAPI(node).find('p,h1,h2,h3,h4,img,hr,ul,ol').length > 0
      )) {
        flush();
        if (!/^(p|h[1-4]|img|hr)$/.test(node.name)) {
          CodebookDocxGenerator.wrapInlineParagraphs(cheerioAPI, node);
        }
      } else if (node.type === 'text' || node.type === 'tag') {
        inlineNodes.push(node);
      }
    });
    flush();
  }

  private static htmlToDocx(
    html: string,
    contentSetting: CodeBookContentSetting
  ) {
    if (!html.trim()) return [];
    const normalizedHtml = CodebookDocxGenerator.normalizeMathTokens(html);
    const blockHtml = /<(p|h[1-4]|img|hr|ul|ol)\b/i.test(normalizedHtml) ? normalizedHtml : `<p>${normalizedHtml}</p>`;
    const cheerioAPI = cheerio.load(
      CodebookDocxGenerator.prepareHtml(blockHtml),
      null,
      false
    );
    CodebookDocxGenerator.wrapInlineParagraphs(cheerioAPI, cheerioAPI.root()[0]);
    const elements: Paragraph[] = [];
    type Context = {
      listDepth: number; listNesting: number; listIndent: number; quoteDepth: number; marker?: string;
      legacyBullet?: boolean; size: string; color: string; background: string;
    };
    const walk = (parent: AnyNode, context: Context): void => {
      cheerioAPI(parent).contents().toArray().forEach(node => {
        if (node.type !== 'tag') return;
        const elem = node as Element;
        const styles = CodebookDocxGenerator.inlineStyles(elem);
        const size = styles['font-size'] || context.size;
        const color = CodebookDocxGenerator.cssColor(styles['color'], context.color);
        const background = CodebookDocxGenerator.cssColor(styles['background-color'], context.background);
        const inherited = {
          ...context, size, color, background
        };
        try {
          if (elem.name === 'img') {
            elements.push(CodebookDocxGenerator.createImagePragraph(elem, contentSetting));
          } else if (/^(p|h[1-4])$/.test(elem.name)) {
            const headingSize = {
              h1: '20px', h2: '18px', h3: '16px', h4: '16px'
            }[elem.name];
            elements.push(CodebookDocxGenerator.createParagraph(
              cheerioAPI,
              elem.children,
              CodebookDocxGenerator.getTextAlignment(cheerioAPI, elem),
              color,
              background,
              styles['font-size'] || headingSize || size,
              !!context.legacyBullet,
              {
                element: elem,
                marker: context.marker,
                listDepth: context.listDepth,
                listIndent: context.listIndent,
                quoteDepth: context.quoteDepth,
                imageWidth: contentSetting.showScore ? 334 : 382
              }
            ));
            context.marker = undefined;
            context.legacyBullet = false;
          } else if (elem.name === 'ul' || elem.name === 'ol') {
            const style = styles['list-style-type'] || styles['list-style'] || (elem.name === 'ol' ? 'decimal' : 'disc');
            const legacy = elem.name === 'ul' && !styles['list-style-type'] &&
              !styles['list-style'] && context.listNesting === 0;
            const parsedStart = Number.parseInt(elem.attribs['start'], 10);
            const start = Number.isFinite(parsedStart) ? parsedStart : 1;
            cheerioAPI(elem).children('li').toArray().forEach((li, index) => {
              const padding = parseFloat(CodebookDocxGenerator.inlineStyles(li)['padding-left']) || 0;
              walk(li, {
                ...inherited,
                marker: legacy ? undefined : CodebookDocxGenerator.listMarker(style, start + index),
                legacyBullet: legacy,
                listDepth: legacy ? 0 : context.listNesting + 1,
                listNesting: context.listNesting + 1,
                listIndent: context.listIndent + Math.round(padding * 15)
              });
            });
          } else if (elem.name === 'hr') {
            const short = styles['width'] === '20%' || elem.attribs['short'] === 'true';
            elements.push(new Paragraph({
              border: { bottom: { color: '000000', style: 'single', size: 6 } },
              indent: short ? { end: Math.round((contentSetting.showScore ? 334 : 382) * 15 * 0.8) } : undefined,
              spacing: { before: 100, after: 100 }
            }));
          } else {
            walk(elem, { ...inherited, quoteDepth: context.quoteDepth + Number(elem.name === 'blockquote') });
          }
        } catch {
          elements.push(new Paragraph({ text: 'HTML konnte nicht verarbeitet werden.' }));
        }
      });
    };
    walk(cheerioAPI.root()[0], {
      listDepth: 0,
      listNesting: 0,
      listIndent: 0,
      quoteDepth: 0,
      size: '10pt',
      color: '#000000',
      background: '#FFFFFF'
    });
    return elements.filter(e => e !== undefined && e !== null);
  }

  /** Literal markers retain all CSS list styles, including Greek, in a static Word export. */
  private static listMarker(style: string, value: number): string {
    const bullets: Record<string, string> = { disc: '•', circle: '○', square: '▪' };
    if (bullets[style]) return bullets[style];
    if (style.includes('roman')) {
      let remainder = Math.min(10000, Math.max(1, Math.floor(value)));
      let roman = '';
      const numbers: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
        [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
      numbers.forEach(([number, symbol]) => {
        while (remainder >= number) {
          roman += symbol;
          remainder -= number;
        }
      });
      return `${style.startsWith('lower') ? roman.toLowerCase() : roman}.`;
    }
    if (['lower-latin', 'upper-latin', 'lower-alpha', 'upper-alpha', 'lower-greek'].includes(style)) {
      const alphabet = style === 'lower-greek' ? 'αβγδεζηθικλμνξοπρστυφχψω' : 'abcdefghijklmnopqrstuvwxyz';
      let number = Math.max(1, Math.floor(value));
      let marker = '';
      while (number > 0) {
        number -= 1;
        marker = alphabet[number % alphabet.length] + marker;
        number = Math.floor(number / alphabet.length);
      }
      return `${style.startsWith('upper') ? marker.toUpperCase() : marker}.`;
    }
    return `${value}.`;
  }

  private static getFontSize(size: string): number {
    const sizeTypes = [
      'xx-small',
      'x-small',
      'small',
      'medium',
      'large',
      'x-large',
      'xx-large'
    ];
    if (sizeTypes.includes(size)) return 20;
    const number = parseFloat(size);
    if (!Number.isFinite(number) || number <= 0) return 20;
    // CSS pixels are 1/96 inch; Word stores font sizes in half-points (1/144 inch).
    return Math.max(1, Math.min(1638, Math.round(number * (size.endsWith('px') ? 1.5 : 2))));
  }

  private static getAlignment(
    textAlignment: string
  ): typeof AlignmentType[keyof typeof AlignmentType] {
    switch (textAlignment) {
      case 'center':
        return AlignmentType.CENTER;
      case 'right':
        return AlignmentType.RIGHT;
      case 'justify':
        return AlignmentType.JUSTIFIED;
      default:
        return AlignmentType.LEFT;
    }
  }

  private static createParagraph(
    cheerioAPI: cheerio.CheerioAPI,
    elem: BasicAcceptedElems<AnyNode>,
    textAlignment: string,
    colorParsed: string,
    backgroundColor: string,
    size: string,
    isListParagraph: boolean,
    options?: InstructionParagraph
  ): Paragraph {
    const children: ParagraphChild[] = [];
    if (options?.marker) {
      children.push(new TextRun({
        children: [options.marker, new Tab()], size: CodebookDocxGenerator.getFontSize(size)
      }));
    }
    const childNodes = CodebookDocxGenerator.getChildren(cheerioAPI, elem);
    CodebookDocxGenerator.processInlineElements(
      childNodes,
      children,
      colorParsed,
      backgroundColor,
      size,
      options?.element.name.match(/^h[1-3]$/) ? { bold: true } : {},
      options?.imageWidth
    );
    const normalizedChildren = CodebookDocxGenerator.normalizeParagraphChildren(
      children,
      textAlignment
    );
    const styles = options ? CodebookDocxGenerator.inlineStyles(options.element) : {};
    const pixels = (value: string | undefined) => {
      const amount = parseFloat(value || '');
      return Number.isFinite(amount) ? Math.round(amount * (value?.endsWith('pt') ? 20 : 15)) : undefined;
    };
    const listStart = (options?.listDepth || 0) * 600 + (options?.listIndent || 0);
    const start = (pixels(styles['padding-left']) ?? (isListParagraph ? 0 : 100)) + listStart + (options?.quoteDepth || 0) * 600;
    const textIndent = pixels(styles['text-indent']) || 0;
    const indent = options?.marker ? { start, hanging: 300 } : {
      start,
      end: 100,
      ...(textIndent < 0 ? { hanging: -textIndent } : {}),
      ...(textIndent > 0 ? { firstLine: textIndent } : {})
    };
    return new Paragraph({
      alignment: CodebookDocxGenerator.getAlignment(textAlignment),
      spacing: {
        before: pixels(styles['margin-top']) ?? 100,
        after: pixels(styles['margin-bottom']) ?? 100
      },
      indent: isListParagraph ? undefined : indent,
      bullet: isListParagraph ? { level: 0 } : undefined,
      ...(options?.marker ? { tabStops: [{ type: TabStopType.LEFT, position: start }] } : {}),
      children: normalizedChildren
    });
  }

  private static parseCssRgbString(input: string) {
    const parts = input
      ?.replace(/rgba?\(([^)]+)\)/, '$1')
      .split(/[,\s/]+/)
      .filter(Boolean);
    if (parts?.length < 3) {
      return;
    }

    const parseValue = (value: string, max: number) => {
      // eslint-disable-next-line no-param-reassign
      value = value.trim();

      if (value.endsWith('%')) {
        return Math.min((Number.parseFloat(value) * max) / 100, max);
      }
      return Math.min(Number.parseFloat(value), max);
    };
    const red = parseValue(parts[0], 255);
    const green = parseValue(parts[1], 255);
    const blue = parseValue(parts[2], 255);

    // eslint-disable-next-line consistent-return
    return [red, green, blue];
  }

  // Convert RGB color to HEX https://github.com/sindresorhus/rgb-hex
  // eslint-disable-next-line no-bitwise
  private static toHex = (red: number, green: number, blue: number) => (blue | (green << 8) | (red << 16) | (1 << 24)).toString(16).slice(1);
}
