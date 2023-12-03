import {Component} from '@angular/core';
import {CodingScheme, VariableCodingData, VariableInfo} from "@iqb/responses";
import sampleVarList1 from '../../sample-data/var-list-1.json';
import sampleCodings1 from '../../sample-data/coding-scheme-1.json';
import {CodingFactory} from "@iqb/responses/coding-factory";

@Component({
  selector: 'app-root',
  template: `
      <mat-drawer-container class="coder-body">
        <mat-drawer #drawer mode="side">
            <schema-checker [codingScheme]="codings1"></schema-checker>
        </mat-drawer>
        <mat-drawer-content class="drawer-content">
          <div>
            <button mat-icon-button (click)="drawer.toggle()" [matTooltip]="drawer.opened ? 'Check ausblenden' : 'Check einblenden'">
              <mat-icon>{{drawer.opened ? 'chevron_left' : 'chevron_right'}}</mat-icon>
            </button>
          </div>
          <iqb-schemer class="drawer-schemer"
                  [varList]="varList1"
                  [codingScheme]="codings1"
          ></iqb-schemer>
        </mat-drawer-content>
      </mat-drawer-container>
      <schemer-load-save
        [varList]="varList1"
        [codingScheme]="codings1"
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
  ]
})
export class AppComponent {
  varList1 = sampleVarList1 as VariableInfo[];
  codings1 = new CodingScheme(sampleCodings1 as VariableCodingData[]);
  title = 'coding-components';

  setNewVarlist(varList: VariableInfo[] | null) {
    if (varList) {
      this.varList1 = varList;
      const variableCodings: VariableCodingData[] = [];
      this.varList1.forEach(c => {
        variableCodings.push(CodingFactory.createCodingVariableFromVarInfo(c));
      });
      this.codings1 = new CodingScheme(variableCodings);
    }
  }

  setNewCodingScheme(codings: CodingScheme | null) {
    if (codings) this.codings1 = codings;
  }
}
