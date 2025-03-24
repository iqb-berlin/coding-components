import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  static saveToFile(fileContent: string, filename: string): void {
    const anchor = document.createElement('a');
    anchor.download = 'export.json';
    anchor.href = window.URL.createObjectURL(new File([fileContent], filename));
    anchor.click();
  }

  static async loadFile(fileTypes: string[] = [], asBase64: boolean = false): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = fileTypes.join(','); // Set allowable file types

      // eslint-disable-next-line consistent-return
      fileInput.addEventListener('change', event => {
        const inputElement = event.target as HTMLInputElement;
        const uploadedFile = inputElement.files?.[0]; // Get the selected file

        if (!uploadedFile) {
          return reject(new Error('No file selected or file is invalid.'));
        }

        const reader = new FileReader();

        // Resolves when file is successfully read
        reader.onload = () => resolve(reader.result as string);

        // Rejects if reading encounters an error
        reader.onerror = () => reject(new Error('Error reading file.'));

        // Read file content as Base64 or plain text
        asBase64 ? reader.readAsDataURL(uploadedFile) : reader.readAsText(uploadedFile);
      });

      // Trigger the file picker
      fileInput.click();
    });
  }

  static loadImage(): Promise<string> {
    return FileService.loadFile(['image/*'], true);
  }
}
