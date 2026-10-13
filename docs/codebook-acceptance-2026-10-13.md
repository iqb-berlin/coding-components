# Codebook-Abnahme vom 13.10.2026

Die P2-Regression bei geschützten und wiederholten Leerzeichen ist behoben.
Die bisherige Studio-Ausgabe bleibt in den stabilen Referenzfällen erhalten;
die direkten Studio- und die asynchronen Kodierbox-Exporte liefern identische Dokumentinhalte.

## Automatisierte Nachweise

| Prüfung | Ergebnis |
| --- | --- |
| Generator | 1.206 Tests bestanden, keine übersprungen |
| Neue Editor-Matrix | 384 Kombinationen, jeweils ESM und CommonJS, allgemeine und Code-Instruktionen |
| Ursprüngliches Studio | 32 bestehende + 20 neue unabhängige JSON-/DOCX-Referenzfälle |
| Installierte Hosts | 4.654 Exportpaare: JSON und alle relevanten DOCX-Bestandteile identisch |
| Studio | 49 API- und 66 Frontendtests bestanden |
| Kodierbox | 58 Backend- und 60 Frontendtests bestanden |
| Builds | Bibliothek und alle vier Host-Builds erfolgreich |
| Lint | Keine Fehler; Bibliothek 18, Studio API 6 bestehende Warnungen |

Alle 20 neuen Leerzeichenfälle waren vor dem Fix rot und danach grün.
Die vollständigen Host-Suiten wurden für diesen Fix nicht erneut ausgeführt.
Referenz: ursprünglicher Studio-Commit `2504265721a59c7c65425072951ce82ab16f0fb8`.
Die Laufzeitänderungen wurden mit Bibliothek `aa404bc2`, Studio `b12fd461`
und Kodierbox `92b88f30` geprüft; spätere Ergänzungen betreffen Tests, synthetische
Abnahmedokumente und Dokumentation.

Paket: identischer lokal gepackter 4.1.0-Tarball in beiden Anwendungen.
SHA256: `dcee6cc39436baf91cf2558afedfbc202e044ca14dbf72c7bfdf4b381e5c0ccd`.
Alle installierten Paketdateien wurden mit dem Tarball verglichen; beide
Root-Locks und Studios API-Runtime-Lock enthalten dessen neue Integrität.

## Echte Browserabläufe

Beide gebauten Frontends wurden über einen lokalen Static-/API-Proxy mit ihren
unveränderten produktiven NestJS-Bundles ausgeführt. Die PostgreSQL-Datenbanken
wurden mit den vollständigen Repository-Migrationen frisch angelegt. Studio
verwendete Liquibase 4.33, Kodierbox die vorgesehene Version 4.28. Kodierbox nutzte
echtes Redis/Bull und einen isolierten Keycloak mit zwei synthetischen Identitäten.
Die Fixture-Einrichtung erfolgte über echte APIs; Kodierbox-VOCS und die
Jobdefinition wurden als erfundene Datensätze direkt in die Testdatenbank gesetzt.
Die erfolgreichen Exportabläufe enthielten keine API-/Auth-/Queue-Mocks.

- **Studio:** JSON-/DOCX-Download, leere Auswahl gesperrt, Suche erhält Gesamtauswahl,
  Dialog schließt nach Download, anonymer Zugriff 401, fremder Workspace 403,
  Missing-Code 0 über reales Profil, Score-Abwahl und Schulungsfilter geprüft.
- **Kodierbox:** JSON-/DOCX über echte Jobanlage, Statusabfrage und Download;
  Jobdefinitionspicker beschränkt auf A/ALIAS_00, ausgewähltes Missingprofil und
  Score-Abwahl stimmen mit dem Download überein. Doppelauslösung ist gesperrt;
  erneuter Versuch und Ende des Pollings beim Schließen funktionieren.
- **Fehlerzweige:** Studio-Exportfehler sowie Kodierbox-Anlage-, Status- und
  Downloadfehler wurden gezielt im Browsernetzwerk injiziert. Meldung und
  Freigabe für erneuten Versuch wurden geprüft; erfolgreicher Retry lief wieder
  gegen die echte Queue.
- **Reale Zugriffsprüfungen:** Kodierbox weist anonyme und nicht zugewiesene Nutzer
  ab (bestehender WorkspaceGuard: 401), fremde Job-Workspaces mit 403, fremde
  ausgewählte Einheiten mit 404 und ungültiges Format/Boolean mit 400. Ein
  erfolgreicher Download räumt sein Ergebnis auf; Folgeabruf liefert 404.
