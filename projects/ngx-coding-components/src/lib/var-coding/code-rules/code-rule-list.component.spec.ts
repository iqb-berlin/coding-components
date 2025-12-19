import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { CodeRuleListComponent } from './code-rule-list.component';

describe('CodeRuleListComponent', () => {
  let component: CodeRuleListComponent;
  let fixture: ComponentFixture<CodeRuleListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CodeRuleListComponent,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useClass: TranslateFakeLoader
          }
        })
      ]
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
