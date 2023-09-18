import {
  Component, EventEmitter, Input, Output,
  AfterViewInit, OnInit
} from '@angular/core';
import { Editor } from '@tiptap/core';
import { Underline } from '@tiptap/extension-underline';
import { Superscript } from '@tiptap/extension-superscript';
import { Subscript } from '@tiptap/extension-subscript';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { Heading } from '@tiptap/extension-heading';
import { Image } from '@tiptap/extension-image';
import { Blockquote } from '@tiptap/extension-blockquote';
import { Document } from '@tiptap/extension-document';
import { Text } from '@tiptap/extension-text';
import { ListItem } from '@tiptap/extension-list-item';
import { Bold } from '@tiptap/extension-bold';
import { Italic } from '@tiptap/extension-italic';
import { Strike } from '@tiptap/extension-strike';
import { Indent } from './modified-extensions/indent';
import { HangingIndent } from './modified-extensions/hanging-indent';
import { ParagraphExtension } from './modified-extensions/paragraph-extension';
import { FontSize } from './modified-extensions/font-size';
import { BulletListExtension } from './modified-extensions/bullet-list';
import { OrderedListExtension } from './modified-extensions/ordered-list';

@Component({
  selector: 'rich-text-editor',
  templateUrl: './rich-text-editor.component.html',
  styleUrls: ['./rich-text-editor.component.css']
})
export class RichTextEditorComponent implements OnInit, AfterViewInit {
  @Input() content!: string | Record<string, any>;
  @Input() defaultFontSize!: number;
  @Input() editorHeightPx!: number;
  @Output() contentChange = new EventEmitter<string | Record<string, any>>();

  selectedFontColor = 'lightgrey';
  selectedHighlightColor = 'lightgrey';
  selectedFontSize = '20px';
  selectedIndentSize = 20;
  bulletListStyle: string = 'disc';
  orderedListStyle: string = 'decimal';

  defaultExtensions = [
    Document, Text, ListItem,
    Underline, Superscript, Subscript,
    TextStyle, Color,
    Bold, Italic, Strike,
    Highlight.configure({
      multicolor: true
    }),
    TextAlign.configure({
      types: ['paragraph', 'heading']
    }),
    Indent.configure({
      types: ['listItem', 'paragraph'],
      minLevel: 0,
      maxLevel: 4
    }),
    Heading.configure({
      levels: [1, 2, 3, 4]
    }),
    ParagraphExtension,
    FontSize,
    BulletListExtension,
    OrderedListExtension,
    HangingIndent,
    Image.configure({
      inline: true,
      allowBase64: true,
      HTMLAttributes: {
        style: 'display: inline-block; height: 1em; vertical-align: middle'
      }
    }),
    Blockquote
  ];

  editor: Editor = new Editor({
    extensions: this.defaultExtensions
  });

  ngOnInit(): void {
    this.editor = new Editor({
      extensions: this.defaultExtensions,
      enablePasteRules: false,
      enableInputRules: false
    });
  }

  ngAfterViewInit(): void {
    this.editor.commands.focus();
  }

  toggleBold(): void {
    this.editor.chain().toggleBold().focus().run();
  }

  toggleItalic(): void {
    this.editor.chain().toggleItalic().focus().run();
  }

  toggleUnderline(): void {
    this.editor.chain().toggleUnderline().focus().run();
  }

  toggleStrike(): void {
    this.editor.commands.toggleStrike();
  }

  toggleSuperscript(): void {
    this.editor.chain().toggleSuperscript().focus().run();
  }

  toggleSubscript(): void {
    this.editor.chain().toggleSubscript().focus().run();
  }

  applyFontSize(size: string): void {
    this.selectedFontSize = size;
    this.editor.commands.setFontSize(size);
  }

  applyFontColor(): void {
    this.editor.chain().focus().setColor(this.selectedFontColor).run();
  }

  applyHighlightColor(): void {
    this.editor.chain().focus().toggleHighlight({ color: this.selectedHighlightColor }).run();
  }

  alignText(direction: string): void {
    this.editor.chain().focus().setTextAlign(direction).run();
  }

  indent(): void {
    this.editor.commands.indent(this.selectedIndentSize);
  }

  outdent(): void {
    this.editor.commands.outdent(this.selectedIndentSize);
  }

  toggleBulletList(): void {
    this.editor.chain().toggleBulletList().focus().run();
    this.editor.commands.setBulletListStyle(this.bulletListStyle);
  }

  toggleOrderedList(): void {
    this.editor.chain().toggleOrderedList().focus().run();
    this.editor.commands.setOrderedListStyle(this.orderedListStyle);
    this.editor.commands.setOrderedListFontSize(this.selectedFontSize);
  }

  applyListStyle(listType: string, style: string): void {
    if (listType === 'bulletList') {
      this.bulletListStyle = style;
      this.editor.commands.setBulletListStyle(style);
      if (!this.editor.isActive('bulletList')) {
        this.toggleBulletList();
      }
    } else {
      this.orderedListStyle = style;
      this.editor.commands.setOrderedListStyle(style);
      this.editor.commands.setOrderedListFontSize(this.selectedFontSize);
      if (!this.editor.isActive('orderedList')) {
        this.toggleOrderedList();
      }
    }
  }

  toggleHeading(level?: string): void {
    if (!level) {
      this.editor.commands.toggleNode('heading', 'paragraph');
    } else {
      this.editor.commands.toggleHeading({ level: Number(level) as 1 | 2 | 3 | 4 });
    }
  }

  applyParagraphStyle(margin: number): void {
    this.editor.commands.setMargin(margin);
  }

  insertSpecialChar(char: string): void {
    this.editor.chain().insertContent(char).focus().run();
  }

  hangIndent(): void {
    this.editor.commands.indent(this.selectedIndentSize);
    this.editor.commands.hangIndent(this.selectedIndentSize);
  }

  unhangIndent(): void {
    this.editor.commands.outdent(this.selectedIndentSize);
    this.editor.commands.unhangIndent(this.selectedIndentSize);
  }

  async insertImage(): Promise<void> {
    const mediaSrc = await new Promise<string>((resolve, reject) => {
      const fileUploadElement = document.createElement('input');
      fileUploadElement.type = 'file';
      fileUploadElement.accept = '[image/*]';
      fileUploadElement.addEventListener('change', event => {
        const uploadedFile = (event.target as HTMLInputElement).files?.[0];
        const reader = new FileReader();
        reader.onload = loadEvent => resolve(loadEvent.target?.result as string);
        reader.onerror = errorEvent => reject(errorEvent);
        if (uploadedFile) reader.readAsDataURL(uploadedFile);
      });
      fileUploadElement.click();
    });
    this.editor.commands.setImage({ src: mediaSrc });
  }

  toggleBlockquote(): void {
    this.editor.commands.toggleBlockquote();
  }
}
