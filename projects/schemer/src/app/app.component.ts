import {
  Component, OnDestroy, OnInit, signal
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

import { CodingFactory } from '@iqb/responses/coding-factory';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import {
  SchemerStandaloneMenuComponent
} from '@ngx-coding-components/schemer-standalone-menu.component';
import { UserRoleType } from '@ngx-coding-components/services/schemer.service';
import {
  MessageDialogComponent,
  MessageDialogData, MessageType
} from '@ngx-coding-components/dialogs/message-dialog.component';
import { SchemerComponent } from '@ngx-coding-components/schemer/schemer.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { CodingScheme, CodingSchemeVersionMajor, CodingSchemeVersionMinor } from '@iqbspecs/coding-scheme';
import { VariableCodingData } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { VeronaAPIService, VosStartCommand } from './verona-api.service';

@Component({
  selector: 'app-root',
  template: `
    <iqb-schemer class="coder-body"
                 [class.standalone]="isStandalone"
                 [varList]="varList()"
                 [codingScheme]="codings()"
                 [userRole]="userRole()"
                 (codingSchemeChanged)="emitCodingSchemeChanged()"
    ></iqb-schemer>
    @if (isStandalone) {
      <schemer-standalone-menu
        [varList]="varList()"
        [userRole]="userRole()"
        [codingScheme]="codings()"
        (userRoleChanged)="setUserRole($event)"
        (varListChanged)="setNewVarlist($event)"
        (codingSchemeChanged)="setNewCodingScheme($event)"
        [style.height.px]="0"></schemer-standalone-menu>
    }
  `,
  styles: [
    `
      .coder-body {
        box-sizing: border-box;
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

      .coder-body.standalone {
        padding-top: 64px;
      }
    `
  ],
  standalone: true,
  imports: [SchemerComponent, SchemerStandaloneMenuComponent, MatTooltipModule]
})
export class AppComponent implements OnInit, OnDestroy {
  private ngUnsubscribe = new Subject<void>();
  isStandalone: boolean = window === window.parent;
  readonly varList = signal<VariableInfo[]>([]);
  readonly codings = signal<CodingScheme | null>(null);
  readonly userRole = signal<UserRoleType>('RW_MAXIMAL');
  title = 'schemer';
  constructor(
    private veronaAPIService: VeronaAPIService,
    private messageDialog: MatDialog,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.veronaAPIService.sendVosReadyNotification(this.veronaAPIService.metadata);
    this.veronaAPIService.vosStartCommand
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((message: VosStartCommand) => {
        const variables = message.variables || [];
        this.varList.set(variables);
        let codings: CodingScheme;
        if (message.codingScheme) {
          const compareVersionResult = CodingScheme.checkVersion(message.codingScheme);
          if (compareVersionResult !== 'OK') {
            let messageTextKey = 'schemer.version-mismatch.major-less';
            if (compareVersionResult === 'MINOR_GREATER') {
              messageTextKey = 'schemer.version-mismatch.minor-greater';
            } else if (compareVersionResult === 'MAJOR_GREATER') {
              messageTextKey = 'schemer.version-mismatch.major-greater';
            }
            this.messageDialog.open(MessageDialogComponent, {
              width: '400px',
              data: <MessageDialogData>{
                title: this.translate.instant('schemer.version-mismatch.title'),
                content: this.translate.instant('schemer.version-mismatch.content', {
                  mismatch: this.translate.instant(messageTextKey),
                  major: CodingSchemeVersionMajor,
                  minor: CodingSchemeVersionMinor
                }),
                closeButtonLabel: this.translate.instant('close'),
                type: MessageType.warning
              }
            });
          }
          codings = new CodingScheme(message.codingScheme);
          this.codings.set(codings);
          if (compareVersionResult !== 'OK') {
            this.emitCodingSchemeChanged();
          }
        } else {
          codings = new CodingScheme([]);
          this.codings.set(codings);
        }
        variables.forEach(vi => {
          let codingForBaseVariable;
          if (codings.variableCodings) {
            codingForBaseVariable = codings.variableCodings.find(v => v.id === vi.id);
          }
          if (codingForBaseVariable) {
            codingForBaseVariable.alias = vi.alias || vi.id;
          } else if (vi.type === 'no-value') {
            const newNoValueBaseVar = CodingFactory.createBaseCodingVariable(vi.id, 'BASE_NO_VALUE');
            if (vi.alias) newNoValueBaseVar.alias = vi.alias;
            codings.variableCodings.push(newNoValueBaseVar);
          } else {
            const newBaseVar = CodingFactory.createCodingVariable(vi.id);
            if (vi.alias) newBaseVar.alias = vi.alias;
            codings.variableCodings.push(newBaseVar);
          }
        });
        const role = message.schemerConfig?.role;
        if (role) {
          let userRole: UserRoleType = 'RW_MAXIMAL';
          if (role !== 'super') {
            userRole = ['guest', 'commenter'].includes(role) ? 'RO' : 'RW_MINIMAL';
          }
          this.userRole.set(userRole);
        }
      });
  }

  emitCodingSchemeChanged() {
    this.veronaAPIService.sendVosSchemeChangedNotification(this.codings());
  }

  setNewVarlist(varList: VariableInfo[] | null) {
    if (varList) {
      this.varList.set(varList);
      const variableCodings: VariableCodingData[] = [];
      varList.forEach(c => {
        variableCodings.push(CodingFactory.createCodingVariable(c.id));
      });
      this.codings.set(new CodingScheme(variableCodings));
    }
  }

  setNewCodingScheme(codings: CodingScheme | null) {
    if (codings) this.codings.set(codings);
  }

  setUserRole(newRole: UserRoleType) {
    this.userRole.set(newRole);
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
