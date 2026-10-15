# Codebook: Abnahme in Windows-Desktop-Word am 15.10.2026

**Bestanden für den unten bezeichneten Paketstand und die 16 synthetischen
Prüfdokumente.** Die Dokumente wurden in installiertem Windows-Desktop-Word
regulär und schreibgeschützt geöffnet, geprüft und durch Word als PDF exportiert.
Alle 32 PDF-Seiten wurden gerastert und vollständig visuell geprüft.
Es handelt sich um einen zusätzlichen Desktop-Word-Nachweis zur bisherigen
Generator-, Installations- und Anwendungsprüfung.

## Umgebung und Herkunft

- Microsoft Office LTSC Professional Plus 2024, Word Version 2408,
  Build **16.0.17932.21000**, 64 Bit; Edition und vollständiger Build in Word geprüft.
- Aktueller gemeinsamer 4.1.0-Tarball in beiden Hosts, SHA256
  `2df79a7b18196d7c25d7e02e15d5b148200d75ba2a315214ccfb8386536dd0a6`.
- 14 Exporte aus dem letzten Installationsvergleich: je sieben aus den echten
  Studio- und Kodierbox-Anwendungsadaptern mit Datenquellen im Speicher.
- Zwei unveränderte Rich-Text-Dokumente der unabhängigen alten Studio-Referenz
  `2504265721a59c7c65425072951ce82ab16f0fb8`, mit und ohne Scores.
  Diese Referenzen wurden nicht durch den gemeinsamen Generator neu erzeugt.
- Ausschließlich künstliche Daten; keine Dateien aus den bereitgestellten
  Aufgabenarchiven als feste Referenzen verwendet.

Getestete Quellstände, Dokument-/PDF-Prüfsummen und Seitenbild-Prüfsummen stehen
im [maschinenlesbaren Bericht](codebook-word-windows-2026-10-15.json).

## Fälle und Ergebnisse

| Fall | Dokumente | Seiten je Dokument | Ergebnis |
| --- | ---: | ---: | --- |
| Filter, Aliase, Items, Missing 0, Code/Score 0, Ableitungen | 2 | 3 | bestanden |
| Rich Text, Regeltexte, Listen, Bilder und Formeln ohne Scores | 2 | 3 | bestanden |
| Dieselben Inhalte mit Scores | 2 | 3 | bestanden |
| Defekte und gültige Inlinebilder in Codeinstruktion, ohne/mit Scores | 4 | 1 | bestanden |
| Defekte und gültige Inlinebilder in allgemeiner Instruktion, ohne/mit Scores | 4 | 1 | bestanden |
| Alte Studio-Rich-Text-Referenzen ohne/mit Scores | 2 | 3 | bestanden |

Word bestätigt Tabellenzahl, Spaltenzahl, ungeteilte Tabellenzeilen, Überschriften,
Inlinebilder, native Gleichungen und aktualisierte PAGE-/NUMPAGES-Felder.
Text vor und nach defekten Bildern sowie nachfolgende gültige Bilder und Formeln
bleiben erhalten. Der sichtbare Fehlertext für die absichtlich defekten Bilder
ist erwartet. Alle DOCX-Quellprüfsummen bleiben unverändert; es wurde weder
OpenAndRepair verwendet noch in die Quellen gespeichert.

Alle sieben aktuellen Studio-/Kodierbox-Paare haben identischen Word-Text,
identische Seitenzahl und Fußzeilen. Die vollständigen Seitenbilder sind bei
120 DPI **pixelgleich**, einschließlich Fußzeilen und Seitenfeldern.
Alle 32 PDF-Seiten zeigen die korrekte Angabe „Seite X von Y“.

Die Sichtprüfung umfasst Spaltenbreiten, Zeilen- und Seitenumbrüche, lange
Überschriften, Bilder, Formeln, Listen, Hervorhebungen und Fußzeilen. Es wurden
keine unerwarteten abgeschnittenen oder überlappenden Inhalte gefunden.
Der vorhandene Studio-Umbruch einer vollständigen großen Codezeile auf die
Folgeseite bleibt erhalten.

