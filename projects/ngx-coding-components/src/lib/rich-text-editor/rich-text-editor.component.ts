import {
  Component, EventEmitter, Input, Output,
  AfterViewInit
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
import { Blockquote } from '@tiptap/extension-blockquote';
import { Document } from '@tiptap/extension-document';
import { History } from '@tiptap/extension-history';
import { Text } from '@tiptap/extension-text';
import { ListItem } from '@tiptap/extension-list-item';
import { Bold } from '@tiptap/extension-bold';
import { Italic } from '@tiptap/extension-italic';
import { Strike } from '@tiptap/extension-strike';
import { NgxTiptapModule } from 'ngx-tiptap';
import { MatMenuTrigger, MatMenu } from '@angular/material/menu';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatInput } from '@angular/material/input';
import { MatOption } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIconButton, MatButton } from '@angular/material/button';
import { AnchorId } from './extensions/anchorId';
import { Indent } from './extensions/indent';
import { HangingIndent } from './extensions/hanging-indent';
import { ParagraphExtension } from './extensions/paragraph-extension';
import { FontSize } from './extensions/font-size';
import { BulletListExtension } from './extensions/bullet-list';
import { OrderedListExtension } from './extensions/ordered-list';
import { BlockImage } from './extensions/block-image';
import { FileService } from '../services/file.service';
import { ComboButtonComponent } from './combo-button.component';

@Component({
  selector: 'aspect-rich-text-editor',
  templateUrl: './rich-text-editor.component.html',
  styleUrls: ['./rich-text-editor.component.scss'],
  standalone: true,
  imports: [
    MatIconButton, MatTooltip, MatIcon, MatFormField, MatLabel, MatSelect, MatOption,
    ComboButtonComponent, MatInput, ReactiveFormsModule, FormsModule,
    MatMenuTrigger, MatMenu, MatButton, NgxTiptapModule
  ]
})
export class RichTextEditorComponent implements AfterViewInit {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() content!: string | Record<string, any>;
  @Input() defaultFontSize!: number;
  @Input() editorHeightPx!: number;
  @Input() clozeMode: boolean = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    Bold, Italic, Strike, History,
    Highlight.configure({
      multicolor: true
    }),
    AnchorId,
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
    BlockImage,
    Blockquote
  ];

  editor: Editor = new Editor({
    extensions: this.defaultExtensions
  });

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

  async insertBlockImage(alignment: 'none' | 'right' | 'left'): Promise<void> {
    const mediaSrc = await FileService.loadImage();
    switch (alignment) {
      case 'left': {
        this.editor.commands.insertBlockImage({ src: mediaSrc, style: 'float: left; margin-right: 10px;' });
        break;
      }
      case 'right': {
        this.editor.commands.insertBlockImage({ src: mediaSrc, style: 'float: right; margin-left: 10px' });
        break;
      }
      default: {
        this.editor.commands.insertBlockImage({ src: mediaSrc });
      }
    }
  }

  toggleBlockquote(): void {
    this.editor.commands.toggleBlockquote();
  }
}
