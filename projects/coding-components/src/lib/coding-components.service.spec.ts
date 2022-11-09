import { TestBed } from '@angular/core/testing';

import { CodingComponentsService } from './coding-components.service';

describe('CodingComponentsService', () => {
  let service: CodingComponentsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CodingComponentsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
