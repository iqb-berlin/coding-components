import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose
} from '@angular/material/dialog';
import { CodingScheme, VariableGraphNode } from '@iqb/responses';
import { TranslateModule } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { KeyValuePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import {VariableAliasPipe} from "@ngx-coding-components/pipes/variable-alias.pipe";

@Component({
  template: `
    <h1 mat-dialog-title>{{'varlist.derived-tree.title' | translate}}</h1>

    <mat-dialog-content>
      @if (errorMessage) {
        <div>{{errorMessage | translate}}</div>
      }
      @for (vn of varNodeRows | keyvalue; track vn) {
          <div class="fx-row-start-center fx-gap-15 var-row">
          <div class="fx-column-start-start">
            @if (vn.value.length > 0) {
              @for (vSource of vn.value; track vSource) {
                <div>{{vSource | varAlias}}</div>
              }
            } @else {
              <div>{{'varlist.derived-tree.no-sources' | translate}}</div>
            }
          </div>
          @if (vn.value.length > 0) {
            <div><mat-icon>chevron_right</mat-icon></div>
          }
          <div>{{vn.key | varAlias}}</div>
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary"  [mat-dialog-close]="false">{{'dialog-close' | translate}}</button>
    </mat-dialog-actions>
    `,
  styles: [
    '.var-row:nth-child(even) {background-color: #f1f1f1;}'
  ],
  standalone: true,
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatButton,
    MatDialogClose, TranslateModule, KeyValuePipe, MatIcon, VariableAliasPipe]
})
export class ShowDependencyTreeDialogComponent {
  varNodeRows: ReadonlyMap<string, string[]> = new Map([]);
  errorMessage = '';

  constructor(@Inject(MAT_DIALOG_DATA) public codingScheme: CodingScheme) {
    const newVarNodeRows = new Map<string, string[]>();
    let varNodes: VariableGraphNode[];
    try {
      varNodes = codingScheme.getVariableDependencyTree();
      this.errorMessage = '';
    } catch {
      varNodes = [];
      this.errorMessage = 'varlist.derived-tree.error';
    }
    if (!this.errorMessage) {
      const maxLevel = Math.max(...varNodes.map(n => n.level));
      for (let i = maxLevel; i > 0; i--) {
        varNodes.filter(n => n.level === i).forEach(n => {
          newVarNodeRows.set(n.id,
            varNodes.filter(sn => n.sources.includes(sn.id))
              .map(cn => cn.id));
        });
      }
      this.varNodeRows = newVarNodeRows;
    }
  }
}
