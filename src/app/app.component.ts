import { Component } from '@angular/core';
import {VariableInfo} from "@iqb/responses";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'coding-components';
  sampleVarList: VariableInfo[] = [
      {
          id: "Otto",
          type: "string",
          format: "",
          multiple: false,
          nullable: false,
          values: [],
          valuePositionLabels: [],
          valuesComplete: false,
          page: ""
      },
      {
          id: "Paul",
          type: "string",
          format: "",
          multiple: false,
          nullable: false,
          values: [],
          valuePositionLabels: [],
          valuesComplete: false,
          page: ""
      },
      {
          id: "Susi",
          type: "string",
          format: "",
          multiple: false,
          nullable: false,
          values: [],
          valuePositionLabels: [],
          valuesComplete: false,
          page: ""
      }
  ]
}
