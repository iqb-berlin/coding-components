import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodeChoiceComponent } from './code-choice.component';

describe('CodeFullComponent', () => {
  let component: CodeChoiceComponent;
  let fixture: ComponentFixture<CodeChoiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CodeChoiceComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CodeChoiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
