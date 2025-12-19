import { firstValueFrom } from 'rxjs';

import { SchemerTranslateLoader } from './schemer-translate-loader';

describe('SchemerTranslateLoader', () => {
  it('should return DE translations regardless of lang', async () => {
    const loader = new SchemerTranslateLoader();
    const t1 = await firstValueFrom(loader.getTranslation('de'));
    const t2 = await firstValueFrom(loader.getTranslation('en'));

    expect(t1).toBeTruthy();
    expect(t2).toBeTruthy();
    expect(t2).toEqual(t1);
  });
});
