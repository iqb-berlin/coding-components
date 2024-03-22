import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VarCodesManualComponent } from './var-codes-manual.component';

describe('VarCodesManualComponent', () => {
  let component: VarCodesManualComponent;
  let fixture: ComponentFixture<VarCodesManualComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [VarCodesManualComponent]
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
