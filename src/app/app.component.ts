import { Component } from '@angular/core';
import { CodingFactory } from '@iqb/responses/coding-factory';
import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconButton } from '@angular/material/button';
import {
  MatDrawerContainer,
  MatDrawer,
  MatDrawerContent
} from '@angular/material/sidenav';
import { TranslateModule } from '@ngx-translate/core';
import { SchemeCheckerComponent } from '@ngx-coding-components/scheme-checker/scheme-checker.component';
import { SchemerComponent } from '@ngx-coding-components/schemer/schemer.component';
import { SchemerStandaloneMenuComponent } from '@ngx-coding-components/schemer-standalone-menu.component';
import { UserRoleType } from '@ngx-coding-components/services/schemer.service';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { CodingScheme } from '@iqbspecs/coding-scheme';
import { VariableCodingData } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import sampleCodings1 from '../../sample-data/coding-scheme-1.json';
import sampleVarList1 from '../../sample-data/var-list-1.json';

@Component({
  selector: 'app-root',
  template: `
    <mat-drawer-container class="coder-body">
      <mat-drawer #drawer mode="over">
        <scheme-checker [codingScheme]="codings1"></scheme-checker>
      </mat-drawer>
      <mat-drawer-content class="drawer-content">
        <div>
          <button mat-icon-button (click)="drawer.toggle()">
            <mat-icon>{{
              drawer.opened ? 'chevron_left' : 'chevron_right'
            }}</mat-icon>
          </button>
        </div>
        <iqb-schemer
          class="drawer-schemer"
          [varList]="varList1"
          [userRole]="userRole"
          [codingScheme]="codings1"
          (codingSchemeChanged)="updateCodingScheme()"
        ></iqb-schemer>
      </mat-drawer-content>
    </mat-drawer-container>
    <schemer-standalone-menu
      [varList]="varList1"
      [userRole]="userRole"
      [codingScheme]="codings1"
      (varListChanged)="setNewVarlist($event)"
      (userRoleChanged)="userRole = $event"
      (codingSchemeChanged)="setNewCodingScheme($event)"
      [style.height.px]="0"
    ></schemer-standalone-menu>
  `,
  styles: [
    `
      :host {
        height: 100%;
        display: block;
      }
      .coder-body {
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        bottom: 0;
        padding: 0;
        margin: 0;
        flex-direction: row;
        justify-content: space-between;
        align-items: stretch;
      }
    `,
    `
      .drawer-button {
        flex: 0 0 40px;
      }
    `,
    `
      .drawer-schemer {
        flex: 1 1 auto;
      }
    `,
    `
      .drawer-content {
        padding: 0;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: stretch;
        overflow: unset;
      }
    `
  ],
  standalone: true,
  imports: [
    TranslateModule,
    MatDrawerContainer,
    MatDrawer,
    SchemeCheckerComponent,
    MatDrawerContent,
    MatIconButton,
    MatIcon,
    SchemerComponent,
    SchemerStandaloneMenuComponent,
    MatTooltipModule
  ]
})
export class AppComponent {
  varList1 = sampleVarList1 as VariableInfo[];
  codings1: CodingScheme | null = sampleCodings1 ?
    new CodingScheme(sampleCodings1.variableCodings) :
    null;

  userRole: UserRoleType = 'RW_MAXIMAL';
  title = 'coding-components';

  updateCodingScheme() {
    console.log(this.codings1);
  }

  setNewVarlist(varList: VariableInfo[] | null) {
    if (varList) {
      this.varList1 = varList;
      const variableCodings: VariableCodingData[] = [];
      this.varList1.forEach(c => {
        variableCodings.push(CodingFactory.createCodingVariable(c.id));
      });
      this.codings1 = new CodingScheme(variableCodings);
    }
  }

  setNewCodingScheme(codings: CodingScheme | null) {
    if (codings) this.codings1 = codings;
  }
}
