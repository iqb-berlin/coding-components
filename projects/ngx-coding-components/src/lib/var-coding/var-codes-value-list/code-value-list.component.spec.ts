import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodeValueListComponent } from './code-value-list.component';

describe('CodeFullComponent', () => {
  let component: CodeValueListComponent;
  let fixture: ComponentFixture<CodeValueListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CodeValueListComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CodeValueListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
