import { Component } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import {CodeDirective} from "../code.directive";

@Component({
  selector: 'code-manual',
  templateUrl: './code-manual.component.html',
  styleUrls: ['./code-manual.component.scss']
})
export class CodeManualComponent extends CodeDirective {
  constructor(
    private sanitizer: DomSanitizer,
    public translateService: TranslateService,
    public editTextDialog: MatDialog
  ) {
    super();
  }

  getSanitizedText(text: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(text);
  }
}
