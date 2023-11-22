import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VarCodesManualComponent } from './var-codes-manual.component';

describe('VarCodesFullComponent', () => {
  let component: VarCodesManualComponent;
  let fixture: ComponentFixture<VarCodesManualComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VarCodesManualComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VarCodesManualComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
