import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodeDataComponent } from './code-data.component';

describe('CodeComponent', () => {
  let component: CodeDataComponent;
  let fixture: ComponentFixture<CodeDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CodeDataComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CodeDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
