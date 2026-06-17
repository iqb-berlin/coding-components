import {
  AlignmentType,
  Document,
  HeadingLevel,
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
  Header,
  LevelFormat
} from 'docx';
import * as cheerio from 'cheerio';
import type { AnyNode, Element } from 'domhandler';
import type {
  BookVariable, CodeBookContentSetting, CodebookUnitDto, ItemMetadata, Missing
} from '@iqb/ngx-coding-components/codebook-models';

/**
 * Class for generating DOCX files for codebooks
 */
export class CodebookDocxGenerator {
  /**
   * Generate a DOCX file for a codebook
   * @param codingBookUnits List of codebook units
   * @param contentSetting Codebook content settings
   * @returns Blob with DOCX file
   */
  static async generateDocx(
    codingBookUnits: CodebookUnitDto[],
    contentSetting: CodeBookContentSetting
  ): Promise<Blob> {
    const units: (Paragraph | Table)[] = [];
    const missings = this.getMissings(codingBookUnits);
    codingBookUnits.forEach(variableCoding => {
      if (variableCoding.variables.length || !contentSetting.hasOnlyVarsWithCodes) {
        units.push(...(this.createDocXForUnit(
          variableCoding.items || [],
          variableCoding.variables,
          contentSetting,
          this.getUnitHeader(variableCoding)
        ) as (Paragraph | Table)[]));
      }
    });
    return Packer.toBlob(
      this.setDocXDocument(
        units,
        missings)
    );
  }

