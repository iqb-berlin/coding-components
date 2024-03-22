import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VarCodingComponent } from './var-coding.component';

describe('CodingSchemeComponent', () => {
  let component: VarCodingComponent;
  let fixture: ComponentFixture<VarCodingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [VarCodingComponent]
})
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VarCodingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
