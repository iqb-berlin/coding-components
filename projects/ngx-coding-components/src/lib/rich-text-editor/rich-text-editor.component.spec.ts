import { Editor } from '@tiptap/core';
import { RichTextEditorComponent } from './rich-text-editor.component';
import { FileService } from '../services/file.service';

describe('RichTextEditorComponent', () => {
  type CommandSpyHost = {
    focus: jasmine.Spy;
    toggleStrike: jasmine.Spy;
    setFontSize: jasmine.Spy;
    setTextAlign: jasmine.Spy;
    setMargin: jasmine.Spy;
    indent: jasmine.Spy;
    outdent: jasmine.Spy;
    hangIndent: jasmine.Spy;
    unhangIndent: jasmine.Spy;
    setBulletListStyle: jasmine.Spy;
    setOrderedListStyle: jasmine.Spy;
    setOrderedListFontSize: jasmine.Spy;
    toggleNode: jasmine.Spy;
    toggleHeading: jasmine.Spy;
    toggleBlockquote: jasmine.Spy;
    insertBlockImage: jasmine.Spy;
  };

  type FakeChain = {
    toggleBold: jasmine.Spy;
    toggleItalic: jasmine.Spy;
    toggleUnderline: jasmine.Spy;
    toggleSuperscript: jasmine.Spy;
    toggleSubscript: jasmine.Spy;
    toggleHighlight: jasmine.Spy;
    setColor: jasmine.Spy;
    setTextAlign: jasmine.Spy;
    toggleBulletList: jasmine.Spy;
    toggleOrderedList: jasmine.Spy;
    insertContent: jasmine.Spy;
    focus: jasmine.Spy;
    run: jasmine.Spy;
  };

  type FakeEditor = {
    chain: () => FakeChain;
    commands: CommandSpyHost;
    isActive: (name: string) => boolean;
    getAttributes: () => Record<string, unknown>;
  };

  const createComponentWithFakeEditor = (options?: {
    active?: Record<string, boolean>;
  }) => {
    const component = new RichTextEditorComponent();

    const commandSpyHost: CommandSpyHost = {
      focus: jasmine.createSpy('focus'),
      toggleStrike: jasmine.createSpy('toggleStrike'),
      setFontSize: jasmine.createSpy('setFontSize'),
      setTextAlign: jasmine.createSpy('setTextAlign'),
      setMargin: jasmine.createSpy('setMargin'),
      indent: jasmine.createSpy('indent'),
      outdent: jasmine.createSpy('outdent'),
      hangIndent: jasmine.createSpy('hangIndent'),
      unhangIndent: jasmine.createSpy('unhangIndent'),
      setBulletListStyle: jasmine.createSpy('setBulletListStyle'),
      setOrderedListStyle: jasmine.createSpy('setOrderedListStyle'),
      setOrderedListFontSize: jasmine.createSpy('setOrderedListFontSize'),
      toggleNode: jasmine.createSpy('toggleNode'),
      toggleHeading: jasmine.createSpy('toggleHeading'),
      toggleBlockquote: jasmine.createSpy('toggleBlockquote'),
      insertBlockImage: jasmine.createSpy('insertBlockImage')
    };

    const chainRunSpy = jasmine.createSpy('run');

    const chain = {} as FakeChain;
    Object.assign(chain, {
      toggleBold: jasmine.createSpy('toggleBold').and.callFake(() => chain),
      toggleItalic: jasmine.createSpy('toggleItalic').and.callFake(() => chain),
      toggleUnderline: jasmine.createSpy('toggleUnderline').and.callFake(() => chain),
      toggleSuperscript: jasmine.createSpy('toggleSuperscript').and.callFake(() => chain),
      toggleSubscript: jasmine.createSpy('toggleSubscript').and.callFake(() => chain),
      toggleHighlight: jasmine.createSpy('toggleHighlight').and.callFake(() => chain),
      setColor: jasmine.createSpy('setColor').and.callFake(() => chain),
      setTextAlign: jasmine.createSpy('setTextAlign').and.callFake(() => chain),
      toggleBulletList: jasmine.createSpy('toggleBulletList').and.callFake(() => chain),
      toggleOrderedList: jasmine.createSpy('toggleOrderedList').and.callFake(() => chain),
      insertContent: jasmine.createSpy('insertContent').and.callFake(() => chain),
      focus: jasmine.createSpy('focus').and.callFake(() => chain),
      run: chainRunSpy
    });

    const active = options?.active ?? {};

    const fakeEditor: FakeEditor = {
      chain: () => chain,
      commands: commandSpyHost,
      isActive: (name: string) => active[name],
      getAttributes: () => ({})
    };

    component.editor = fakeEditor as unknown as Editor;
    return { component, chain, commands: commandSpyHost };
  };

  it('ngAfterViewInit should focus the editor', () => {
    const { component, commands } = createComponentWithFakeEditor();
    component.ngAfterViewInit();
    expect(commands.focus).toHaveBeenCalled();
  });

  it('toggleBold/toggleItalic/toggleUnderline should use chain and run', () => {
    const { component, chain } = createComponentWithFakeEditor();

    component.toggleBold();
    expect(chain.toggleBold).toHaveBeenCalled();
    expect(chain.run).toHaveBeenCalled();

    (chain.run as jasmine.Spy).calls.reset();
    component.toggleItalic();
    expect(chain.toggleItalic).toHaveBeenCalled();
    expect(chain.run).toHaveBeenCalled();

    (chain.run as jasmine.Spy).calls.reset();
    component.toggleUnderline();
    expect(chain.toggleUnderline).toHaveBeenCalled();
    expect(chain.run).toHaveBeenCalled();
  });

  it('toggleStrike should call commands.toggleStrike', () => {
    const { component, commands } = createComponentWithFakeEditor();
    component.toggleStrike();
    expect(commands.toggleStrike).toHaveBeenCalled();
  });

  it('applyFontSize should update selectedFontSize and call commands.setFontSize', () => {
    const { component, commands } = createComponentWithFakeEditor();

    component.applyFontSize('12px');

    expect(component.selectedFontSize).toBe('12px');
    expect(commands.setFontSize).toHaveBeenCalledWith('12px');
  });

  it('applyListStyle should set styles and ensure list is active (bulletList path)', () => {
    const { component, commands } = createComponentWithFakeEditor({
      active: {
        bulletList: false
      }
    });

    const toggleSpy = spyOn(component, 'toggleBulletList');

    component.applyListStyle('bulletList', 'square');

    expect(component.bulletListStyle).toBe('square');
    expect(commands.setBulletListStyle).toHaveBeenCalledWith('square');
    expect(toggleSpy).toHaveBeenCalled();
  });

  it('applyListStyle should set styles and ensure list is active (orderedList path)', () => {
    const { component, commands } = createComponentWithFakeEditor({
      active: {
        orderedList: false
      }
    });

    component.selectedFontSize = '18px';

    const toggleSpy = spyOn(component, 'toggleOrderedList');

    component.applyListStyle('orderedList', 'upper-roman');

    expect(component.orderedListStyle).toBe('upper-roman');
    expect(commands.setOrderedListStyle).toHaveBeenCalledWith('upper-roman');
    expect(commands.setOrderedListFontSize).toHaveBeenCalledWith('18px');
    expect(toggleSpy).toHaveBeenCalled();
  });

  it('toggleHeading should toggleNode when no level, otherwise toggleHeading with numeric level', () => {
    const { component, commands } = createComponentWithFakeEditor();

    component.toggleHeading();
    expect(commands.toggleNode).toHaveBeenCalledWith('heading', 'paragraph');

    component.toggleHeading('2');
    expect(commands.toggleHeading).toHaveBeenCalledWith({ level: 2 });
  });

  it('insertSpecialChar should insert content and run', () => {
    const { component, chain } = createComponentWithFakeEditor();

    component.insertSpecialChar('&nbsp;');

    expect(chain.insertContent).toHaveBeenCalledWith('&nbsp;');
    expect(chain.run).toHaveBeenCalled();
  });

  it('hangIndent/unhangIndent should call indent/outdent and (un)hangIndent', () => {
    const { component, commands } = createComponentWithFakeEditor();
    component.selectedIndentSize = 30;

    component.hangIndent();
    expect(commands.indent).toHaveBeenCalledWith(30);
    expect(commands.hangIndent).toHaveBeenCalledWith(30);

    component.unhangIndent();
    expect(commands.outdent).toHaveBeenCalledWith(30);
    expect(commands.unhangIndent).toHaveBeenCalledWith(30);
  });

  it('insertBlockImage should insert with different styles based on alignment', async () => {
    const { component, commands } = createComponentWithFakeEditor();

    spyOn(FileService, 'loadImage').and.resolveTo('data:image/png;base64,abc');

    await component.insertBlockImage('left');
    expect(commands.insertBlockImage).toHaveBeenCalledWith({
      src: 'data:image/png;base64,abc',
      style: 'float: left; margin-right: 10px;'
    });

    (commands.insertBlockImage as jasmine.Spy).calls.reset();
    await component.insertBlockImage('right');
    expect(commands.insertBlockImage).toHaveBeenCalledWith({
      src: 'data:image/png;base64,abc',
      style: 'float: right; margin-left: 10px'
    });

    (commands.insertBlockImage as jasmine.Spy).calls.reset();
    await component.insertBlockImage('none');
    expect(commands.insertBlockImage).toHaveBeenCalledWith({
      src: 'data:image/png;base64,abc'
    });
  });

  it('toggleBlockquote should call commands.toggleBlockquote', () => {
    const { component, commands } = createComponentWithFakeEditor();

    component.toggleBlockquote();

    expect(commands.toggleBlockquote).toHaveBeenCalled();
  });
});
