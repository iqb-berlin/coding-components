import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VarCodesNumberComponent } from './var-codes-number.component';

describe('VarCodesNumberComponent', () => {
  let component: VarCodesNumberComponent;
  let fixture: ComponentFixture<VarCodesNumberComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VarCodesNumberComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VarCodesNumberComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
