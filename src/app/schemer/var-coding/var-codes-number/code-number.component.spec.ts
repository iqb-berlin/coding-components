import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodeNumberComponent } from './code-number.component';

describe('CodeNumberComponent', () => {
  let component: CodeNumberComponent;
  let fixture: ComponentFixture<CodeNumberComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CodeNumberComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CodeNumberComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
