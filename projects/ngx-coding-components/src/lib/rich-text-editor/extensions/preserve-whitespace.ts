import { commands, Extension } from '@tiptap/core';

/** Preserve authored spacing when ngx-tiptap writes stored HTML through setContent. */
export const PreserveWhitespace = Extension.create({
  name: 'preserveWhitespace',
  priority: 1,
  addCommands() {
    return {
      setContent: (content, options = {}) => commands.setContent(content, {
        ...options,
        parseOptions: { preserveWhitespace: 'full', ...options.parseOptions }
      })
    };
  }
});
