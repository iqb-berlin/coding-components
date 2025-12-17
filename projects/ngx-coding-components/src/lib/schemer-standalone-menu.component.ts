import {
  Component, EventEmitter, Input, Output
} from '@angular/core';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFabButton } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';
import { CodingScheme } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { FileService } from './services/file.service';
import { UserRoleType } from './services/schemer.service';

@Component({
  selector: 'schemer-standalone-menu',
  template: `
    <button
      mat-fab
      [matMenuTriggerFor]="menu"
      [matTooltip]="'varList.load-save-user-role' | translate"
      matTooltipPosition="above"
    >
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
      <mat-divider></mat-divider>
      <button
        mat-menu-item
        (click)="this.userRoleChanged.emit('RO')"
        [disabled]="userRole === 'RO'"
      >
        @if (userRole === 'RO') {
        <mat-icon>check</mat-icon>
        } Rolle: Nur lesen
      </button>
      <button
        mat-menu-item
        (click)="this.userRoleChanged.emit('RW_MINIMAL')"
        [disabled]="userRole === 'RW_MINIMAL'"
      >
        @if (userRole === 'RW_MINIMAL') {
        <mat-icon>check</mat-icon>
        } Rolle: RW minimal
      </button>
      <button
        mat-menu-item
        (click)="this.userRoleChanged.emit('RW_MAXIMAL')"
        [disabled]="userRole === 'RW_MAXIMAL'"
      >
        @if (userRole === 'RW_MAXIMAL') {
        <mat-icon>check</mat-icon>
        } Rolle: RW maximal
      </button>
    </mat-menu>
  `,
  styles: [
    '.mat-mdc-fab {z-index: 999; position: absolute; top: -8px; right: -8px}'
  ],
  standalone: true,
  imports: [
    MatFabButton,
    MatTooltipModule,
    MatMenuTrigger,
    MatIcon,
    MatMenu,
    MatMenuItem,
    MatDivider,
    TranslateModule
  ]
})
export class SchemerStandaloneMenuComponent {
  @Input() codingScheme: CodingScheme | null = null;
  @Input() varList: VariableInfo[] = [];
  @Input() userRole: UserRoleType = 'RW_MAXIMAL';
  @Output() userRoleChanged = new EventEmitter<UserRoleType>();
  @Output() codingSchemeChanged = new EventEmitter<CodingScheme | null>();
  @Output() varListChanged = new EventEmitter<VariableInfo[] | null>();

  saveCodingScheme(): void {
    FileService.saveToFile(
      JSON.stringify(this.codingScheme),
      'coding-scheme.json'
    );
  }

  async loadVariables(): Promise<void> {
    this.varList = JSON.parse(await FileService.loadFile(['.json']));
    this.varListChanged.emit(this.varList);
  }

  async loadCodingScheme(): Promise<void> {
    const codingsParsed = JSON.parse(await FileService.loadFile(['.json']));
    this.codingScheme = new CodingScheme(codingsParsed.variableCodings);
    this.codingSchemeChanged.emit(this.codingScheme);
  }
}
