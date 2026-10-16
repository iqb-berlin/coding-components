# Angular-21-Migration: Prüfung vom 16.10.2026

**Urteil:** Die bestätigten Migrationsfehler sind im lokalen Prüfstand behoben.
Die unten aufgeführten Laufzeit-, Build- und Vertragstests bestehen. Dies ist
keine Aussage über ein bereits veröffentlichtes Release oder Deployment.

## Vergleich und Umfang

Geprüft wurden der veröffentlichte Schemer 2.8.5, die veröffentlichte
2.9.0-alpha.1, die Angular-21-Migration ab `4569443` sowie der korrigierte Stand
auf `fix-schemer-embedded-start`. Die installierte Anwendung verwendet Angular
21.2.24, Material/CDK 21.2.14 und TypeScript 5.9.3.

Der Quellvergleich und die Suche nach asynchronen Zustandsänderungen umfassten:

- beide `createApplication`-Einstiegspunkte, Custom Elements und Bibliotheks-Peers;
- Verona-Startnachrichten, spätere Aktualisierungen, Rollen und Rückgaben;
- `FileReader`/Dateiimporte und Bildimporte;
- verzögerte Änderungen, Auswahl- und Material-Dialoge sowie Formulare;
- Rich Text, native Editor-Auswahl, Formeldialog und Speichern/Abbrechen;
- Produktionsbuilds, Bibliotheksausgabe, Schemaprüfung und Generatorverträge.

