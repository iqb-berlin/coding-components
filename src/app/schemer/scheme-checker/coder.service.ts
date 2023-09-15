import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CoderService {
  coders: { [key in string]: any } = {};

  addCoder(coderFileName: string) {
    import(/* webpackIgnore: true */`./assets/${coderFileName}`).then(module => {
      this.coders['iqb@1.1'] = module;
    });
  }
}
