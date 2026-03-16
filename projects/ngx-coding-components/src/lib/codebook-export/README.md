# Codebook Export Component

The codebook export component provides a comprehensive UI for generating and exporting codebooks from coding schemes. It supports both JSON and DOCX export formats with extensive configuration options.

## Features

- **Unit Selection**: Select specific units to include in the codebook
- **Content Filtering**: Configure which variables and codes to include
- **Missings Profiles**: Select from available missings profiles
- **Export Formats**: Export as JSON or DOCX
- **Search & Filter**: Quickly find units with built-in search
- **Background Jobs**: Optional async export with progress and downloads

## Installation

The component is part of `@iqb/ngx-coding-components`. Make sure you have the required peer dependencies installed:

```bash
npm install docx cheerio @iqbspecs/coding-scheme @iqbspecs/variable-info
```

## Usage

### Basic Example

```typescript
import { Component } from '@angular/core';
import { CodebookExportComponent, CodebookExportConfig, UnitSelectionItem, MissingsProfile } from '@iqb/ngx-coding-components';

@Component({
  selector: 'app-my-component',
  template: `
    <ngx-codebook-export
      [availableUnits]="units"
      [missingsProfiles]="profiles"
      [isLoading]="loading"
      (export)="handleExport($event)"
      (cancel)="handleCancel()">
    </ngx-codebook-export>
  `,
  standalone: true,
  imports: [CodebookExportComponent]
})
export class MyComponent {
  units: UnitSelectionItem[] = [
    { unitId: 1, unitName: 'Unit 1.vocs', unitAlias: null },
    { unitId: 2, unitName: 'Unit 2.vocs', unitAlias: null }
  ];

  profiles: MissingsProfile[] = [
    { id: 0, label: 'None' },
    { id: 1, label: 'Standard Missings' }
  ];

  loading = false;

  handleExport(config: CodebookExportConfig) {
    console.log('Export config:', config);
    // Use CodebookGenerator to generate the codebook
    // Then download the file
  }

  handleCancel() {
    console.log('Export cancelled');
  }
}
```

### Provider-Based Example (recommended)

Use a provider so the component can load data, manage export jobs, and download files.

```typescript
import { Injectable, Component } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  CodebookExportComponent,
  CodebookExportProvider,
  CodebookExportExecution,
  CodebookExportConfig,
  UnitSelectionItem,
  MissingsProfile,
  CODEBOOK_EXPORT_PROVIDER
} from '@iqb/ngx-coding-components';

@Injectable()
export class MyCodebookProvider implements CodebookExportProvider {
  loadUnits(): Observable<UnitSelectionItem[]> {
    return this.backend.loadUnits();
  }

  loadMissingsProfiles(): Observable<MissingsProfile[]> {
    return this.backend.loadMissingsProfiles();
  }

  startExport(config: CodebookExportConfig): Observable<CodebookExportExecution> {
    return this.backend.exportCodebook(config).pipe(
      map(blob => ({
        type: 'direct',
        blob,
        fileName: `codebook_${Date.now()}.${config.contentOptions.exportFormat}`
      }))
    );
  }
}

@Component({
  selector: 'app-my-component',
  template: `<ngx-codebook-export></ngx-codebook-export>`,
  standalone: true,
  imports: [CodebookExportComponent],
  providers: [{ provide: CODEBOOK_EXPORT_PROVIDER, useClass: MyCodebookProvider }]
})
export class MyComponent {}
```

### Provider-Based Example (job + polling)

```typescript
class MyCodebookProvider implements CodebookExportProvider {
  startExport(config: CodebookExportConfig): Observable<CodebookExportExecution> {
    return this.backend.startCodebookJob(config).pipe(
      map(response => ({ type: 'job', jobId: response.jobId }))
    );
  }

  getJobStatus(jobId: string): Observable<CodebookExportJobStatus> {
    return this.backend.getCodebookJobStatus(jobId);
  }

  download(jobId: string): Observable<Blob> {
    return this.backend.downloadCodebook(jobId);
  }
}
```

### With Dialog

```typescript
import { MatDialog } from '@angular/material/dialog';
import { CodebookExportComponent } from '@iqb/ngx-coding-components';

export class MyComponent {
  constructor(private dialog: MatDialog) {}

  openCodebookExport() {
    const dialogRef = this.dialog.open(CodebookExportComponent, {
      width: '90vw',
      maxWidth: '1200px',
      height: '90vh',
      data: {
        availableUnits: this.units,
        missingsProfiles: this.profiles
      }
    });

    dialogRef.componentInstance.export.subscribe(config => {
      this.generateCodebook(config);
      dialogRef.close();
    });
  }
}
```

### Generating Codebooks

Use the `CodebookGenerator` class to generate codebooks from the export configuration:

