import {Component, OnDestroy, OnInit} from '@angular/core';
import {VeronaAPIService, VosStartCommand} from "./verona-api.service";
import {Subject, takeUntil} from "rxjs";
import {CodingScheme, VariableCodingData, VariableInfo} from "@iqb/responses";
import {CodingFactory} from "@iqb/responses/coding-factory";

@Component({
  selector: 'app-root',
  template: `
    <mat-drawer-container class="coder-body">
      <mat-drawer #drawer mode="side">
        <schema-checker [codingScheme]="codings"></schema-checker>
      </mat-drawer>
      <mat-drawer-content class="drawer-content">
        <div *ngIf="isStandalone">
          <button mat-icon-button (click)="drawer.toggle()" [matTooltip]="drawer.opened ? 'Check ausblenden' : 'Check einblenden'">
            <mat-icon>{{drawer.opened ? 'chevron_left' : 'chevron_right'}}</mat-icon>
          </button>
        </div>
        <iqb-schemer class="drawer-schemer"
                     [varList]="varList"
                     [codingScheme]="codings"
                     (codingSchemeChanged)="emitCodingSchemeChanged()"
        ></iqb-schemer>
      </mat-drawer-content>
    </mat-drawer-container>
    <schemer-load-save *ngIf="isStandalone"
                       [varList]="varList"
                       [codingScheme]="codings"
                       (varListChanged)="setNewVarlist($event)"
                       (codingSchemeChanged)="setNewCodingScheme($event)"
                       [style.height.px]="0"></schemer-load-save>
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
  ]
})
export class AppComponent implements OnInit, OnDestroy {
  private ngUnsubscribe = new Subject<void>();
  isStandalone: boolean = window === window.parent;
  varList: VariableInfo[] = [];
  codings: CodingScheme | null = null;
  title = 'schemer';
  constructor(
    private veronaAPIService: VeronaAPIService
  ) { }

  ngOnInit(): void {
    this.veronaAPIService.sendVosReadyNotification(this.veronaAPIService.metadata);
    this.veronaAPIService.vosStartCommand
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((message: VosStartCommand) => {
        this.varList = message.variables;
        if (message.codingScheme) {
            const codingScheme = JSON.parse(message.codingScheme);
            this.codings = new CodingScheme(codingScheme.variableCodings || []);
        } else {
          this.codings = new CodingScheme([]);
        }
        this.varList.forEach(vi => {
          let codingForBaseVariable;
          if (this.codings && this.codings.variableCodings) codingForBaseVariable = this.codings.variableCodings.find(v => v.id === vi.id);
          if (!codingForBaseVariable && this.codings) this.codings.variableCodings.push(CodingFactory.createCodingVariableFromVarInfo(vi));
        })
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
        variableCodings.push(CodingFactory.createCodingVariableFromVarInfo(c));
      });
      this.codings = new CodingScheme(variableCodings);
    }
  }

  setNewCodingScheme(codings: CodingScheme | null) {
    if (codings) this.codings = codings;
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
