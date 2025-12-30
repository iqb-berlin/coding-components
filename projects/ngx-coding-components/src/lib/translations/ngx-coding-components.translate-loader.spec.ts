import { firstValueFrom } from 'rxjs';

import { NgxCodingComponentsTranslateLoader } from './ngx-coding-components.translate-loader';

describe('NgxCodingComponentsTranslateLoader', () => {
  it('should return DE translations regardless of lang', async () => {
    const loader = new NgxCodingComponentsTranslateLoader();
    const t1 = await firstValueFrom(loader.getTranslation());
    const t2 = await firstValueFrom(loader.getTranslation());

    expect(t1).toBeTruthy();
    expect(t2).toBeTruthy();
    expect(t2).toEqual(t1);
  });
});
