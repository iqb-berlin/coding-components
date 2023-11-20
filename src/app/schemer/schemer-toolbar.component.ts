import {Component, Input} from '@angular/core';
import {CodingScheme, VariableInfo} from "@iqb/responses";
import {FileService} from "./services/file.service";

@Component({
  selector: 'schemer-load-save',
  template: `
    <button mat-fab [matMenuTriggerFor]="menu" matTooltip="Load/Save..." matTooltipPosition="above">
      <mat-icon>menu</mat-icon>
    </button>

    <mat-menu #menu="matMenu">
      <button mat-menu-item (click)="loadVariables()">
        <mat-icon>input</mat-icon>Variablenliste laden
      </button>
      <mat-divider></mat-divider>
      <button mat-menu-item (click)="loadCodingScheme()">
        <mat-icon>input</mat-icon>Antwortschema laden
      </button>
      <button mat-menu-item (click)="saveCodingScheme()">
        <mat-icon>get_app</mat-icon>Antwortschema speichern
      </button>
    </mat-menu>
  `,
  styles: [
    '.mat-mdc-fab {z-index: 999; position: absolute; top: 20px; right: 20px}'
  ]
})
export class SchemerToolbarComponent {
  @Input() codingScheme: CodingScheme | null = null;
  @Input() varList: VariableInfo[] = [];

  saveCodingScheme(): void {
    FileService.saveToFile(JSON.stringify(this.codingScheme), 'coding-scheme.json');
  }

  async loadVariables(): Promise<void> {
    this.varList = JSON.parse(await FileService.loadFile(['.json']));
  }
  async loadCodingScheme(): Promise<void> {
      this.codingScheme = JSON.parse(await FileService.loadFile(['.json']));
  }
}
