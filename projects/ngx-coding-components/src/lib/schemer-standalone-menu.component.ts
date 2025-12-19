import {
  Component, EventEmitter, Input, Output
} from '@angular/core';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFabButton } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';
import {
  CodingScheme,
  CodingSchemeVersionMajor,
  CodingSchemeVersionMinor
} from '@iqbspecs/coding-scheme';
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
        <mat-icon>input</mat-icon>{{ 'varList.load-variables' | translate }}
      </button>
      <mat-divider></mat-divider>
      <button mat-menu-item (click)="loadCodingScheme()">
        <mat-icon>input</mat-icon>{{ 'varList.load-coding-scheme' | translate }}
      </button>
      <button mat-menu-item (click)="saveCodingScheme()">
        <mat-icon>get_app</mat-icon
        >{{ 'varList.save-coding-scheme' | translate }}
      </button>
      <mat-divider></mat-divider>
      <button
        mat-menu-item
        (click)="this.userRoleChanged.emit('RO')"
        [disabled]="userRole === 'RO'"
      >
        @if (userRole === 'RO') {
        <mat-icon>check</mat-icon>
        } {{ 'varList.role.ro' | translate }}
      </button>
      <button
        mat-menu-item
        (click)="this.userRoleChanged.emit('RW_MINIMAL')"
        [disabled]="userRole === 'RW_MINIMAL'"
      >
        @if (userRole === 'RW_MINIMAL') {
        <mat-icon>check</mat-icon>
        } {{ 'varList.role.rw-minimal' | translate }}
      </button>
      <button
        mat-menu-item
        (click)="this.userRoleChanged.emit('RW_MAXIMAL')"
        [disabled]="userRole === 'RW_MAXIMAL'"
      >
        @if (userRole === 'RW_MAXIMAL') {
        <mat-icon>check</mat-icon>
        } {{ 'varList.role.rw-maximal' | translate }}
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
    const payload = {
      variableCodings: this.codingScheme?.variableCodings ?? [],
      version: `${CodingSchemeVersionMajor}.${CodingSchemeVersionMinor}`
    };
    FileService.saveToFile(
      JSON.stringify(payload, null, 2),
      'coding-scheme.json'
    );
  }

  async loadVariables(): Promise<void> {
    this.varList = JSON.parse(await FileService.loadFile(['.json']));
    this.varListChanged.emit(this.varList);
  }

  async loadCodingScheme(): Promise<void> {
    const codingsParsed = JSON.parse(await FileService.loadFile(['.json']));
    let variableCodings = [];
    if (Array.isArray(codingsParsed?.variableCodings)) {
      variableCodings = codingsParsed.variableCodings;
    } else if (Array.isArray(codingsParsed)) {
      variableCodings = codingsParsed;
    }

    this.codingScheme = new CodingScheme(variableCodings);
    this.codingSchemeChanged.emit(this.codingScheme);
  }
}
