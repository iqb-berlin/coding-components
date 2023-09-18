import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  static saveToFile(unitJSON: string, fileName: string): void {
    const anchor = document.createElement('a');
    anchor.download = fileName;
    anchor.href = window.URL.createObjectURL(new File([unitJSON], fileName));
    anchor.click();
  }

  static async loadFile(fileTypes: string[] = []): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const fileUploadElement = document.createElement('input');
      fileUploadElement.type = 'file';
      fileUploadElement.accept = fileTypes.toString();
      fileUploadElement.addEventListener('change', event => {
        const uploadedFile = (event.target as HTMLInputElement).files?.[0];
        const reader = new FileReader();
        reader.onload = loadEvent => resolve(loadEvent.target?.result as string);
        reader.onerror = errorEvent => reject(errorEvent);
        if (uploadedFile) {
          reader.readAsText(uploadedFile);
        }
      });
      fileUploadElement.click();
    });
  }
}
