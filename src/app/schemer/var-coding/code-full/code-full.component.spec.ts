import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodeFullComponent } from './code-full.component';

describe('CodeComponent', () => {
  let component: CodeFullComponent;
  let fixture: ComponentFixture<CodeFullComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CodeFullComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CodeFullComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
