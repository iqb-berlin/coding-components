import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CodeRuleListComponent } from '@ngx-coding-components/var-coding/code-rules/code-rule-list.component';

describe('CodeRuleListComponent', () => {
  let component: CodeRuleListComponent;
  let fixture: ComponentFixture<CodeRuleListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CodeRuleListComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CodeRuleListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
