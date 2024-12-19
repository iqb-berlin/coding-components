import { Component, OnDestroy, OnInit } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
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
import { MatDialog } from '@angular/material/dialog';
import {
  SchemerStandaloneMenuComponent
} from '@ngx-coding-components/schemer-standalone-menu.component';
import { UserRoleType } from '@ngx-coding-components/services/schemer.service';
import {
  MessageDialogComponent,
  MessageDialogData, MessageType
} from '@ngx-coding-components/dialogs/message-dialog.component';
import { SchemerComponent } from '@ngx-coding-components/schemer/schemer.component';
import { VeronaAPIService, VosStartCommand } from './verona-api.service';

@Component({
  selector: 'app-root',
  template: `
    <iqb-schemer class="coder-body"
      [varList]="varList"
      [codingScheme]="codings"
      [userRole]="userRole"
      (codingSchemeChanged)="emitCodingSchemeChanged()"
    ></iqb-schemer>
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
      `
  ],
  standalone: true,
  imports: [BrowserAnimationsModule,
    MatIconButton, MatTooltip, MatIcon, SchemerComponent, SchemerStandaloneMenuComponent]
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
        this.varList = message.variables.filter(v => v.type !== 'no-value');
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
          this.codings = new CodingScheme(message.codingScheme);
        } else {
          this.codings = new CodingScheme([]);
        }
        this.varList.forEach(vi => {
          let codingForBaseVariable;
          if (this.codings && this.codings.variableCodings) {
            codingForBaseVariable = this.codings.variableCodings.find(v => v.id === vi.id);
          }
          if (codingForBaseVariable) {
            codingForBaseVariable.alias = vi.alias || vi.id;
          } else if (this.codings) {
            const newBaseVar = CodingFactory.createCodingVariable(vi.id);
            if (vi.alias) newBaseVar.alias = vi.alias;
            this.codings.variableCodings.push(newBaseVar);
          }
        });
        if (message.schemerConfig && message.schemerConfig.role && message.schemerConfig.role !== 'super') {
          this.userRole = ['guest', 'commenter'].includes(message.schemerConfig.role) ? 'RO' : 'RW_MINIMAL';
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
