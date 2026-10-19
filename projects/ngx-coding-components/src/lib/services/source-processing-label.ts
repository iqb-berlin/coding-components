import { SourceProcessingType, SourceType } from '@iqbspecs/coding-scheme';

export function sourceProcessingLabelKey(processingId: SourceProcessingType, sourceType?: SourceType): string {
  const concatPartial = sourceType === 'CONCAT_CODE' && (
    processingId === 'TAKE_DISPLAYED_AS_ZERO_IF_PARTIAL' || processingId === 'TAKE_EMPTY_AS_ZERO_IF_PARTIAL'
  );
  return `derive-processing.${processingId}${concatPartial ? '_CONCAT_CODE' : ''}`;
}
