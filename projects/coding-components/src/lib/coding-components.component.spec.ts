import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodingComponentsComponent } from './coding-components.component';

describe('CodingComponentsComponent', () => {
  let component: CodingComponentsComponent;
  let fixture: ComponentFixture<CodingComponentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CodingComponentsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CodingComponentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
