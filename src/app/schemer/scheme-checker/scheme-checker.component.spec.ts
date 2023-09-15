import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SchemeCheckerComponent } from './scheme-checker.component';

describe('SchemaCheckerComponent', () => {
  let component: SchemeCheckerComponent;
  let fixture: ComponentFixture<SchemeCheckerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SchemeCheckerComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SchemeCheckerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
