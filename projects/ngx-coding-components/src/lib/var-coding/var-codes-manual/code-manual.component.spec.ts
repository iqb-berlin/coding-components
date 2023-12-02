import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodeManualComponent } from './code-manual.component';

describe('CodeManualComponent', () => {
  let component: CodeManualComponent;
  let fixture: ComponentFixture<CodeManualComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CodeManualComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CodeManualComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
