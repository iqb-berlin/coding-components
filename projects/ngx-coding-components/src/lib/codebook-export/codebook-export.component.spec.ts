import { SimpleChange } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { CodebookExportComponent } from '../../../codebook-export/codebook-export.component';
import { NgxCodingComponentsTranslateLoader } from '../translations/ngx-coding-components.translate-loader';

describe('Studio codebook selection contract', () => {
  let component: CodebookExportComponent;
  beforeEach(() => {
    component = new CodebookExportComponent();
    component.availableUnits = [
      {
        unitId: 1, key: 'A', unitName: 'Alpha', groupName: 'Gruppe'
      },
      { unitId: 2, key: 'B', unitName: 'Beta' },
      {
        unitId: 3, key: 'C', unitName: 'Gesperrt', disabled: true
      }
    ];
    component.ngOnChanges({ availableUnits: new SimpleChange(null, component.availableUnits, true) });
  });

  it('selects all available units across search results, excluding disabled units', () => {
    component.filter = 'Alpha'; component.applyFilter(); component.toggleAll();
    expect(component.selection).toEqual([1, 2]);
    expect(component.allSelected).toBeTrue();
    component.toggleAll(); expect(component.selection).toEqual([]);
  });

  it('searches names, keys and groups without changing selection', () => {
    component.toggle(component.availableUnits[1]);
    component.filter = 'gruppe'; component.applyFilter();
    expect(component.selection).toEqual([2]);
    expect(component.dataSource.filteredData.map(unit => unit.unitId)).toEqual([1]);
  });

  it('accepts initial selection and removes unavailable or disabled IDs', () => {
    component.selectedUnitIds = [1, 3, 999];
    component.ngOnChanges({ selectedUnitIds: new SimpleChange([], component.selectedUnitIds, true) });
    expect(component.selection).toEqual([1]);
  });

  it('emits a copied export configuration without starting a download or a job', () => {
    component.toggle(component.availableUnits[0]);
    component.missingsProfiles = [{ id: 8, label: 'Profil' }]; component.selectedMissingsProfileId = 8;
    const emit = spyOn(component.exportRequested, 'emit');
    component.exportCodingBook();
    expect(emit).toHaveBeenCalledWith(jasmine.objectContaining({ selectedUnits: [1], missingsProfileId: 8 }));
    const config = emit.calls.mostRecent().args[0]!;
    component.contentOptions.showScore = false;
    expect(config.contentOptions.showScore).toBeTrue();
    expect(config.contentOptions.missingsProfile).toBe('Profil');
  });

  it('does not copy or emit host-specific options', () => {
    const hostOptions = { showScore: false, jobDefinitionId: 10, variableBundleIds: [7] };
    component.defaultContentOptions = hostOptions;
    component.ngOnChanges({ defaultContentOptions: new SimpleChange(null, hostOptions, true) });
    component.toggle(component.availableUnits[0]);
    const emit = spyOn(component.exportRequested, 'emit');
    component.exportCodingBook();
    const options = emit.calls.mostRecent().args[0]!.contentOptions;
    expect(options.showScore).toBeFalse();
    expect(Object.keys(options)).not.toContain('variableBundleIds');
    expect(Object.keys(options)).not.toContain('jobDefinitionId');
  });

  it('exports the shared training filter and supports Studio-only groups', () => {
    component.contentOptions.trainingRequirement = 'required';
    component.showGroupColumn = false;
    component.ngOnChanges({ showGroupColumn: new SimpleChange(true, false, false) });
    expect(component.columns).toEqual(['select', 'key', 'name']);
    component.toggle(component.availableUnits[0]);
    const emit = spyOn(component.exportRequested, 'emit');
    component.exportCodingBook();
    expect(emit.calls.mostRecent().args[0]!.contentOptions.trainingRequirement).toBe('required');
  });

  it('blocks individual and complete selection while loading', () => {
    component.loading = true;
    const emit = spyOn(component.selectionChanged, 'emit');
    component.toggle(component.availableUnits[0]); component.toggleAll();
    expect(component.selection).toEqual([]);
    expect(emit).not.toHaveBeenCalled();
  });

  it('notifies the host when refreshed units invalidate its selection', () => {
    component.toggleAll();
    const emit = spyOn(component.selectionChanged, 'emit');
    component.availableUnits = [component.availableUnits[0]];
    component.ngOnChanges({ availableUnits: new SimpleChange(null, component.availableUnits, false) });
    expect(component.selection).toEqual([1]);
    expect(emit).toHaveBeenCalledOnceWith([1]);
  });

  it('retains preselection until initially empty async inputs arrive', () => {
    component = new CodebookExportComponent();
    component.selectedUnitIds = [7];
    component.selectedMissingsProfileId = 8;
    const emit = spyOn(component.selectionChanged, 'emit');
    component.ngOnChanges({
      selectedUnitIds: new SimpleChange(undefined, [7], true),
      selectedMissingsProfileId: new SimpleChange(undefined, 8, true),
      availableUnits: new SimpleChange(undefined, [], true),
      missingsProfiles: new SimpleChange(undefined, [], true)
    });
    expect(component.exportDisabled).toBeTrue();
    expect(emit).not.toHaveBeenCalled();
    component.availableUnits = [{ unitId: 7, key: 'U', unitName: 'Aufgabe' }];
    component.ngOnChanges({ availableUnits: new SimpleChange([], component.availableUnits, false) });
    expect(component.selection).toEqual([7]);
    expect(component.selectedMissingsProfileId).toBe(8);
    expect(component.exportDisabled).toBeTrue();
    component.missingsProfiles = [{ id: 8, label: 'Profil' }];
    component.ngOnChanges({ missingsProfiles: new SimpleChange([], component.missingsProfiles, false) });
    expect(component.selectedMissingsProfileId).toBe(8);
    expect(component.exportDisabled).toBeFalse();
    expect(emit).not.toHaveBeenCalled();
  });

  it('keeps selection through a loading refresh and validates an authoritative empty result', () => {
    component.toggleAll();
    component.selectedMissingsProfileId = 8;
    component.missingsProfiles = [{ id: 8, label: 'Profil' }];
    component.ngOnChanges({ missingsProfiles: new SimpleChange([], component.missingsProfiles, false) });
    const emit = spyOn(component.selectionChanged, 'emit');
    component.loading = true;
    component.availableUnits = [];
    component.missingsProfiles = [];
    component.ngOnChanges({
      loading: new SimpleChange(false, true, false),
      availableUnits: new SimpleChange([], [], false),
      missingsProfiles: new SimpleChange([], [], false)
    });
    expect(component.selection).toEqual([1, 2]);
    expect(component.selectedMissingsProfileId).toBe(8);
    expect(emit).not.toHaveBeenCalled();
    component.loading = false;
    component.ngOnChanges({ loading: new SimpleChange(true, false, false) });
    expect(component.selection).toEqual([]);
    expect(component.selectedMissingsProfileId).toBe(0);
    expect(emit).toHaveBeenCalledOnceWith([]);
    expect(component.exportDisabled).toBeTrue();
  });

  it('restores selection after a loading refresh delivers the same task', () => {
    component.selectedUnitIds = [1];
    component.ngOnChanges({ selectedUnitIds: new SimpleChange([], [1], false) });
    const emit = spyOn(component.selectionChanged, 'emit');
    component.loading = true;
    component.availableUnits = [];
    component.ngOnChanges({
      loading: new SimpleChange(false, true, false), availableUnits: new SimpleChange([], [], false)
    });
    component.availableUnits = [{ unitId: 1, key: 'A', unitName: 'Alpha' }];
    component.loading = false;
    component.ngOnChanges({
      availableUnits: new SimpleChange([], component.availableUnits, false),
      loading: new SimpleChange(true, false, false)
    });
    expect(component.selection).toEqual([1]);
    expect(emit).not.toHaveBeenCalled();
  });

  it('validates a later explicitly empty profile list after an initially pending profile', () => {
    component = new CodebookExportComponent();
    component.selectedMissingsProfileId = 8;
    component.ngOnChanges({ missingsProfiles: new SimpleChange(undefined, [], true) });
    expect(component.selectedMissingsProfileId).toBe(8);
    component.ngOnChanges({ missingsProfiles: new SimpleChange([], [], false) });
    expect(component.selectedMissingsProfileId).toBe(0);
  });

  it('blocks export for empty selection, loading, busy and unsaved changes', () => {
    const emit = spyOn(component.exportRequested, 'emit');
    component.exportCodingBook(); component.toggle(component.availableUnits[0]);
    component.loading = true; component.exportCodingBook(); component.loading = false;
    component.busy = true; component.exportCodingBook(); component.busy = false;
    component.workspaceChanges = true; component.exportCodingBook();
    expect(emit).not.toHaveBeenCalled();
  });
});

