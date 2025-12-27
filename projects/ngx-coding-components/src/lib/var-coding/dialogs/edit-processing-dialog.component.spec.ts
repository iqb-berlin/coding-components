import { ProcessingParameterType } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { EditProcessingDialogComponent } from './edit-processing-dialog.component';

describe('EditProcessingDialogComponent', () => {
  it('constructor should clone processing array so external mutations do not affect it', () => {
    const originalProcessing: ProcessingParameterType[] = ['IGNORE_CASE'];

    const c = new EditProcessingDialogComponent({
      processing: originalProcessing,
      fragmenting: ''
    });

    expect(c.data.processing).toEqual(['IGNORE_CASE']);
    expect(c.data.processing).not.toBe(originalProcessing);

    originalProcessing.push('SORT_ARRAY');
    expect(c.data.processing).toEqual(['IGNORE_CASE']);
  });

  it('alterProcessing should add processing when checked and not already present', () => {
    const c = new EditProcessingDialogComponent({
      processing: [],
      fragmenting: ''
    });

    c.alterProcessing('IGNORE_CASE', true);
    expect(c.data.processing).toEqual(['IGNORE_CASE']);

    // no duplicates
    c.alterProcessing('IGNORE_CASE', true);
    expect(c.data.processing).toEqual(['IGNORE_CASE']);
  });

  it('alterProcessing should remove processing when unchecked', () => {
    const c = new EditProcessingDialogComponent({
      processing: ['IGNORE_CASE', 'SORT_ARRAY'],
      fragmenting: ''
    });

    c.alterProcessing('IGNORE_CASE', false);
    expect(c.data.processing).toEqual(['SORT_ARRAY']);
  });
});
