import { EditProcessingDialogComponent } from './edit-processing-dialog.component';

describe('EditProcessingDialogComponent', () => {
  it('constructor should clone processing array so external mutations do not affect it', () => {
    const originalProcessing: string[] = ['IGNORE_CASE'];

    const c = new EditProcessingDialogComponent({
      processing: originalProcessing,
      fragmenting: ''
    } as unknown);

    expect(c.data.processing).toEqual(['IGNORE_CASE']);
    expect(c.data.processing).not.toBe(originalProcessing);

    originalProcessing.push('SORT_ARRAY');
    expect(c.data.processing).toEqual(['IGNORE_CASE']);
  });

  it('alterProcessing should add processing when checked and not already present', () => {
    const c = new EditProcessingDialogComponent({
      processing: [],
      fragmenting: ''
    } as unknown);

    c.alterProcessing('IGNORE_CASE' as unknown as Parameters<EditProcessingDialogComponent['alterProcessing']>[0], true);
    expect(c.data.processing).toEqual(['IGNORE_CASE']);

    // no duplicates
    c.alterProcessing('IGNORE_CASE' as unknown as Parameters<EditProcessingDialogComponent['alterProcessing']>[0], true);
    expect(c.data.processing).toEqual(['IGNORE_CASE']);
  });

  it('alterProcessing should remove processing when unchecked', () => {
    const c = new EditProcessingDialogComponent({
      processing: ['IGNORE_CASE', 'SORT_ARRAY'],
      fragmenting: ''
    } as unknown);

    c.alterProcessing('IGNORE_CASE' as unknown as Parameters<EditProcessingDialogComponent['alterProcessing']>[0], false);
    expect(c.data.processing).toEqual(['SORT_ARRAY']);
  });
});
