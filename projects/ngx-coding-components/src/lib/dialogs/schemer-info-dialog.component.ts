import { Component } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { CodingSchemeVersionMajor, CodingSchemeVersionMinor } from '@iqbspecs/coding-scheme';

@Component({
  selector: 'iqb-schemer-info-dialog',
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon class="title-icon">info</mat-icon>
      <span>{{ 'schemer.info.title' | translate }}</span>
    </h2>
    <mat-dialog-content class="dialog-content">
      <div class="info-container">
        <p class="intro-text">{{ 'schemer.info.intro' | translate }}</p>

        <div class="feature-overview">
          <div class="feature-card">
            <mat-icon class="feature-icon">input</mat-icon>
            <div class="feature-content">
              <span class="feature-title">{{ 'schemer.info.feature-base-title' | translate }}</span>
              <span class="feature-description">{{ 'schemer.info.feature-base-desc' | translate }}</span>
            </div>
          </div>

          <div class="feature-card">
            <mat-icon class="feature-icon">account_tree</mat-icon>
            <div class="feature-content">
              <span class="feature-title">{{ 'schemer.info.feature-derived-title' | translate }}</span>
              <span class="feature-description">{{ 'schemer.info.feature-derived-desc' | translate }}</span>
            </div>
          </div>
        </div>

        <div class="version-badge">
          <mat-icon>workspace_premium</mat-icon>
          <span>{{ 'schemer.info.version-text' | translate: { major: majorVersion, minor: minorVersion } }}</span>
        </div>

        <div class="compatibility-note">
          <mat-icon>history</mat-icon>
          <div class="note-text">
            <strong>Hinweis zur Kompatibilität:</strong>
            <p>{{ 'schemer.info.compatibility-hint' | translate: { major: majorVersion, minor: minorVersion } }}</p>
          </div>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button color="primary" mat-dialog-close>{{ 'close' | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      padding: 20px 24px;
      color: #1976d2;
      background: #f0f7ff;
      border-bottom: 1px solid #e0eefd;
    }

    .title-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      line-height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dialog-content {
      padding: 24px !important;
      margin: 0;
    }

    .info-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .intro-text {
      margin: 0;
      font-size: 16px;
      color: #333;
      line-height: 1.5;
    }

    .feature-overview {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .feature-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: #fafafa;
      border: 1px solid #eee;
      border-radius: 12px;
    }

    .feature-icon {
      color: #1976d2;
      background: #e3f2fd;
      padding: 10px;
      border-radius: 10px;
      font-size: 24px;
      width: 24px;
      min-width: 24px;
      height: 24px;
      box-sizing: content-box;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .feature-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .feature-title {
      font-weight: 600;
      color: #222;
      font-size: 14px;
    }

    .feature-description {
      color: #666;
      font-size: 13px;
      line-height: 1.4;
    }

    .version-badge {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: #e8f5e9;
      color: #2e7d32;
      border-radius: 12px;
      font-weight: 500;
      font-size: 14px;
    }

    .version-badge mat-icon {
      color: #2e7d32;
      width: 24px;
      min-width: 24px;
      height: 24px;
      font-size: 24px;
      flex-shrink: 0;
    }

    .compatibility-note {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 16px;
      background: #fff8e1;
      border-radius: 12px;
      border-left: 4px solid #ffb300;
    }

    .compatibility-note mat-icon {
      color: #f57f17;
      width: 24px;
      min-width: 24px;
      height: 24px;
      font-size: 24px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .note-text {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .note-text strong {
      font-size: 14px;
      color: #333;
    }

    .note-text p {
      margin: 0;
      font-size: 13px;
      color: #555;
      line-height: 1.5;
    }

    mat-dialog-actions {
      padding: 12px 24px 20px !important;
    }

    @media (max-width: 600px) {
      .feature-overview {
        grid-template-columns: 1fr;
      }
    }
  `],
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, TranslateModule]
})
export class SchemerInfoDialogComponent {
  majorVersion = CodingSchemeVersionMajor;
  minorVersion = CodingSchemeVersionMinor;
}
