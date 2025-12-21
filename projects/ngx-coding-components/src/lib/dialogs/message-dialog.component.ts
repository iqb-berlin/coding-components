import {
  MAT_DIALOG_DATA, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose
} from '@angular/material/dialog';
import { Component, OnInit, Inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslateService } from '@ngx-translate/core';

export enum MessageType {
  error,
  warning,
  info
}

@Component({
  template: `
    <h1 mat-dialog-title>
      @if (messageData.type === 0) {
        <mat-icon>error</mat-icon>
      }
      @if (messageData.type === 1) {
        <mat-icon>warning</mat-icon>
      }
      @if (messageData.type === 2) {
        <mat-icon>info</mat-icon>
      }
      {{ messageData.title }}
    </h1>
    <mat-dialog-content>
      {{ messageData.content }}
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-raised-button [mat-dialog-close]="false">{{ messageData.closeButtonLabel }}</button>
    </mat-dialog-actions>
    `,
  styles: ['mat-dialog-content { padding-bottom: 30px;}'],
  standalone: true,
  imports: [MatDialogTitle, MatIcon, MatDialogContent, MatDialogActions, MatButton, MatDialogClose]
})
export class MessageDialogComponent implements OnInit {
  constructor(
    @Inject(MAT_DIALOG_DATA) public messageData: MessageDialogData,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.messageData.title = this.messageData.title?.trim() || this.getDefaultTitle(this.messageData.type);
    this.messageData.closeButtonLabel = this.messageData.closeButtonLabel?.trim() || this.translate.instant('close');
  }

  // eslint-disable-next-line class-methods-use-this
  private getDefaultTitle(type: MessageType): string {
    switch (type) {
      case MessageType.error:
        return this.translate.instant('message-dialog.default-title.error');
      case MessageType.warning:
        return this.translate.instant('message-dialog.default-title.warning');
      default:
        return this.translate.instant('message-dialog.default-title.info');
    }
  }
}

export interface MessageDialogData {
  type: MessageType;
  title: string;
  content: string;
  closeButtonLabel: string;
}