describe('codebook checkbox accessibility', () => {
  it('retains bound IDs when initially empty inputs arrive later without rebinding the IDs', async () => {
    await TestBed.configureTestingModule({
      imports: [CodebookExportComponent, TranslateModule.forRoot()]
    }).compileComponents();
    const fixture = TestBed.createComponent(CodebookExportComponent);
    const emit = spyOn(fixture.componentInstance.selectionChanged, 'emit');
    fixture.componentRef.setInput('availableUnits', []);
    fixture.componentRef.setInput('missingsProfiles', []);
    fixture.componentRef.setInput('selectedUnitIds', [7]);
    fixture.componentRef.setInput('selectedMissingsProfileId', 8);
    fixture.componentRef.setInput('loading', false);
    await fixture.whenStable();
    expect(emit).not.toHaveBeenCalled();
    expect(fixture.componentInstance.exportDisabled).toBeTrue();
    fixture.componentRef.setInput('availableUnits', [{ unitId: 7, key: 'U', unitName: 'Aufgabe' }]);
    fixture.componentRef.setInput('missingsProfiles', [{ id: 8, label: 'Profil' }]);
    await fixture.whenStable();
    expect(fixture.componentInstance.selection).toEqual([7]);
    expect(fixture.componentInstance.selectedMissingsProfileId).toBe(8);
    expect(fixture.componentInstance.exportDisabled).toBeFalse();
    expect(fixture.nativeElement.querySelector('mat-row input').checked).toBeTrue();
    expect(fixture.nativeElement.querySelector('.select-missings-profile').textContent).toContain('Profil');
    expect(emit).not.toHaveBeenCalled();
    fixture.destroy();
  });

  (['loading', 'busy'] as const).forEach(state => {
    it(`locks all export options while ${state} and enables them again afterwards`, async () => {
      await TestBed.configureTestingModule({
        imports: [CodebookExportComponent, TranslateModule.forRoot()]
      }).compileComponents();
      const fixture = TestBed.createComponent(CodebookExportComponent);
      fixture.componentRef.setInput('availableUnits', [{ unitId: 1, key: 'TASK', unitName: 'Aufgabe' }]);
      fixture.componentRef.setInput(state, true);
      await fixture.whenStable();
      const controls = () => Array.from(fixture.nativeElement.querySelectorAll(
        'input[type="checkbox"], input[type="radio"]'
      )) as HTMLInputElement[];
      expect(controls().length).toBe(12);
      expect(controls().every(input => input.disabled)).toBeTrue();
      const selects: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('mat-select'));
      expect(selects.length).toBe(2);
      expect(selects.every(select => select.getAttribute('aria-disabled') === 'true')).toBeTrue();
      fixture.componentRef.setInput(state, false);
      await fixture.whenStable();
      expect(controls().every(input => !input.disabled)).toBeTrue();
      expect(selects.every(select => select.getAttribute('aria-disabled') === 'false')).toBeTrue();
      fixture.destroy();
    });
  });

  it('labels the actual checkbox inputs for assistive technology', async () => {
    await TestBed.configureTestingModule({
      imports: [CodebookExportComponent, TranslateModule.forRoot()]
    }).compileComponents();
    const fixture = TestBed.createComponent(CodebookExportComponent);
    fixture.componentRef.setInput('availableUnits', [{ unitId: 1, key: 'TASK', unitName: 'Aufgabe' }]);
    fixture.detectChanges();
    const inputs = fixture.nativeElement.querySelectorAll('input[type="checkbox"]');
    expect(inputs[0].getAttribute('aria-label')).toBe('codebook.coding.select-all-units');
    expect(inputs[1].getAttribute('aria-label')).toBe('TASK');
    fixture.destroy();
  });

  it('keeps task checkbox controls inside their header and data cells', async () => {
    await TestBed.configureTestingModule({
      imports: [CodebookExportComponent, TranslateModule.forRoot()]
    }).compileComponents();
    const fixture = TestBed.createComponent(CodebookExportComponent);
    fixture.componentRef.setInput('availableUnits', [{ unitId: 1, key: 'TASK', unitName: 'Aufgabe' }]);
    await fixture.whenStable();
    const cells: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.mat-column-select'));
    expect(cells.length).toBe(2);
    cells.forEach(cell => {
      const checkbox = cell.querySelector('.mdc-checkbox') as HTMLElement;
      const bounds = cell.getBoundingClientRect();
      const control = checkbox.getBoundingClientRect();
      expect(control.left).toBeGreaterThanOrEqual(bounds.left);
      expect(control.right).toBeLessThanOrEqual(bounds.right);
    });
    fixture.destroy();
  });
});

