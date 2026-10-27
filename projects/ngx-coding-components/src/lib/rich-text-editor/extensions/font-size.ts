import { FontSize as TiptapFontSize } from '@tiptap/extension-text-style';

/** Keep the existing instruction default while using Tiptap's font-size commands and parsing. */
export const FontSize = TiptapFontSize.extend({
  addGlobalAttributes() {
    return (this.parent?.() || []).map(attribute => ({
      ...attribute,
      attributes: {
        ...attribute.attributes,
        fontSize: {
          ...attribute.attributes['fontSize'],
          default: '20px'
        }
      }
    }));
  }
});
