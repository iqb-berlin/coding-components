import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SchemerStageComponent } from './schemer-stage.component';

describe('SchemerStageComponent', () => {
  let component: SchemerStageComponent;
  let fixture: ComponentFixture<SchemerStageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SchemerStageComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SchemerStageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
