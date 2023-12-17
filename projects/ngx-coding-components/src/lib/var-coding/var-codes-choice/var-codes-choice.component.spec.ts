import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VarCodesChoiceComponent } from './var-codes-choice.component';

describe('VarCodesValueListComponent', () => {
  let component: VarCodesChoiceComponent;
  let fixture: ComponentFixture<VarCodesChoiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VarCodesChoiceComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VarCodesChoiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