  /**
   * Get unit header
   * @param variableCoding Codebook unit
   * @returns Paragraph with unit header
   */
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
        before: 400,
        after: 200
      },
      text: `${variableCoding.key}  ${variableCoding.name}`,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER
    });
  }

  /**
   * Get missings paragraphs
   * @param variableCoding Codebook unit
   * @returns List of paragraphs with missings
   */
  private static getMissings(codingBookUnits: CodebookUnitDto[]): Paragraph[] {
    const missings: Paragraph[] = [];
    try {
      this.getUniqueMissingDefinitions(codingBookUnits).forEach(missing => {
        if (this.isValidMissing(missing)) {
          missings.push(new Paragraph({
            children: [new TextRun({ text: `${missing.code} ${missing.label}`, bold: true })],
            spacing: {
              after: 20
            }
          }));
          missings.push(new Paragraph({
            text: `${missing.description}`,
            spacing: {
              after: 100
            }
          }));
        } else {
          missings.push(new Paragraph({
            text: 'kein valides Missing ',
            spacing: {
              after: 200
            }
          }));
        }
      });
    } catch {
      missings.push(new Paragraph({
        text: 'kein validen Missings gefunden',
        spacing: {
          after: 200
        }
      }));
    }
    return missings;
  }

  private static getUniqueMissingDefinitions(codingBookUnits: CodebookUnitDto[]): Missing[] {
    const uniqueMissings = new Map<string, Missing>();
    codingBookUnits.flatMap(unit => unit.missings || []).forEach(missing => {
      uniqueMissings.set(
        `${missing.code}\u0000${missing.label}\u0000${missing.description}`,
        missing
      );
    });
    return [...uniqueMissings.values()];
  }

  private static isValidMissing(missing: Missing): boolean {
    return missing.code !== undefined &&
      missing.code !== null &&
      `${missing.code}` !== '' &&
      !!missing.label &&
      !!missing.description;
  }

  /**
   * Get table borders
   * @returns Table cell borders
   */
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

  /**
   * Get code rows for a table
   * @param variable Book variable
   * @param contentSetting Codebook content settings
   * @returns List of table rows
   */
  private static getCodeRows(variable: BookVariable, contentSetting: CodeBookContentSetting): TableRow[] {
    const rows: TableRow[] = [];
    const headerCells = [
      this.createHeaderCell('Code', this.getColumnWidths(contentSetting)[0]),
      this.createHeaderCell('Label', this.getColumnWidths(contentSetting)[1]),
      ...(contentSetting.showScore ?
        [this.createHeaderCell('Score', this.getColumnWidths(contentSetting)[2])] :
        []),
      this.createHeaderCell(
        'Beschreibung',
        this.getColumnWidths(contentSetting)[this.getColumnWidths(contentSetting).length - 1]
      )
    ];
    const headerRow = new TableRow({
      tableHeader: true,
      children: headerCells
    });
    rows.push(headerRow);
    variable.codes.forEach(code => {
      const codeCells = [
        this.createCodeCell([new Paragraph(code.id)], this.getColumnWidths(contentSetting)[0]),
        this.createCodeCell([new Paragraph(code.label)], this.getColumnWidths(contentSetting)[1]),
        ...(contentSetting.showScore ?
          [this.createCodeCell([new Paragraph(code.score || '')], this.getColumnWidths(contentSetting)[2])] :
          []),
        this.createCodeCell(
          this.htmlToDocx(code.description, contentSetting),
          this.getColumnWidths(contentSetting)[this.getColumnWidths(contentSetting).length - 1]
        )
      ];
      const row = new TableRow({
        children: codeCells
      });
      rows.push(row);
    });
    return rows;
  }

  private static createHeaderCell(text: string, width: number): TableCell {
    return this.createCodeCell(
      [new Paragraph({
        children: [
          new TextRun({
            text,
            bold: true
          })
        ]
      })],
      width
    );
  }

  private static createCodeCell(children: Paragraph[], width: number): TableCell {
    return new TableCell({
      borders: this.TableBoarders,
      width: {
        size: width,
        type: WidthType.DXA
      },
      children
    });
  }

  /**
   * Get column widths for a table
   * @param contentSetting Codebook content settings
   * @returns List of column widths
   */
  private static getColumnWidths(contentSetting: CodeBookContentSetting): number[] {
    return contentSetting.showScore ? [1000, 2000, 1000, 5000] : [1000, 2000, 6000];
  }

  /**
   * Get variables for a unit
   * @param codeBookVariable List of book variables
   * @param contentSetting Codebook content settings
   * @param varItems List of item metadata
   * @returns List of file children
   */
  private static getVariables(
    codeBookVariable: BookVariable[],
    contentSetting: CodeBookContentSetting,
    varItems: ItemMetadata[]
  ): (Paragraph | Table)[] {
    const children: (Paragraph | Table)[] = [];
    codeBookVariable.forEach(variable => {
      children.push(this.getVariableHeader(variable));
      if (!contentSetting.hideItemVarRelation) {
        children.push(...this.getVariableItems(variable, varItems));
      }
      if (variable.generalInstruction) {
        children.push(...this.getGeneralInstruction(contentSetting, variable));
      }
      if (variable.codes.length) {
        children.push(this.getCodeTable(variable, contentSetting));
      }
    });
    return children;
  }

  /**
   * Get variable header
   * @param variable Book variable
   * @returns Paragraph with variable header
   */
  private static getVariableHeader(variable: BookVariable): Paragraph {
    return new Paragraph({
      text: `${variable.id}  ${variable.label}`,
      heading: HeadingLevel.HEADING_2,
      spacing: {
        before: 400,
        after: 200
      }
    });
  }

  /**
   * Get variable items
   * @param variable Book variable
   * @param varItems List of item metadata
   * @returns List of paragraphs with variable items
   */
  private static getVariableItems(variable: BookVariable, varItems: ItemMetadata[]): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    const items = varItems.filter(item => this.isItemRelatedToVariable(item, variable.id));
    if (items.length) {
      paragraphs.push(new Paragraph({
        text: `Item(s): ${items.map(item => this.getItemId(item)).join('   ')}`,
        heading: HeadingLevel.HEADING_3,
        spacing: {
          before: 200,
          after: 200
        }
      }));
    }
    return paragraphs;
  }

  private static isItemRelatedToVariable(item: ItemMetadata, variableId: string): boolean {
    const normalizedVariableId = variableId.replace(/\./g, '_');
    return item['variableId'] === variableId ||
      item[variableId] !== undefined ||
      item[normalizedVariableId] !== undefined;
  }

  private static getItemId(item: ItemMetadata): string {
    const itemId = item['id'] ?? item['key'] ?? item['label'] ?? '';
    return `${itemId}`;
  }

  /**
   * Get general instruction
   * @param contentSetting Codebook content settings
   * @param codeBookVariable Book variable
   * @returns List of paragraphs with general instruction
   */
  private static getGeneralInstruction(
    contentSetting: CodeBookContentSetting,
    codeBookVariable: BookVariable
  ): Paragraph[] {
    return codeBookVariable.generalInstruction ?
      this.htmlToDocx(codeBookVariable.generalInstruction, contentSetting) : [];
  }

  /**
   * Get code table
   * @param codeBookVariable Book variable
   * @param contentSetting Codebook content settings
   * @returns Table with codes
   */
  private static getCodeTable(codeBookVariable: BookVariable, contentSetting: CodeBookContentSetting): Table {
    return new Table({
      rows: this.getCodeRows(codeBookVariable, contentSetting),
      width: {
        size: 9000,
        type: WidthType.DXA
      }
    });
  }

  /**
   * Create DOCX for a unit
   * @param items List of item metadata
   * @param codeBookVariable List of book variables
   * @param contentSetting Codebook content settings
   * @param unitHeader Paragraph with unit header
   * @returns List of file children
   */
  private static createDocXForUnit(
    items: ItemMetadata[],
    codeBookVariable: BookVariable[],
    contentSetting: CodeBookContentSetting,
    unitHeader: Paragraph
  ): (Paragraph | Table)[] {
    return [
      unitHeader,
      ...this.getVariables(codeBookVariable, contentSetting, items)
    ];
  }

  /**
   * Set DOCX document
   * @param children List of file children
   * @param missings List of paragraphs with missings
   * @returns Document
   */
  private static setDocXDocument(children: (Paragraph | Table)[], missings: Paragraph[]): Document {
    return new Document({
      creator: 'IQB-Kodierbox',
      title: 'Codebook',
      description: 'Codebook',
      styles: {
        paragraphStyles: [
          {
            id: 'Normal',
            name: 'Normal',
            basedOn: 'Normal',
            next: 'Normal',
            quickFormat: true,
            run: {
              size: 24,
              font: 'Calibri'
            },
            paragraph: {
              spacing: {
                after: 120
              }
            }
          }
        ]
      },
      numbering: {
        config: [
          {
            reference: 'codebook-numbering',
            levels: [
              {
                level: 0,
                format: LevelFormat.DECIMAL,
                text: '%1.',
                alignment: AlignmentType.START,
                style: {
                  paragraph: {
                    indent: {
                      left: 720,
                      hanging: 360
                    }
                  }
                }
              }
            ]
          }
        ]
      },
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1000,
                right: 1000,
                bottom: 1000,
                left: 1000
              }
            }
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun('IQB-Kodierbox Codebook '),
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      font: 'Calibri'
                    }),
                    new TextRun({
                      children: [' / '],
                      font: 'Calibri'
                    }),
                    new TextRun({
                      children: [PageNumber.TOTAL_PAGES],
                      font: 'Calibri'
                    })
                  ]
                })
              ]
            })
          },

          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: new Date().toLocaleDateString(),
                      font: 'Calibri'
                    })
                  ]
                })
              ]
            })
          },
          children: [
            ...(missings.length > 0 ? [
              new Paragraph({
                text: 'Missings',
                heading: HeadingLevel.HEADING_1,
                spacing: {
                  after: 200
                }
              }),
              ...missings
            ] : []),
            ...children
          ]
        }
      ]
    });
  }

  /**
   * Convert HTML to DOCX
   * @param html HTML string
   * @param contentSetting Codebook content settings
   * @returns List of paragraphs
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private static htmlToDocx(html: string, contentSetting: CodeBookContentSetting): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    if (!html) return paragraphs;

    try {
      const $ = cheerio.load(`<div>${html}</div>`);
      const rootElement = $('div')[0];

      if (rootElement && rootElement.children) {
        this.processChildNodes(rootElement.children, paragraphs);
      }
    } catch (error) {
      paragraphs.push(new Paragraph({ text: html }));
    }

    return paragraphs;
  }

  /**
   * Process child nodes
   * @param nodes List of nodes
   * @param paragraphs List of paragraphs
   */
  private static processChildNodes(nodes: AnyNode[], paragraphs: Paragraph[]): void {
    nodes.forEach(node => {
      if (node.type === 'text') {
        if ('data' in node && node.data && node.data.trim()) {
          paragraphs.push(new Paragraph({ text: this.normalizeText(node.data) }));
        }
      } else if (node.type === 'tag') {
        const element = node as Element;
        const tagName = element.name.toLowerCase();

        if (tagName === 'p') {
          const textRuns: TextRun[] = [];
          this.processInlineElements(element.children, textRuns);
          if (textRuns.length > 0) {
            paragraphs.push(new Paragraph({ children: textRuns }));
          }
        } else if (tagName === 'ul' || tagName === 'ol') {
          this.processListElements(element.children, paragraphs, tagName === 'ol');
        } else if (element.children && element.children.length > 0) {
          this.processChildNodes(element.children, paragraphs);
        }
      }
    });
  }

  /**
   * Process inline elements
   * @param nodes List of nodes
   * @param textRuns List of text runs
   */
  private static processInlineElements(nodes: AnyNode[], textRuns: TextRun[]): void {
    nodes.forEach(node => {
      if (node.type === 'text') {
        if ('data' in node && node.data && node.data.trim()) {
          textRuns.push(new TextRun({ text: this.normalizeText(node.data) }));
        }
      } else if (node.type === 'tag') {
        const element = node as Element;
        const tagName = element.name.toLowerCase();

        if (tagName === 'strong' || tagName === 'b') {
          if (element.children) {
            element.children.forEach(child => {
              if (child.type === 'text' && child.data) {
                textRuns.push(new TextRun({ text: this.normalizeText(child.data), bold: true }));
              }
            });
          }
        } else if (tagName === 'em' || tagName === 'i') {
          if (element.children) {
            element.children.forEach(child => {
              if (child.type === 'text' && child.data) {
                textRuns.push(new TextRun({ text: this.normalizeText(child.data), italics: true }));
              }
            });
          }
        } else if (element.children && element.children.length > 0) {
          this.processInlineElements(element.children, textRuns);
        }
      }
    });
  }

  /**
   * Process list elements
   * @param nodes List of nodes
   * @param paragraphs List of paragraphs
   * @param isOrdered Whether the list is ordered
   */
  private static processListElements(nodes: AnyNode[], paragraphs: Paragraph[], isOrdered: boolean): void {
    nodes.forEach(node => {
      if (node.type === 'tag') {
        const element = node as Element;
        if (element.name.toLowerCase() === 'li') {
          const textRuns: TextRun[] = [];
          this.processInlineElements(element.children, textRuns);
          if (textRuns.length > 0) {
            const numbering = isOrdered ? {
              reference: 'codebook-numbering',
              level: 0
            } : undefined;
            paragraphs.push(new Paragraph({
              children: textRuns,
              bullet: isOrdered ? undefined : {
                level: 0
              },
              numbering
            }));
          }
        }
      }
    });
  }

  private static normalizeText(text: string): string {
    return text.replace(/\s+/g, ' ');
  }
}
