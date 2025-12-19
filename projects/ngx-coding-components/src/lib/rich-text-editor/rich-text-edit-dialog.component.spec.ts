import { RichTextEditDialogComponent } from './rich-text-edit-dialog.component';

type DialogData = ConstructorParameters<typeof RichTextEditDialogComponent>[0];

describe('RichTextEditDialogComponent', () => {
  const createDialogData = (overrides: Partial<DialogData> = {}): DialogData => ({
    title: 'Edit text',
    content: '<p>initial</p>',
    defaultFontSize: 16,
    editorHeightPx: 420,
    ...overrides
  });

  it('should expose provided dialog data via the public data property', () => {
    const data = createDialogData();

    const component = new RichTextEditDialogComponent(data);

    expect(component.data).toBe(data);
    expect(component.data.title).toBe('Edit text');
    expect(component.data.content).toBe('<p>initial</p>');
    expect(component.data.defaultFontSize).toBe(16);
    expect(component.data.editorHeightPx).toBe(420);
  });

  it('should allow both string and structured content payloads', () => {
    const structuredContent = { blocks: [{ type: 'paragraph', text: 'hi' }] };
    const componentWithString = new RichTextEditDialogComponent(createDialogData());
    const componentWithObject = new RichTextEditDialogComponent(
      createDialogData({
        title: 'Structured',
        content: structuredContent,
        defaultFontSize: 18,
        editorHeightPx: 360
      })
    );

    componentWithString.data.content = '<p>updated</p>';

    expect(componentWithString.data.content).toBe('<p>updated</p>');
    expect(componentWithObject.data.content).toBe(structuredContent);
    expect(componentWithObject.data.title).toBe('Structured');
  });
});
