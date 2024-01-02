import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodeRulesFullComponent } from './code-rules-full.component';

describe('CodeRulesFullComponent', () => {
  let component: CodeRulesFullComponent;
  let fixture: ComponentFixture<CodeRulesFullComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CodeRulesFullComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CodeRulesFullComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