## Vergleich mit der alten Studio-Ausgabe

Die beiden alten Rich-Text-Dokumente haben weiterhin je drei Seiten. Die
Seitenkörper von Seite 1 und 2 sind jeweils pixelgleich zur aktuellen Ausgabe;
für diesen separaten Vergleich ist ausschließlich der Fußzeilenbereich
ausgenommen. Die Fußzeilen werden unabhängig auf Kennzeichnung und Seitenzahlen
geprüft.

Auf Seite 3 wird die bereits dokumentierte explizite **18pt-Schriftgröße** der
synthetischen Instruktion „Farbe“ nun korrekt dargestellt. Dadurch werden diese
Tabellenzeile höher und die folgenden Inhalte nach unten verschoben. Die
Seitenzahl bleibt gleich. Weitere sichtbare Änderungen sind die vereinbarte
Kennzeichnung **„IQB Codebook“** und das Erstellungsdatum. Diese gezielten
Korrekturen sind keine pixelgleiche Bewahrung des alten Fehlverhaltens.
Weitere unerwartete Unterschiede wurden in diesen Referenzen nicht gefunden.

## Reproduzieren

Der Installationsvergleich erzeugt sieben Fälle je Host und
`word-expectations.json`. Optional die beiden unveränderten alten Referenzen
als `original-studio-scores.docx` und `original-studio-no-scores.docx` in denselben
Ordner kopieren. Auf Windows mit installiertem Desktop-Word:

```powershell
./scripts/verify-codebook-word-windows.ps1 -Directory C:\Codebook-Pruefung -IncludeStudioReferences
```

Ohne alte Referenzen den Schalter weglassen. Das Skript unterstützt auch die
frühere vollständige Drei-Fall-Matrix. Es verändert keine Sicherheits- oder
Ausführungsrichtlinien und arbeitet mit lokalen temporären Kopien, auch wenn
die Eingaben auf einem Netzlaufwerk liegen. Es verwendet typisierte COM-Argumente
und indexierten Zugriff auf Tabellen und Fußzeilenfelder; dadurch werden die
auf der geprüften Word-Installation beobachteten COM-Fehler und Hänger vermieden.
Eine eigene Word-Instanz mit bereits offenen Dokumenten wird nicht verwendet
oder geschlossen. Fortschrittslog und abschließender JSON-Bericht werden erst
nach Abschluss veröffentlicht, um SMB-Lesesperren während des Schreibens zu vermeiden.

PDF-Prüfung und Rastervergleich, mit Python 3, Pillow, pypdf und Poppler im PATH:

```shell
python3 scripts/verify-codebook-word-pdfs.py /path/to/WordResults-folder
```

Das PowerShell-Skript und der PDF-Prüfer setzen die visuelle Abnahme ausdrücklich
nicht automatisch auf bestanden. Alle Seiten anschließend tatsächlich sichten.
Die endgültige eingecheckte PowerShell-Fassung wurde auf demselben Windows-Rechner
erneut mit allen 16 Dateien ausgeführt: automatische Prüfungen bestanden,
Quellprüfsummen unverändert, alle 32 gerenderten Seiten pixelgleich zum gesichteten
ersten Lauf. Dieser Wiederholungslauf ist im JSON-Bericht separat ausgewiesen.

## Nachweisgrenzen

Dieser Nachweis gilt für den bezeichneten Paketstand, die beschriebenen Fälle
und diese Desktop-Word-Version. Er ist keine Zusage für jede zukünftige
Word-Version oder beliebige Eingabedokumente. Die breitere fachliche Matrix
bleibt durch die Generator- und Installationsvergleiche abgesichert.

Browserdialoge, direkte HTTP-Downloads, Redis-/Jobabläufe und Berechtigungen
werden durch diese Word-Abnahme nicht erneut geprüft. Sie benötigen weiterhin
eigene Anwendungsprüfungen. Es wurden hier nur Prüfscripte und Dokumentation
geändert; kein Generator-, Schemer-, Validierungs- oder Kodierengine-Code.
Es erfolgten kein PR-Merge, npm-Release oder Deployment. Entfernte CI bleibt
ein separater Nachweis.