```typescript
import { CodebookGenerator, CodebookExportConfig, UnitPropertiesForCodebook } from '@iqb/ngx-coding-components';

class MyComponent {
  async generateCodebook(config: CodebookExportConfig) {
    // Fetch unit data with schemes
    const units: UnitPropertiesForCodebook[] = await this.fetchUnits(config.selectedUnits);
    
    // Fetch missings
    const missings = await this.fetchMissings(config.missingsProfileId);

    // Generate codebook
    const buffer = await CodebookGenerator.generateCodebook(
      units,
      config.contentOptions,
      missings
    );

    // Download the file
    this.downloadFile(buffer, config.contentOptions.exportFormat);
  }

  private downloadFile(buffer: Buffer, format: string) {
    const blob = new Blob([buffer], { 
      type: format === 'docx' 
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/json'
    });
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codebook_${Date.now()}.${format}`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
```

## API

### Component Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `availableUnits` | `UnitSelectionItem[]` | `[]` | List of units available for selection |
| `missingsProfiles` | `MissingsProfile[]` | `[{ id: 0, label: 'None' }]` | Available missings profiles |
| `isLoading` | `boolean` | `false` | Loading state for units |
| `workspaceChanges` | `boolean` | `false` | Whether workspace has unsaved changes |
| `defaultContentOptions` | `Partial<CodeBookContentSetting>` | - | Default content options |
| `provider` | `CodebookExportProvider` | - | Optional provider for loading data and running exports |

### Component Outputs

| Output | Type | Description |
|--------|------|-------------|
| `export` | `EventEmitter<CodebookExportConfig>` | Emitted when export is triggered and no provider is configured |
| `cancel` | `EventEmitter<void>` | Emitted when component is cancelled |

### Interfaces

#### `CodebookExportConfig`

```typescript
interface CodebookExportConfig {
  selectedUnits: number[];
  contentOptions: CodeBookContentSetting;
  missingsProfileId: number;
}
```

#### `CodebookExportProvider`

```typescript
interface CodebookExportProvider {
  loadUnits?(): Observable<UnitSelectionItem[]>;
  loadMissingsProfiles?(): Observable<MissingsProfile[]>;
  startExport(config: CodebookExportConfig): Observable<CodebookExportExecution>;
  getJobStatus?(jobId: string): Observable<CodebookExportJobStatus>;
  download?(jobId: string): Observable<Blob>;
}
```

#### `CodebookExportExecution`

```typescript
type CodebookExportExecution =
  | { type: 'direct'; blob: Blob; fileName?: string; mimeType?: string }
  | { type: 'job'; jobId: string };
```

#### `CodebookExportJobStatus`

```typescript
interface CodebookExportJobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  fileName?: string;
  exportFormat?: string;
}
```

#### `CodeBookContentSetting`

```typescript
interface CodeBookContentSetting {
  exportFormat: string;              // 'json' or 'docx'
  missingsProfile: string;
  hasOnlyManualCoding: boolean;      // Include only manual coding
  hasGeneralInstructions: boolean;   // Include general instructions
  hasDerivedVars: boolean;           // Include derived variables
  hasOnlyVarsWithCodes: boolean;     // Include only variables with codes
  hasClosedVars: boolean;            // Include closed variables
  codeLabelToUpper: boolean;         // Convert code labels to uppercase
  showScore: boolean;                // Show scores
  hideItemVarRelation: boolean;      // Hide item-variable relation
}
```

#### `UnitSelectionItem`

```typescript
interface UnitSelectionItem {
  unitId: number;
  unitName: string;
  unitAlias: string | null;
}
```

#### `MissingsProfile`

```typescript
interface MissingsProfile {
  id: number;
  label: string;
  missings?: Missing[] | string;
}
```

## Content Options

The component provides extensive configuration for codebook content:

- **Only Manual Coding**: Include only manually coded variables
- **General Instructions**: Include general coding instructions
- **Derived Variables**: Include derived (calculated) variables
- **Only Variables with Codes**: Exclude variables without code definitions
- **Closed Variables**: Include closed (auto-coded) variables
- **Code Labels to Upper**: Convert all code labels to uppercase
- **Show Score**: Display score values for codes
- **Hide Item-Variable Relation**: Hide the relationship between items and variables

## Styling

The component uses Angular Material theming. You can customize the appearance by overriding the component's CSS classes or by providing custom Material theme colors.

## Translation

The component uses `@ngx-translate/core` for internationalization. Make sure to provide translations for the following keys:

- `workspace.export-coding-book`
- `coding.select-units`
- `coding.select-all-units`
- `search`
- `search-units`
- `loading-units`
- `coding.unit-name`
- `no-units-matching`
- `no-units-available`
- `coding.codebook-content`
- `coding.has-only-vars-with-codes`
- `coding.has-general-instructions`
- `coding.hide-item-var-relation`
- `coding.has-derived-vars`
- `coding.has-only-manual-coding`
- `coding.has-closed-vars`
- `coding.show-score`
- `coding.code-label-to-upper`
- `coding.codebook-generating`
- `coding.codebook-completed`
- `workspace.coding-missing-profiles`
- `workspace.select-missings-profile`
- `coding.export-format`
- `coding.error-save-changes`
- `export`
- `close`

And their corresponding tooltips (prefix with `coding.tooltip.`).
