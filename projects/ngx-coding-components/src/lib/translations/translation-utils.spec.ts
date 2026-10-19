import {
  mergeTranslations, selectTranslationsForLanguage
} from '@iqb/ngx-coding-components/translations';

describe('shared translation merging', () => {
  it('preserves library and application namespaces', () => {
    expect(mergeTranslations({ component: 'Komponente' }, { application: 'Anwendung' }))
      .toEqual({ component: 'Komponente', application: 'Anwendung' });
  });

  it('lets applications override individual nested labels without losing defaults', () => {
    expect(mergeTranslations(
      { codebook: { export: 'Exportieren', dialogs: { cancel: 'Abbrechen' } } },
      { codebook: { export: 'Herunterladen' } }
    )).toEqual({ codebook: { export: 'Herunterladen', dialogs: { cancel: 'Abbrechen' } } });
  });

  it('replaces scalar and array values instead of merging them', () => {
    expect(mergeTranslations(
      { scalar: { nested: 'Bibliothek' }, list: ['Bibliothek'] },
      { scalar: 'Anwendung', list: ['Anwendung'] }
    )).toEqual({ scalar: 'Anwendung', list: ['Anwendung'] });
  });

  it('does not mutate either input dictionary', () => {
    const base = { codebook: { export: 'Exportieren' } };
    const overrides = { codebook: { export: 'Herunterladen' } };
    mergeTranslations(base, overrides);
    expect(base.codebook.export).toBe('Exportieren');
    expect(overrides.codebook.export).toBe('Herunterladen');
  });
});

describe('shared translation language selection', () => {
  const translations = {
    de: { label: 'Deutsch' },
    'de-ch': { label: 'Schweizerdeutsch' },
    en: { label: 'English' }
  };

  it('prefers the requested locale and otherwise its base language', () => {
    expect(selectTranslationsForLanguage(' de-CH ', translations)['label']).toBe('Schweizerdeutsch');
    expect(selectTranslationsForLanguage('de-AT', translations)['label']).toBe('Deutsch');
    expect(selectTranslationsForLanguage('en', translations)['label']).toBe('English');
  });

  it('falls back to German or an explicitly selected fallback language', () => {
    expect(selectTranslationsForLanguage('fr', translations)['label']).toBe('Deutsch');
    expect(selectTranslationsForLanguage('fr', translations, 'en')['label']).toBe('English');
  });

  it('returns an empty map when no requested or fallback language is available', () => {
    expect(selectTranslationsForLanguage('fr', {}, 'de')).toEqual({});
  });
});
