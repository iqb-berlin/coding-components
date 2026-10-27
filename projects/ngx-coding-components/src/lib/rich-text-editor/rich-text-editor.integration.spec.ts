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

  it('does not report model writes as authored changes', async () => {
    const changed = jasmine.createSpy('changed');
    fixture.componentInstance.contentChange.subscribe(changed);

    fixture.componentRef.setInput('content', '<p>Loaded  instruction&nbsp;one</p>');
    await fixture.whenStable();
    expect(fixture.componentInstance.editor.getText()).toBe('Loaded  instruction\u00a0one');
    expect(changed).not.toHaveBeenCalled();

    fixture.componentRef.setInput('content', '<p>Loaded  instruction&nbsp;two</p>');
    await fixture.whenStable();
    expect(fixture.componentInstance.editor.getText()).toBe('Loaded  instruction\u00a0two');
    expect(changed).not.toHaveBeenCalled();

    fixture.componentInstance.editor.commands.insertContent('Authored ');
    await fixture.whenStable();
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('reopens legacy instruction styles, embedded images and formula attributes', async () => {
    const legacy = '<p><span style="font-size: 18px; color: rgb(255, 0, 0)">' +
      '<strong><u>A  B&nbsp;C</u></strong></span>' +
      '<aspect-nodeview-math-formula formula="x+1"></aspect-nodeview-math-formula></p>' +
      '<img src="data:image/png;base64,cGl4ZWw=" alt="Legacy image" ' +
      'data-style="float: right; margin-left: 10px" style="float: right; margin-left: 10px">';
    fixture.componentRef.setInput('content', legacy);
    await fixture.whenStable();
    const saved = fixture.componentInstance.editor.getHTML();

    fixture.destroy();
    fixture = TestBed.createComponent(RichTextEditorComponent);
    fixture.componentRef.setInput('content', saved);
    fixture.componentRef.setInput('editorHeightPx', 300);
    await fixture.whenStable();

    const { editor } = fixture.componentInstance;
    const document = new DOMParser().parseFromString(editor.getHTML(), 'text/html');
    expect(editor.getText()).toContain('A  B\u00a0C');
    expect(document.querySelector('strong u, u strong')?.textContent).toBe('A  B\u00a0C');
    const styled = document.querySelector<HTMLSpanElement>('span[style*="font-size"]');
    expect(styled?.style.fontSize).toBe('18px');
    expect(styled?.style.color).toBe('rgb(255, 0, 0)');
    expect(document.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,cGl4ZWw=');
    expect(document.querySelector('img')?.getAttribute('alt')).toBe('Legacy image');
    expect(document.querySelector<HTMLImageElement>('img')?.style.cssFloat).toBe('right');
    expect(document.querySelector('.iqb-math-formula')?.getAttribute('data-latex')).toBe('x+1');
  });
});