- Beide erfolgreichen Browser-Downloads sind in JSON und allen normalisierten
  DOCX-Bestandteilen identisch. NBSP, schmales NBSP und doppelte Abstände bleiben
  erhalten. Keine unbehandelten Browser-Ausnahmen in den bestandenen Abläufen.

Testumgebung: PostgreSQL 16.11, Redis 7.4, Keycloak 26.7.3. Das ist keine
Produktions- oder Deployment-Abnahme; Kodierboxs PostgreSQL-14-Produktionsversion
wurde damit nicht separat geprüft. Der vorhandene Keycloak-JS-Adapter 23.0.7
benötigte im Testrealm den dokumentierten Nonce-Kompatibilitätsmapper
([Keycloak Upgrade Guide](https://www.keycloak.org/docs/26.7.5/upgrading/index.html)).
Alle isolierten Testdienste wurden anschließend beendet und entfernt.

## Microsoft Office

Die tatsächlichen DOCX-Dateien wurden von **Microsoft Office Web Viewer / Word**
gerendert, ohne Office-Anmeldung. Es wurden ausschließlich erfundene, im
Bibliotheksbranch versionierte Testdokumente verwendet.

| Dokument | Seiten |
| --- | ---: |
| Aktuelles Rich-Text-Dokument mit Scores | 3 |
| Ursprüngliches Studio mit Scores | 3 |
| Aktuelles Rich-Text-Dokument ohne Scores | 3 |
| Ursprüngliches Studio ohne Scores | 3 |
| Tatsächlicher Studio-Browser-Download | 3 |
| Tatsächlicher Kodierbox-Browser-Download | 3 |
| 48 Markierungskombinationen plus Formel/Listen/Bild | 2 |
| **Gesamt** | **20** |

Tabellenspalten, Umbrüche, Bilder, Formeln, Markierungen und Fußzeilen/Seitenzahlen
wurden anhand der gerenderten Seiten geprüft. Alle sechs Seiteninhalte der
aktuellen/ursprünglichen Studio-Paare sind pixelgleich (Seitenbereich oberhalb
der Fußzeile; die vereinbarte Umbenennung zu „IQB Codebook“ wird separat geprüft).
Die beiden echten Browser-Dokumente sind auf allen drei vollständigen Seiten
pixelgleich. Es traten keine sichtbaren abgeschnittenen Inhalte oder defekten
Formeln/Bilder auf. Dies ist ein echter Microsoft-Word-Web-Nachweis; Windows-
oder macOS-Desktop-Word wurde nicht ausgeführt.

## Aspect-Abgleich und Grenzen

Quellabgleich mit `iqb-berlin/verona-modules-aspect@fb3f5982`: Die 384 Tests
umfassen alle Kombinationen der gemeinsamen vier Textmarkierungen, drei gültigen
Grundlinienzustände, zwei Verschachtelungsreihenfolgen und vier Ausrichtungen.
Der Codebook-Vertrag liest Kodierinstruktionen aus VOCS, nicht vollständige
Aspect-Aufgaben mit interaktiven Player-Elementen. Aspect-Formelknoten verwenden
einen anderen Vertrag als die IQB-Formeln des Instruktionseditors. Ein kompletter
Aspect-Editor-/Player-Browserlauf wurde nicht durchgeführt.

Die bestehenden Studio-Grenzen bei CSS-Listenstilen, verschachtelten
Listeneinrückungen, Bild-Floats sowie innerhalb eines Absatzes wechselnder Farbe/
Schriftgröße bleiben dokumentiert. Eine uneingeschränkte HTML-/CSS-Layouttreue
oder Unterstützung aller Aspect-Player-Knoten wird nicht behauptet.

## Veröffentlichung und CI

Alle drei Branches `shared-codebook` wurden committed und gepusht. Die offenen
PRs #239 (Bibliothek) und #1041 (Kodierbox) werden mit diesen Ergebnissen aktualisiert.
Studio-PR #1728 ist ohne Merge geschlossen; der Studio-Branch wurde aktualisiert.
Bibliotheks-CI war für `2925485` vollständig grün. Die CI der abschließenden
Dokumentationscommits wird separat angegeben. Kodierboxs zuletzt geprüfte
GitLab-Pipeline [103668](https://scm.cms.hu-berlin.de/iqb/coding-box/-/pipelines/103668)
für `92b88f30` ist fehlgeschlagen; die Jobursache bleibt hinter Bot-Schutz/
Anmeldung unbestätigt. Lokale grüne Tests ersetzen diesen offenen CI-Status nicht.
Kein Merge, Release, Paket-Publish oder Rollout wurde ausgeführt.
