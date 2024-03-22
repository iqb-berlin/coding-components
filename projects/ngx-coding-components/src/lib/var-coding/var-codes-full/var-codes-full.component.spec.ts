import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VarCodesFullComponent } from './var-codes-full.component';

describe('VarCodesFullComponent', () => {
  let component: VarCodesFullComponent;
  let fixture: ComponentFixture<VarCodesFullComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [VarCodesFullComponent]
})
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VarCodesFullComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
