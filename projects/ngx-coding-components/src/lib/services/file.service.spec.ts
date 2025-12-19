import { FileService } from './file.service';

describe('FileService', () => {
  const originalFileReader = window.FileReader;

  afterEach(() => {
    jasmine.clock().uninstall();
    (window as unknown as { FileReader: typeof FileReader }).FileReader = originalFileReader;
  });

  it('saveToFile should create an anchor, set download/href and click it', () => {
    const clickSpy = jasmine.createSpy('click');

    spyOn(document, 'createElement').and.callFake((tagName: string) => {
      if (tagName !== 'a') throw new Error('Unexpected tag');
      return {
        download: '',
        href: '',
        click: clickSpy
      } as unknown as HTMLAnchorElement;
    });

    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:mock');

    FileService.saveToFile('{"a":1}', 'my.json');

    const anchor = (document.createElement as jasmine.Spy).calls.mostRecent().returnValue as unknown as {
      download: string;
      href: string;
    };

    expect(anchor.download).toBe('export.json');
    expect(anchor.href).toBe('blob:mock');
    expect(clickSpy).toHaveBeenCalled();
  });

  it('loadFile should reject if no file was selected', async () => {
    spyOn(document, 'createElement').and.callFake((tagName: string) => {
      if (tagName !== 'input') throw new Error('Unexpected tag');
      const listeners: Record<string, (e: Event) => void> = {};
      return {
        type: '',
        accept: '',
        files: undefined,
        addEventListener: (name: string, cb: (e: Event) => void) => {
          listeners[name] = cb;
        },
        click: () => {
          listeners['change']?.({ target: { files: undefined } } as unknown as Event);
        }
      } as unknown as HTMLInputElement;
    });

    await expectAsync(FileService.loadFile()).toBeRejectedWithError('No file selected or file is invalid.');
  });

  const setupFileInputMock = (file: File | null) => {
    let changeListener: ((e: Event) => void) | null = null;
    const mockInput = {
      type: '',
      accept: '',
      files: file ? [file] as unknown as FileList : null,
      addEventListener: (name: string, cb: (e: Event) => void) => {
        if (name === 'change') changeListener = cb;
      },
      click: () => {
        changeListener?.({ target: mockInput } as unknown as Event);
      }
    } as unknown as HTMLInputElement;

    spyOn(document, 'createElement').and.callFake((tagName: string) => {
      if (tagName !== 'input') throw new Error('Unexpected tag');
      return mockInput;
    });

    return mockInput;
  };

  const setupFileReaderMock = (options: {
    textResult?: string;
    base64Result?: string;
    fail?: boolean;
  }) => {
    const createdReaders: {
      result: string | ArrayBuffer | null;
      onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null;
      onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null;
      readAsText: jasmine.Spy;
      readAsDataURL: jasmine.Spy;
    }[] = [];

    const createReader = () => {
      const reader = {
        result: null as string | ArrayBuffer | null,
        onload: null as ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null,
        onerror: null as ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null,
        readAsText: jasmine.createSpy('readAsText').and.callFake(() => {
          if (options.fail) {
            reader.onerror?.call(reader as unknown as FileReader, {} as ProgressEvent<FileReader>);
            return;
          }
          reader.result = options.textResult ?? '';
          reader.onload?.call(reader as unknown as FileReader, {} as ProgressEvent<FileReader>);
        }),
        readAsDataURL: jasmine.createSpy('readAsDataURL').and.callFake(() => {
          if (options.fail) {
            reader.onerror?.call(reader as unknown as FileReader, {} as ProgressEvent<FileReader>);
            return;
          }
          reader.result = options.base64Result ?? '';
          reader.onload?.call(reader as unknown as FileReader, {} as ProgressEvent<FileReader>);
        })
      };
      createdReaders.push(reader);
      return reader;
    };

    const fileReaderHost = window as unknown as { FileReader: typeof FileReader };
    const FakeFileReader = function thisFileReader(this: FileReader) {
      const reader = createReader();
      return reader as unknown as FileReader;
    };
    fileReaderHost.FileReader = FakeFileReader as unknown as typeof FileReader;

    return {
      last: () => createdReaders[createdReaders.length - 1] ?? null
    };
  };

  it('loadFile should resolve with the file contents and set accepted extensions', async () => {
    const mockFile = {} as File;
    const input = setupFileInputMock(mockFile);
    const readerTracker = setupFileReaderMock({ textResult: '{"a":1}' });

    const result = await FileService.loadFile(['.json']);

    expect(result).toBe('{"a":1}');
    expect(input.accept).toBe('.json');
    expect(readerTracker.last()?.readAsText).toHaveBeenCalled();
  });

  it('loadFile should default to text mode and set type=file when no fileTypes are given', async () => {
    const mockFile = {} as File;
    const input = setupFileInputMock(mockFile);
    const readerTracker = setupFileReaderMock({ textResult: '{"a":1}' });

    const result = await FileService.loadFile();

    expect(result).toBe('{"a":1}');
    expect(input.type).toBe('file');
    expect(input.accept).toBe('');
    expect(readerTracker.last()?.readAsText).toHaveBeenCalled();
  });

  it('loadFile should read the file as Base64 when requested', async () => {
    const mockFile = {} as File;
    const input = setupFileInputMock(mockFile);
    const readerTracker = setupFileReaderMock({ base64Result: 'data:image/png;base64,abc' });

    const result = await FileService.loadFile(['image/png'], true);

    expect(result).toBe('data:image/png;base64,abc');
    expect(input.accept).toBe('image/png');
    expect(readerTracker.last()?.readAsDataURL).toHaveBeenCalled();
  });

  it('loadFile should reject when FileReader throws an error', async () => {
    setupFileInputMock({} as File);
    setupFileReaderMock({ fail: true });

    await expectAsync(FileService.loadFile()).toBeRejectedWithError('Error reading file.');
  });

  it('loadImage should call loadFile with image/* and asBase64=true', async () => {
    const loadFileSpy = spyOn(FileService, 'loadFile').and.returnValue(Promise.resolve('x'));

    await FileService.loadImage();

    expect(loadFileSpy).toHaveBeenCalledWith(['image/*'], true);
  });
});
