import {Component, Input} from '@angular/core';
import {ResponseScheme, VariableInfo} from "@iqb/responses";
import {FileService} from "./services/file.service";

@Component({
  selector: 'schemer-load-save',
  template: `
    <button mat-fab [matMenuTriggerFor]="menu" matTooltip="Load/Save..." matTooltipPosition="above">
      <mat-icon>menu</mat-icon>
    </button>

    <mat-menu #menu="matMenu">
      <button mat-menu-item (click)="loadVariables()">
        <mat-icon>input</mat-icon>{{'toolbar.loadVarList' | translate}}
      </button>
      <mat-divider></mat-divider>
      <button mat-menu-item (click)="loadCodingScheme()">
        <mat-icon>input</mat-icon>{{'toolbar.loadCodingScheme' | translate}}
      </button>
      <button mat-menu-item (click)="saveCodingScheme()">
        <mat-icon>get_app</mat-icon>{{'toolbar.saveCodingScheme' | translate}}
      </button>
    </mat-menu>
  `,
  styles: [
    '.mat-mdc-fab {z-index: 999; position: absolute; top: 20px; right: 20px}'
  ]
})
export class SchemerToolbarComponent {
  @Input() responseScheme: ResponseScheme | null = null;
  @Input() varList: VariableInfo[] = [];

  saveCodingScheme(): void {
    FileService.saveToFile(JSON.stringify(this.responseScheme), 'coding-scheme.json');
  }

  async loadVariables(): Promise<void> {
    this.varList = JSON.parse(await FileService.loadFile(['.json']));
  }
  async loadCodingScheme(): Promise<void> {
      this.responseScheme = JSON.parse(await FileService.loadFile(['.json']));
  }
}
