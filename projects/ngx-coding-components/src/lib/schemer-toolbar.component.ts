import {Component, EventEmitter, Input, Output} from '@angular/core';
import {CodingScheme, VariableInfo} from "@iqb/responses";
import {FileService} from "./services/file.service";
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatTooltip } from '@angular/material/tooltip';
import { MatFabButton } from '@angular/material/button';

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
        '.mat-mdc-fab {z-index: 999; position: absolute; top: -8px; right: -8px}'
    ],
    standalone: true,
    imports: [MatFabButton, MatTooltip, MatMenuTrigger, MatIcon, MatMenu, MatMenuItem, MatDivider]
})
export class SchemerToolbarComponent {
  @Input() codingScheme: CodingScheme | null = null;
  @Input() varList: VariableInfo[] = [];
  @Output() codingSchemeChanged = new EventEmitter<CodingScheme | null>();
  @Output() varListChanged = new EventEmitter<VariableInfo[] | null>();

  saveCodingScheme(): void {
    FileService.saveToFile(JSON.stringify(this.codingScheme), 'coding-scheme.json');
  }

  async loadVariables(): Promise<void> {
    this.varList = JSON.parse(await FileService.loadFile(['.json']));
    this.varListChanged.emit(this.varList);
  }
  async loadCodingScheme(): Promise<void> {
    const codingsParsed = JSON.parse(await FileService.loadFile(['.json']))
    this.codingScheme = new CodingScheme(codingsParsed.variableCodings);
    this.codingSchemeChanged.emit(this.codingScheme);
  }
}
