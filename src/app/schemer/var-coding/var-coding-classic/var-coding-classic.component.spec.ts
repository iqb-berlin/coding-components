import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VarCodingClassicComponent } from './var-coding-classic.component';

describe('CodingSchemeComponent', () => {
  let component: VarCodingClassicComponent;
  let fixture: ComponentFixture<VarCodingClassicComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VarCodingClassicComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VarCodingClassicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
