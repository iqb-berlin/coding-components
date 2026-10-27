import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RichTextEditorComponent } from './rich-text-editor.component';

describe('RichTextEditorComponent with the real editor', () => {
  let fixture: ComponentFixture<RichTextEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RichTextEditorComponent, TranslateModule.forRoot()]
    }).compileComponents();
    fixture = TestBed.createComponent(RichTextEditorComponent);
    fixture.componentRef.setInput('content', '<p>Initial instruction</p>');
    fixture.componentRef.setInput('defaultFontSize', 16);
    fixture.componentRef.setInput('editorHeightPx', 300);
    await fixture.whenStable();
  });

  it('destroys ProseMirror when the component is removed', () => {
    const { editor } = fixture.componentInstance;
    const { view } = editor;
    expect(editor.isDestroyed).toBeFalse();

    fixture.destroy();

    expect(editor.isDestroyed).toBeTrue();
    expect(view.isDestroyed).toBeTrue();
  });

  it('keeps toolbar formatting and authored spaces when the stored instruction is reopened', async () => {
    fixture.componentRef.setInput('content', '<p>A  B&nbsp;C</p>');
    await fixture.whenStable();
    const { editor } = fixture.componentInstance;
    let saved = '';
    fixture.componentInstance.contentChange.subscribe(content => { saved = String(content); });
    editor.commands.selectAll();

    ['format_bold', 'format_italic', 'format_underlined'].forEach(icon => {
      const host: HTMLElement = fixture.nativeElement;
      const button = Array.from(host.querySelectorAll<HTMLButtonElement>('button'))
        .find(element => element.querySelector('mat-icon')?.textContent?.trim() === icon);
      expect(button).toBeDefined();
      button!.click();
    });
    await fixture.whenStable();

    expect(saved).toContain('<strong>');
    expect(saved).toContain('<em>');
    expect(saved).toContain('<u>');
    expect(editor.getText()).toBe('A  B\u00a0C');
    fixture.destroy();
    fixture = TestBed.createComponent(RichTextEditorComponent);
    fixture.componentRef.setInput('content', saved);
    fixture.componentRef.setInput('editorHeightPx', 300);
    await fixture.whenStable();

    expect(fixture.componentInstance.editor.getHTML()).toBe(saved);
    expect(fixture.componentInstance.editor.getText()).toBe('A  B\u00a0C');
  });
});
