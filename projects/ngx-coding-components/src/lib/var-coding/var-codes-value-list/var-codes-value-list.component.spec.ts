import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VarCodesValueListComponent } from './var-codes-value-list.component';

describe('VarCodesValueListComponent', () => {
  let component: VarCodesValueListComponent;
  let fixture: ComponentFixture<VarCodesValueListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [VarCodesValueListComponent]
})
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VarCodesValueListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
