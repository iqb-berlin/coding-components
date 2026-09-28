# Gemeinsames Codebook: Integrationsvertrag

Studio ist die Referenz für Bedienung und Dokumentlayout. Die drei Einstiegspunkte
`codebook-models`, `codebook-generator` und `codebook-export` trennen Daten,
frameworkfreie Dokumenterstellung und Angular-Oberfläche. Die Bibliothek enthält
keinen Jobvertrag, keine HTTP-Aufrufe und keinen Download-Dienst.

## Anwendungen

Studio lädt Aufgaben und Missingprofile, übergibt die aktive Aufgabe und seine
Speichersperre und verarbeitet `exportRequested` mit seinem direkten API-Aufruf.
Die Kodierbox ergänzt ihre eigenen Filter über `[codebookFilters]` und zeigt ihre
Jobzustände über `[codebookStatus]`. Das sind Projektionsflächen ohne Jobsemantik.
`loading` und `busy` sind allgemeine Sperrzustände. Nur die Kodierbox startet Jobs,
fragt Status ab und lädt Ergebnisse. Beim Schließen endet die Statusabfrage;
der Serverjob wird nicht abgebrochen.

Die Übersetzungen der Oberfläche stehen im Host unter `codebook.*`. Beide Hosts
verwenden dieselben Studio-Beschriftungen und Tooltips. `selectionChanged`,
`exportRequested` und `cancel` sind die einzigen Ausgaben. Der Exportwunsch enthält
Aufgaben-IDs, fachliche Optionen und Missingprofil-ID. Die Profile tragen eine
numerische ID und eine Beschriftung; 0 bedeutet kein Profil.

## Bewusste fachliche Korrekturen

* Nur manuell: Variablen mit regulären manuell beschriebenen Codes; nur diese Codes.
* Nur geschlossen: Variablen mit RESIDUAL_AUTO oder INTENDED_INCOMPLETE; alle Codes.
* Beide: Vereinigung dieser Variablengruppen; alle Codes.
* Beide aus: keine Einschränkung nach dieser Kategorie.
* Nur mit Codes wird nach der Codeauswahl ausgewertet.
* Leere HTML-Strukturen, unsichtbare Zeichen und Leerzeichen sind keine Instruktion;
  unterstützte Bilder und Formeln sind eine Instruktion. Allgemeine Instruktionen
  allein machen keinen Code manuell.
* Code 0 und Missing 0 bleiben erhalten. Leere Exporte liefern `[]` bzw. ein gültiges
  DOCX. Fehlerhafte Schemen melden die betroffene Aufgabe.
* Aufgaben werden nach Schlüssel, Variablen nach Alias/ID sortiert; Codefolge bleibt.
* BASE_NO_VALUE bleibt ausgeschlossen; abgeleitete Variablen folgen der Option.
* Itembeziehungen sind explizite `{id, variableId}`-Paare. Der Anwendungsadapter
  normalisiert Quell-IDs auf die im Dokument verwendeten Aliase.
* Die Kennzeichnung lautet IQB Codebook. Studio-Formatierung, Tabellen, Seitenfelder,
  eingebettete Bilder und Formelkonvertierung bleiben erhalten. Klartextinstruktionen
  und Leerzeichen an Formatgrenzen werden nicht mehr verschluckt.

## Paket und Laufzeit

`npm run build_cc` erzeugt Angular-ESM sowie einen zusätzlichen CommonJS-Einstieg
für Server. Der Generator braucht weder Angular noch DOM/Browser-Globals.
Der CommonJS-Build integriert den ausschließlich als ESM gelieferten mathml2omml-
Konverter. Dessen Quellcode bleibt über Source Maps und das npm-Original verfügbar.

Die Regeltextkonvertierung ist intern auf @iqb/responses 5.2.2 festgelegt.
Das ist ausdrücklich kein Upgrade der Kodierbox-Kodierengine: deren responses
5.2.0 und response-Spezifikation 1.5.1 bleiben unverändert. Die Bibliothek akzeptiert
response-Spezifikation 1.5.1 sowie 2.x als Peer.

## Lokale Integration und Veröffentlichung

Die beiden Integrationen referenzieren dieselbe gepackte Datei unter
`vendor/iqb-ngx-coding-components-4.1.0.tgz`. Das ist ein lokal prüfbarer Release-
Kandidat, noch keine veröffentlichte npm-Version. Zum Release wird genau der
abgenommene Bibliotheksstand veröffentlicht; danach werden die Host-Abhängigkeiten
auf die Registry-Version umgestellt und Locks neu geprüft. Die lokalen Tarballs
können dann entfernt werden. Beide Anwendungen gemeinsam abnehmen und ausrollen.
Rollback: vorherige Bibliotheks-/Anwendungsversion; keine Datenmigration.

## Prüfungen

* `npm run test:codebook`: Node-Vertragstests für alle Filterkombinationen, Daten,
  JSON, DOCX-Struktur, Bilder, Formeln, Itembeziehungen und CJS/ESM-Gleichheit.
* `npm run test:cc`: Angular-Tests einschließlich Auswahl/Suche/Sperrzustände.
* Beide Hosts testen ihre echten Adapter und bestehenden Formelregressionen.
* Studio-Frontend prüft direkten Export, Ladezustände, Fehlermeldung und Speichersperre.
* Kodierbox prüft Scope-Filter, wiederholte Starts, langsame Statusabfragen und Schließen.
* Frontend- und Backend-Prüfungen auf dem Entwicklungsrechner nacheinander ausführen.
* Vor Ausrollen bleiben visuelle Mehrseiten-DOCX-Abnahme und Host-Browserabläufe
  einschließlich Netzwerkprüfung verpflichtend.