Zoneless ist ab Angular 21 Standard. Ein `zone.js`-Import allein schaltet die
bisherige Änderungserkennung nicht ein. Die erforderlichen Benachrichtigungen
und Testgrenzen sind in der [Angular-Dokumentation](https://angular.dev/guide/zoneless)
beschrieben. Die Bibliothek wurde nicht pauschal auf einen anderen Zustandsstil
umgeschrieben; jeder bestätigte Fehler wurde an seiner betroffenen Grenze behoben.

## Bestätigte Befunde und Korrekturen

| Priorität | Befund | Einordnung und Korrektur |
| --- | --- | --- |
| P1 | Basisvariablen bleiben nach einer gültigen Studio-Startnachricht unsichtbar. | Migrationsregression. `provideZoneChangeDetection()` stellt die vom bestehenden Verona-Wrapper benötigte Änderungserkennung wieder her; siehe `ba6eb63` und den [Einzelbericht](schemer-embedded-start-2026-10-16.md). |
| P2 | Das Bibliotheksmanifest verlangt Angular 21, nennt für die Entwicklung aber Compiler/Builder/ng-packagr 20 und TypeScript 5.8. | Unvollständige Migration. Eine isolierte Auflösung scheiterte mit `ERESOLVE` am Compiler-Peer. Die Entwicklungswerkzeuge sind auf die gleichen Angular-21-/TypeScript-5.9-Bereiche wie im Root-Projekt angehoben. |
| P1 | Esc im Deaktivierungsdialog kann eine Basisvariable einschließlich ihrer Kodierung deaktivieren. | Bereits in 2.8.5 vorhanden, keine Migrationsregression. Nur das ausdrückliche Bestätigungsergebnis `true` darf die Änderung ausführen. |
| P2 | Esc beim Anlegen einer abgeleiteten Variable führt zu einem Zugriff auf `undefined.selfAlias`. Verwandte Dialoge können Abbruchwerte als Daten behandeln. | Ebenfalls in 2.8.5 reproduziert. Die Rückgaben werden ihrem Vertrag entsprechend geprüft. Namen, Anweisungen, Verarbeitung, Array-/Fragmentpositionen und Quellparameter bleiben bei Abbruch erhalten. Gültige Position `0` und bewusst geleerte Anweisungen bleiben zulässig. |

Die beiden Esc-Fälle wurden vor der Korrektur auch mit dem unveränderten
veröffentlichten 2.8.5-HTML ausgeführt und scheiterten dort ebenfalls. Die
Browserprüfung erfasst zusätzlich zu `pageerror` auch Angulars Fehlerausgabe
über `console.error`; ein optisch geschlossener Dialog allein ist kein Erfolg.

## Originaler Studio-Export

Der lokal bereitgestellte Export wurde unverändert gelesen:
`2026-10-16 studio unit download.zip`, SHA-256
`f0b1de89a96e1d2800bb3256468d1f7b7849967f2eab80b2ea4b6dbc2c16c64c`.

Die XML-Datei enthält zwei Integer-Antwortvariablen (`radio_1`, `radio_2`) mit
jeweils vier Antwortwerten und zwei Textelemente vom Typ `no-value`. Die
Originalvariablen wurden lokal als `vosStartCommand` an das gepackte HTML
übergeben. Beide Radio-Variablen sind sichtbar; nach Bearbeitung und Rückgabe
bleiben sämtliche IDs/Aliase erhalten und die Textelemente bleiben
`BASE_NO_VALUE`. Die Aufgabeninhalte oder der mitgelieferte Player wurden nicht
in Testdateien übernommen. Die CI verwendet einen entsprechenden synthetischen
Fall; lokal lässt sich stattdessen die extrahierte Originalvariablenliste angeben.

```sh
STUDIO_VARIABLES_FILE=/absoluter/pfad/variables.json \
SCHEMER_ARTIFACT=/absoluter/pfad/iqb-schemer.html \
npm run test:schemer:responsive
```

## Erfolgreiche lokale Nachweise

| Ebene | Ergebnis |
| --- | --- |
| Bibliothek, vollständige Unit-Suite mit Coverage | **570 Tests bestanden**, vorher 552; Coverage-Grenzen bestanden. |
| Standalone-Schemer, Unit-Suite mit Coverage | **6 Tests bestanden**, Coverage-Grenzen bestanden. |
| Browser am Entwicklungsbuild | **15 Tests bestanden**: acht iframe-/Migrationsfälle und sieben Viewport-/Containerfälle zwischen 320 und 1440 px. |
| Neu gepacktes Produktions-HTML | **8 iframe-Fälle bestanden**, einschließlich Originalvariablen aus dem Studio-Export. |
| Codebook-Generator und Verträge | **1.285 Tests bestanden**; der geänderte UI-Code beeinflusst den Generator nicht. |
| Schemaprüfung und Ajv-/fast-uri-Kompatibilität | **1 + 2 Tests bestanden**. |
| Produktionsbuilds | Bibliothek mit allen Einstiegspunkten, Schemer mit Verpackung und Demo/Elements erfolgreich. |
| Demo/Elements im Browser | Beispielvariablen sichtbar; Dateiimport ersetzt die Liste; native Rich-Text-Auswahl aktualisiert die Format-Schaltfläche; geprüfte Custom-Element-Tags registriert; keine Laufzeitfehler. |
| Lint | Projekt-Lint erfolgreich; bestehende Warnungen bleiben sichtbar. Die geänderten TS-/JS-Dateien werden gesondert ohne Cache geprüft. |

Die acht iframe-Fälle prüfen Start ohne vorbereitenden Klick, spätere
Host-Nachricht und Gastrolle, verzögerte Rückgabe mit Session-ID, Wert-/No-Value-
Variablen, Rich Text mit asynchronem PNG-Import und Formel samt Speichern und
Abbruch, Esc beim Anlegen, Esc beim Deaktivieren sowie die migrierte
Material-Mehrfachauswahl für Quellvariablen.

Für das Bibliotheksmanifest wurde mit **npm 11.18.0** ohne `--force` oder
`--legacy-peer-deps` in einem leeren Verzeichnis aufgelöst: vorher
Compiler-21/Compiler-CLI-20-Konflikt; nachher erfolgreiche Auflösung mit
Angular-21-Werkzeugen und TypeScript 5.9.3. npm 10.9.8 stieß beim neuen Peergraphen
zusätzlich auf einen internen Arborist-Fehler (`edgesOut`); dieser Lauf wird
nicht als erfolgreicher Installationsnachweis ausgewiesen. Die Root-Installation
und deren Lockfile bleiben unverändert.

## Grenzen und verbleibende Freigabe

In den untersuchten Aktualisierungswegen wurde nach den Korrekturen keine
weitere Migrationsregression gefunden. Suchtreffer, Unit-Zahlen und ein grüner
Build allein wurden dabei nicht als Laufzeitnachweis behandelt. Der unveränderte
Demo-/Elements-Startpunkt bestand die genannten Browserfälle; aus der fehlenden
expliziten Zone-Konfiguration dort wurde kein unbewiesener Defekt abgeleitet.

Die Browserprüfung bildet den Studio-iframe-Vertrag lokal nach. Sie bestätigt
keinen Stand auf `iqb-studio.de`, keinen vollständigen HTTP-/Datenbanklauf und
keine neue Microsoft-Word-Abnahme. Die konkrete produktive Aufgabe war für den
Testbrowser ohne Anmeldung nicht erreichbar. Für diesen Prüfstand wurden kein
neues Release, keine entfernte CI und kein Deployment ausgeführt.
