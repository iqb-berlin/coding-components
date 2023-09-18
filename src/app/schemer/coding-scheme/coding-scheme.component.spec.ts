import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodingSchemeComponent } from './coding-scheme.component';

describe('CodingSchemeComponent', () => {
  let component: CodingSchemeComponent;
  let fixture: ComponentFixture<CodingSchemeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CodingSchemeComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CodingSchemeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
