import {
  CodingScheme,
  CodingSchemeVersionMajor,
  CodingSchemeVersionMinor
} from '@iqbspecs/coding-scheme';
import { VariableCodingData } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { SchemerStandaloneMenuComponent } from './schemer-standalone-menu.component';
import { FileService } from './services/file.service';

describe('SchemerStandaloneMenuComponent', () => {
  let component: SchemerStandaloneMenuComponent;

  const createVariableCoding = (id: string): VariableCodingData => ({
    id,
    sourceType: 'BASE',
    codes: []
  });

  const createVariableInfo = (id: string): VariableInfo => ({
    id,
    type: 'string',
    format: '',
    multiple: false,
    nullable: false,
    values: [],
    valuePositionLabels: []
  });

  beforeEach(() => {
    component = new SchemerStandaloneMenuComponent();
  });

  it('saveCodingScheme should serialize current scheme and delegate to FileService', () => {
    const saveSpy = spyOn(FileService, 'saveToFile');
    component.codingScheme = new CodingScheme([createVariableCoding('var-1')]);

    component.saveCodingScheme();

    const expectedPayload = {
      variableCodings: component.codingScheme?.variableCodings ?? [],
      version: `${CodingSchemeVersionMajor}.${CodingSchemeVersionMinor}`
    };

    expect(saveSpy).toHaveBeenCalledWith(
      JSON.stringify(expectedPayload, null, 2),
      'coding-scheme.json'
    );
  });

  it('saveCodingScheme should fall back to empty payload when codingScheme is null', () => {
    const saveSpy = spyOn(FileService, 'saveToFile');
    component.codingScheme = null;

    component.saveCodingScheme();

    expect(saveSpy).toHaveBeenCalledWith(
      JSON.stringify({
        variableCodings: [],
        version: `${CodingSchemeVersionMajor}.${CodingSchemeVersionMinor}`
      }, null, 2),
      'coding-scheme.json'
    );
  });

  it('loadVariables should parse JSON file and emit the new list', async () => {
    const varList = [createVariableInfo('v1'), createVariableInfo('v2')];
    spyOn(FileService, 'loadFile').and.returnValue(Promise.resolve(JSON.stringify(varList)));
    const emitSpy = spyOn(component.varListChanged, 'emit');

    await component.loadVariables();

    expect(FileService.loadFile).toHaveBeenCalledWith(['.json']);
    expect(component.varList).toEqual(varList);
    expect(emitSpy).toHaveBeenCalledWith(varList);
  });

  it('loadCodingScheme should handle payloads with variableCodings property', async () => {
    const variableCodings = [createVariableCoding('vc-1')];
    spyOn(FileService, 'loadFile').and.returnValue(
      Promise.resolve(
        JSON.stringify({
          version: '3.3',
          variableCodings
        })
      )
    );
    const emitSpy = spyOn(component.codingSchemeChanged, 'emit');

    await component.loadCodingScheme();

    expect(FileService.loadFile).toHaveBeenCalledWith(['.json']);
    expect(component.codingScheme).toBeTruthy();
    expect(component.codingScheme?.variableCodings.length).toBe(variableCodings.length);
    expect(component.codingScheme?.variableCodings).toEqual(
      jasmine.arrayContaining([jasmine.objectContaining({ id: 'vc-1' })])
    );
    expect(emitSpy).toHaveBeenCalledWith(component.codingScheme);
  });

  it('loadCodingScheme should handle legacy payloads defined as arrays', async () => {
    const legacyPayload = [createVariableCoding('legacy')];
    const expectedScheme = new CodingScheme(legacyPayload);
    spyOn(FileService, 'loadFile').and.returnValue(Promise.resolve(JSON.stringify(legacyPayload)));
    const emitSpy = spyOn(component.codingSchemeChanged, 'emit');

    await component.loadCodingScheme();

    expect(component.codingScheme).toBeTruthy();
    expect(component.codingScheme?.variableCodings.length).toBe(expectedScheme.variableCodings.length);
    expect(component.codingScheme?.variableCodings).toEqual(
      jasmine.arrayContaining([jasmine.objectContaining({ id: 'legacy' })])
    );
    expect(emitSpy).toHaveBeenCalledWith(component.codingScheme);
  });

  it('loadCodingScheme should emit empty scheme when payload is unsupported', async () => {
    spyOn(FileService, 'loadFile').and.returnValue(
      Promise.resolve(JSON.stringify({ version: '3.3', unsupported: true }))
    );
    const emitSpy = spyOn(component.codingSchemeChanged, 'emit');

    await component.loadCodingScheme();

    expect(FileService.loadFile).toHaveBeenCalledWith(['.json']);
    expect(component.codingScheme).toBeTruthy();
    expect(component.codingScheme?.variableCodings.length).toBe(0);
    expect(emitSpy).toHaveBeenCalledWith(component.codingScheme);
  });
});
