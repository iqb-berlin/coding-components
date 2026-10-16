# Schemer-Alpha: Basisvariablen im eingebetteten Betrieb

## Fehler und Ursache

Das veröffentlichte Schemer-HTML 2.9.0-alpha.1 bleibt nach einer gültigen
`vosStartCommand`-Nachricht auf der Meldung „Es sind keine Basis-Variablen
definiert“. Derselbe synthetische Start mit demselben Browser zeigt in 2.8.5
die übergebene Variable an. Beide HTML-Dateien stammen aus den Releases:

- 2.8.5, SHA-256 `ed9df99492f07bc552b80bc64f5a2360eaaaa79a5dc774a116e4fbf9194997b6`
- 2.9.0-alpha.1, SHA-256 `884e4e7665237eb6492da17599e8d32d9a3600711d672161d8cc8021e3f12ec9`

Seit Angular 21 läuft die Anwendung standardmäßig ohne Zone-basierte
Änderungserkennung. Die bestehende Root-Komponente setzt nach Host-Nachrichten
gewöhnliche Felder in einem Observable-Abonnement. Der Import von `zone.js`
aktiviert die Zone-basierte Änderungserkennung nicht mehr automatisch.
Die erste Anzeige bleibt daher leer, obwohl die Nachricht verarbeitet wird.

Der Standalone-Import einer Variablenliste per Menü hat diesen Fehler verdeckt:
Er löst zusätzlich ein Angular-Template-Ereignis aus. Die bisherigen
Viewport-Tests starteten ausschließlich über dieses Menü.

## Korrektur

Die eingebettete Anwendung aktiviert ihre bisherige Zone-basierte
Änderungserkennung ausdrücklich mit `provideZoneChangeDetection()`.
Das erhält auch das bestehende Verhalten verzögerter Bearbeitungsereignisse,
ohne eine unvollständige Zoneless-Migration einzelner Komponenten einzuführen.
Der Verona-Nachrichtenvertrag und die Aufgaben-/Kodierschemadaten bleiben gleich.

## Regressionstests

`e2e/schemer-embedded.spec.js` bildet einen Studio-Host mit iframe und echtem
`postMessage`-Handshake nach. Die Startnachricht wird verzögert nach der
Ready-Nachricht gesendet; es gibt keinen Klick zum Anstoßen der ersten Anzeige.

Die Tests prüfen:

1. Basisvariablen und ausgewählte Kodierung erscheinen ohne Benutzerinteraktion.
2. Eine weitere Startnachricht ersetzt die Variablen; die Gastrolle sperrt
   Bearbeitungsfelder und Aktionen.
3. Eine bearbeitete Variablenbeschreibung wird nach der Entprellung mit der
   richtigen Session-ID als Kodierschema an den Host zurückgegeben.

Standardlauf einschließlich der bisherigen sieben Viewport-Fälle:

```sh
npm run test:schemer:responsive
```

Prüfung eines gepackten HTML-Artefakts ohne Entwicklungsserver:

```sh
SCHEMER_ARTIFACT=/absoluter/pfad/iqb-schemer.html npm run test:schemer:responsive
```

Der Artefaktmodus führt ausschließlich die iframe-Tests aus und bietet genau
die angegebene Datei als Modul an. Die Browser-Tests bleiben in der bestehenden
GitHub-CI eingebunden.

## Nachweisgrenzen

Lokal erfolgreich: zehn Browser-Tests am Entwicklungsbuild, dieselben drei
iframe-Fälle am neu gepackten Produktions-HTML, sechs Schemer-Unit-Tests,
Produktionsbuild und Lint der geänderten TypeScript-/Browser-Testdateien.

Die beiden ersten neuen iframe-Tests scheitern am veröffentlichten Alpha-HTML
an den fehlenden Basisvariablen und bestehen mit dem lokal korrigierten
Produktionsartefakt. Die zusätzliche Rückgabeprüfung sichert die Bearbeitung ab.
Die betroffene produktive Studio-Aufgabe ist für den Testbrowser nur nach
Anmeldung zugänglich und wurde nicht geöffnet oder verändert. Das Erscheinen
der Variablen mit 2.8.5 an derselben Aufgabe ist zusätzlich vom Nutzer bestätigt.
Die lokale Korrektur veröffentlicht oder ersetzt kein Release und bestätigt
kein Deployment.
