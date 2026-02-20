import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { provideZonelessChangeDetection, NgModule } from '@angular/core';

@NgModule({
  imports: [BrowserDynamicTestingModule],
  providers: [provideZonelessChangeDetection()]
})
class ZonelessTestingModule {}

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  ZonelessTestingModule,
  platformBrowserDynamicTesting()
);
