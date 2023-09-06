import { Component } from '@angular/core';
import {Response} from "@iqb/responses";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'coding-components';
  sampleData: Response[] = [
      {
        id: "Otto",
        status: "UNSET",
        value: 2
      },
      {
          id: "Paul",
          status: "UNSET",
          value: 5
      },
      {
          id: "Susi",
          status: "UNSET",
          value: 7
      }
  ]
}
