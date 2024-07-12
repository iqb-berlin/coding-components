import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import {
  CodingScheme,
  CodingSchemeVersionMajor,
  CodingSchemeVersionMinor,
  VariableCodingData,
  VariableInfo
} from '@iqb/responses';
import { CodingFactory } from '@iqb/responses/coding-factory';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIconButton } from '@angular/material/button';
import { MatDrawerContainer, MatDrawer, MatDrawerContent } from '@angular/material/sidenav';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { SchemerComponent } from '../../../ngx-coding-components/src/lib/schemer/schemer.component';
import { SchemeCheckerComponent } from '../../../ngx-coding-components/src/lib/scheme-checker/scheme-checker.component';
import {
  SchemerStandaloneMenuComponent
} from '../../../ngx-coding-components/src/lib/schemer-standalone-menu.component';
import { UserRoleType } from '../../../ngx-coding-components/src/lib/services/schemer.service';
import { VeronaAPIService, VosStartCommand } from './verona-api.service';
import {
  MessageDialogComponent,
  MessageDialogData, MessageType
} from "../../../ngx-coding-components/src/lib/dialogs/message-dialog.component";

@Component({
  selector: 'app-root',
  template: `
    <mat-drawer-container class="coder-body">
      <mat-drawer #drawer mode="side">
        <scheme-checker [codingScheme]="codings"></scheme-checker>
      </mat-drawer>
      <mat-drawer-content class="drawer-content">
        @if (isStandalone) {
          <div>
            <button mat-icon-button (click)="drawer.toggle()"
                    [matTooltip]="drawer.opened ? 'Check ausblenden' : 'Check einblenden'">
              <mat-icon>{{drawer.opened ? 'chevron_left' : 'chevron_right'}}</mat-icon>
            </button>
          </div>
        }
        <iqb-schemer class="drawer-schemer"
          [varList]="varList"
          [codingScheme]="codings"
          [userRole]="userRole"
          (codingSchemeChanged)="emitCodingSchemeChanged()"
        ></iqb-schemer>
      </mat-drawer-content>
    </mat-drawer-container>
    @if (isStandalone) {
      <schemer-standalone-menu
        [varList]="varList"
        [userRole]="userRole"
        [codingScheme]="codings"
        (userRoleChanged)="setUserRole($event)"
        (varListChanged)="setNewVarlist($event)"
        (codingSchemeChanged)="setNewCodingScheme($event)"
      [style.height.px]="0"></schemer-standalone-menu>
    }
    `,
  styles: [
    `
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
  imports: [NoopAnimationsModule, MatDrawerContainer, MatDrawer, SchemeCheckerComponent,
    MatDrawerContent, MatIconButton, MatTooltip, MatIcon, SchemerComponent, SchemerStandaloneMenuComponent]
})
export class AppComponent implements OnInit, OnDestroy {
  private ngUnsubscribe = new Subject<void>();
  isStandalone: boolean = window === window.parent;
  varList: VariableInfo[] = [];
  codings: CodingScheme | null = null;
  userRole: UserRoleType = 'RW_MAXIMAL';
  title = 'schemer';
  constructor(
    private veronaAPIService: VeronaAPIService,
    private messageDialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.veronaAPIService.sendVosReadyNotification(this.veronaAPIService.metadata);
    this.veronaAPIService.vosStartCommand
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((message: VosStartCommand) => {
        this.varList = message.variables;
        if (message.codingScheme) {
          const compareVersionResult = CodingScheme.checkVersion(message.codingScheme);
          if (compareVersionResult !== 'OK') {
            let messageText;
            if (compareVersionResult === 'MINOR_GREATER') {
              messageText = 'Größere Nebenversion';
            } else if (compareVersionResult === 'MAJOR_GREATER') {
              messageText = 'Größere Hauptversion';
            } else {
              messageText = 'Geringere Hauptversion';
            }
            this.messageDialog.open(MessageDialogComponent, {
              width: '400px',
              data: <MessageDialogData>{
                title: 'Achtung: Abweichende Daten-Version',
                content: `Sie haben eine abweichende Daten-Version des Kodierschemas geladen: ${messageText}.
                Nach dem Speichern ist das Schema auf die Version
                ${CodingSchemeVersionMajor}.${CodingSchemeVersionMinor} geändert.`,
                type: MessageType.warning
              }
            });
          }
          const codingScheme = JSON.parse(message.codingScheme);
          this.codings = new CodingScheme(codingScheme.variableCodings || []);
        } else {
          this.codings = new CodingScheme([]);
        }
        this.varList.forEach(vi => {
          let codingForBaseVariable;
          if (this.codings && this.codings.variableCodings) {
            codingForBaseVariable = this.codings.variableCodings.find(v => v.id === vi.id);
          }
          if (!codingForBaseVariable && this.codings) {
            this.codings.variableCodings.push(CodingFactory.createCodingVariable(vi.id));
          }
        });
        if (message.schemerConfig && message.schemerConfig.role && message.schemerConfig.role !== 'super') {
          this.userRole = ['guest', 'commentator'].includes(message.schemerConfig.role) ? 'RO' : 'RW_MINIMAL';
        }
      });
  }

  emitCodingSchemeChanged() {
    this.veronaAPIService.sendVosSchemeChangedNotification(this.codings);
  }

  setNewVarlist(varList: VariableInfo[] | null) {
    if (varList) {
      this.varList = varList;
      const variableCodings: VariableCodingData[] = [];
      this.varList.forEach(c => {
        variableCodings.push(CodingFactory.createCodingVariable(c.id));
      });
      this.codings = new CodingScheme(variableCodings);
    }
  }

  setNewCodingScheme(codings: CodingScheme | null) {
    if (codings) this.codings = codings;
  }

  setUserRole(newRole: UserRoleType) {
    this.userRole = newRole;
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