describe('codebook translations', () => {
  it('renders German labels and counts with the library loader alone', async () => {
    await TestBed.configureTestingModule({
      imports: [CodebookExportComponent, TranslateModule.forRoot({
        loader: { provide: TranslateLoader, useClass: NgxCodingComponentsTranslateLoader }
      })]
    }).compileComponents();
    await firstValueFrom(TestBed.inject(TranslateService).use('de'));
    const fixture = TestBed.createComponent(CodebookExportComponent);
    fixture.componentRef.setInput('availableUnits', [
      { unitId: 1, key: 'A', unitName: 'Aufgabe A' },
      { unitId: 2, key: 'B', unitName: 'Aufgabe B' }
    ]);
    fixture.componentRef.setInput('selectedUnitIds', [1, 2]);
    fixture.componentRef.setInput('workspaceChanges', true);
    await fixture.whenStable();
    const text = fixture.nativeElement.innerText as string;
    expect(text).toContain('Codebook exportieren');
    expect(text).toContain('Erhöhter Schulungsbedarf');
    expect(text).toContain('2 Aufgaben ausgewählt');
    expect(text).toContain('Änderungen im Arbeitsbereich müssen erst noch gespeichert werden!');
    expect(text).toContain('Exportieren');
    expect(text).toContain('Abbrechen');
    expect(text).not.toMatch(/codebook\.[\w.-]+/);
    fixture.destroy();
  });
});
