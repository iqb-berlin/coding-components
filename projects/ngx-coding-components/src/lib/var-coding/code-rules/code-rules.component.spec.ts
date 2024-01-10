import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodeRulesComponent } from './code-rules.component';

describe('CodeRulesComponent', () => {
  let component: CodeRulesComponent;
  let fixture: ComponentFixture<CodeRulesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CodeRulesComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CodeRulesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
