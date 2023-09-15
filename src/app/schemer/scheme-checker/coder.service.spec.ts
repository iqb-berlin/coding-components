import { TestBed } from '@angular/core/testing';

import { CoderService } from './coder.service';

describe('CoderService', () => {
  let service: CoderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CoderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
