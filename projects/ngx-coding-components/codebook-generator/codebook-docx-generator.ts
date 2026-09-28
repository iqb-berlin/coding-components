import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  NumberFormat,
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
  ParagraphChild
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
    size: string
  ): void {
    nodes.forEach(node => {
      if (node.type === 'text') {
        if ('data' in node && node.data && node.data.trim()) {
          children.push(
            new TextRun({
              text: node.data.replace(/\s+/g, ' '),
              color: colorParsed,
              shading: {
                fill: backgroundColor
              },
              size: CodebookDocxGenerator.getFontSize(size)
            })
          );
        }
      } else if (node.type === 'tag') {
        const element = node as Element;
        const tagName = element.name.toLowerCase();

        if (
          tagName === 'span' &&
          element.attribs?.['class']?.includes('iqb-math-formula')
        ) {
          const rawLatex = element.attribs?.['data-latex'] || '';
          const latex = CodebookDocxGenerator.decodeLatex(rawLatex).trim();
          if (latex) {
            const ommlComponent = CodebookDocxGenerator.latexToOmml(latex);
            if (ommlComponent) {
              children.push(ommlComponent);
            } else {
              children.push(
                new TextRun({
                  text: latex,
                  color: colorParsed,
                  shading: {
                    fill: backgroundColor
                  },
                  size: CodebookDocxGenerator.getFontSize(size)
                })
              );
            }
          }
          return;
        }

        if (tagName === 'strong' || tagName === 'b') {
          if (element.children) {
            element.children.forEach(child => {
              if (child.type === 'text' && child.data) {
                children.push(
                  new TextRun({
                    text: child.data.replace(/\s+/g, ' '),
                    bold: true,
                    color: colorParsed,
                    shading: {
                      fill: backgroundColor
                    },
                    size: CodebookDocxGenerator.getFontSize(size)
                  })
                );
              }
            });
          }
        } else if (tagName === 'em' || tagName === 'i') {
          if (element.children) {
            element.children.forEach(child => {
              if (child.type === 'text' && child.data) {
                children.push(
                  new TextRun({
                    text: child.data.replace(/\s+/g, ' '),
                    italics: true,
                    color: colorParsed,
                    shading: {
                      fill: backgroundColor
                    },
                    size: CodebookDocxGenerator.getFontSize(size)
                  })
                );
              }
            });
          }
        } else if (tagName === 'u') {
          if (element.children) {
            element.children.forEach(child => {
              if (child.type === 'text' && child.data) {
                children.push(
                  new TextRun({
                    text: child.data.replace(/\s+/g, ' '),
                    underline: {},
                    color: colorParsed,
                    shading: {
                      fill: backgroundColor
                    },
                    size: CodebookDocxGenerator.getFontSize(size)
                  })
                );
              }
            });
          }
        } else if (tagName === 's') {
          if (element.children) {
            element.children.forEach(child => {
              if (child.type === 'text' && child.data) {
                children.push(
                  new TextRun({
                    text: child.data.replace(/\s+/g, ' '),
                    strike: true,
                    color: colorParsed,
                    shading: {
                      fill: backgroundColor
                    },
                    size: CodebookDocxGenerator.getFontSize(size)
                  })
                );
              }
            });
          }
        } else if (tagName === 'sub') {
          if (element.children) {
            element.children.forEach(child => {
              if (child.type === 'text' && child.data) {
                children.push(
                  new TextRun({
                    text: child.data.replace(/\s+/g, ' '),
                    subScript: true,
                    color: colorParsed,
                    shading: {
                      fill: backgroundColor
                    },
                    size: CodebookDocxGenerator.getFontSize(size)
                  })
                );
              }
            });
          }
        } else if (tagName === 'sup') {
          if (element.children) {
            element.children.forEach(child => {
              if (child.type === 'text' && child.data) {
                children.push(
                  new TextRun({
                    text: child.data.replace(/\s+/g, ' '),
                    superScript: true,
                    color: colorParsed,
                    shading: {
                      fill: backgroundColor
                    },
                    size: CodebookDocxGenerator.getFontSize(size)
                  })
                );
              }
            });
          }
        } else if (tagName === 'br') {
          children.push(
            new TextRun({
              break: 1,
              color: colorParsed,
              shading: {
                fill: backgroundColor
              },
              size: CodebookDocxGenerator.getFontSize(size)
            })
          );
        } else if (element.children && element.children.length > 0) {
          CodebookDocxGenerator.processInlineElements(
            element.children,
            children,
            colorParsed,
            backgroundColor,
            size
          );
        }
      }
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
    const imageBuffer = Buffer.from(
      elem.attribs['src'].substring(elem.attribs['src'].indexOf(',') + 1),
      'base64'
    );
    const size = CodebookDocxGenerator.getImageSize(imageBuffer);
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
        new ImageRun({
          data: imageBuffer,
          transformation: CodebookDocxGenerator.getTransformation(
            size,
            contentSetting.showScore ? 334 : 382
          )
        })
      ]
    });
  }

  private static getBackgroundColor(
    cheerioAPI: cheerio.CheerioAPI,
    elem: Element
  ): string {
    const mark = cheerioAPI(elem).find('mark');
    return cheerioAPI(mark).css('background-color') || '#FFFFFF';
  }

  private static getColor(
    cheerioAPI: cheerio.CheerioAPI,
    tag: cheerio.Cheerio<Element>
  ): string {
    const color = cheerioAPI(tag).css('color');
    // const name = elem.name;
    let colorParsed: string = '#000000';
    if (color) {
      if (color.startsWith('#')) {
        colorParsed = color;
      } else if (color.startsWith('rgb')) {
        const rgbString = CodebookDocxGenerator.parseCssRgbString(color);
        if (rgbString) {
          colorParsed = CodebookDocxGenerator.toHex(
            rgbString[0],
            rgbString[1],
            rgbString[2]
          );
        }
      } else if (WebColors.getHexFromWebColor(color.toLowerCase())) {
        colorParsed = `#${WebColors.getHexFromWebColor(color.toLowerCase())}`;
      }
    }
    return colorParsed;
  }

  private static getSize(
    cheerioAPI: cheerio.CheerioAPI,
    tag: cheerio.Cheerio<Element>
  ): string {
    return cheerioAPI(tag).css('font-size') || '20pt';
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

  private static convertLineBreaksToHTMLBreaks(html: string): string {
    return html.replace(/\n/g, '<br>');
  }

  private static prepareHtml(html: string): string {
    return CodebookDocxGenerator.convertLineBreaksToHTMLBreaks(
      CodebookDocxGenerator.stripFromLeadingEmptyParagraph(html)
    );
  }

  private static decodeLatex(latex: string): string {
    if (!latex) return '';
    try {
      return decodeURIComponent(latex);
    } catch {
      return latex;
    }
  }

  private static latexToOmml(latex: string): ImportedXmlComponent | null {
    const trimmed = latex.trim();
    if (!trimmed) return null;
    try {
      if (!CodebookDocxGenerator.ommlCache[trimmed]) {
        const mathml = katex.renderToString(trimmed, {
          output: 'mathml',
          throwOnError: false,
          strict: 'ignore'
        });
        CodebookDocxGenerator.ommlCache[trimmed] = mml2omml(mathml);
      }
      const omml = CodebookDocxGenerator.ommlCache[trimmed];
      return CodebookDocxGenerator.unwrapImportedXmlRoot(
        ImportedXmlComponent.fromXmlString(
          CodebookDocxGenerator.sanitizeOmmlXml(omml)
        )
      );
    } catch {
      return null;
    }
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
    mathChildren: ImportedXmlComponent[]
  ): ImportedXmlComponent {
    const mathParagraph = new ImportedXmlComponent('m:oMathPara');
    const mathParagraphProperties = new ImportedXmlComponent('m:oMathParaPr');
    mathParagraphProperties.push(
      new ImportedXmlComponent('m:jc', { 'm:val': 'left' })
    );
    mathParagraph.push(mathParagraphProperties);
    mathChildren.forEach(mathChild => mathParagraph.push(mathChild));
    return mathParagraph;
  }

  private static normalizeParagraphChildren(
    children: ParagraphChild[]
  ): ParagraphChild[] {
    if (!children.length) {
      return children;
    }

    const mathChildren = children.filter(
      CodebookDocxGenerator.isMathComponent
    ) as ImportedXmlComponent[];
    if (mathChildren.length === children.length) {
      return [CodebookDocxGenerator.createLeftAlignedMathParagraph(mathChildren)];
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

  private static isListParagraph(elem: Element): boolean {
    return !!elem.parent && (elem.parent as Element).name === 'li';
  }

  private static htmlToDocx(
    html: string,
    contentSetting: CodeBookContentSetting
  ) {
    const normalizedHtml = CodebookDocxGenerator.normalizeMathTokens(html);
    const blockHtml = /<(p|h[1-4]|img|ul|ol)\b/i.test(normalizedHtml) ? normalizedHtml : `<p>${normalizedHtml}</p>`;
    const cheerioAPI = cheerio.load(
      CodebookDocxGenerator.prepareHtml(blockHtml),
      null,
      false
    );
    const elements: Paragraph[] = [];
    cheerioAPI('p,h1,h2,h3,h4,img').each((i, elem) => {
      try {
        const span = cheerioAPI(elem).find('span');
        if (elem.name === 'img') {
          elements.push(CodebookDocxGenerator.createImagePragraph(elem, contentSetting));
        } else {
          elements.push(
            CodebookDocxGenerator.createParagraph(
              cheerioAPI,
              elem.children,
              CodebookDocxGenerator.getTextAlignment(cheerioAPI, elem),
              CodebookDocxGenerator.getColor(cheerioAPI, span),
              CodebookDocxGenerator.getBackgroundColor(cheerioAPI, elem),
              CodebookDocxGenerator.getSize(cheerioAPI, span),
              CodebookDocxGenerator.isListParagraph(elem)
            )
          );
        }
      } catch {
        elements.push(
          new Paragraph({
            text: 'HTML konnte nicht verarbeitet werden.'
          })
        );
      }
    });
    return elements.filter(e => e !== undefined && e !== null);
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
    return sizeTypes.includes(size) ? 20 : parseInt(size, 10);
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
    isListParagraph: boolean
  ): Paragraph {
    const children: ParagraphChild[] = [];
    const childNodes = CodebookDocxGenerator.getChildren(cheerioAPI, elem);
    CodebookDocxGenerator.processInlineElements(
      childNodes,
      children,
      colorParsed,
      backgroundColor,
      size
    );
    const normalizedChildren = CodebookDocxGenerator.normalizeParagraphChildren(
      children
    );
    return new Paragraph({
      alignment: CodebookDocxGenerator.getAlignment(textAlignment),
      spacing: {
        before: 100,
        after: 100
      },
      indent: !isListParagraph ? { start: 100, end: 100 } : undefined,
      bullet: isListParagraph ? { level: 0 } : undefined,
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
