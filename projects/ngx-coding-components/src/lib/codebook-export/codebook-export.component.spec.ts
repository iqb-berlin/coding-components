import { SimpleChange } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { CodebookExportComponent } from '../../../codebook-export/codebook-export.component';

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
});
