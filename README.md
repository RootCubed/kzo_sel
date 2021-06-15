# Installation

Das Tool ist ein node.js Skript. Dieses startet zwei Webserver, einer für das Lehrer-Frontend (Umfragen erstellen, editieren, löschen und starten) und einer für das Schüler-Frontend (Umfragen ausfüllen).

Standartmässig ist der Lehrer-Server auf Port 3001, der Schüler-Server auf Port 3000. Diese können mit der Umgebungsvariable `PORT_STUDENT` und `PORT_TEACHER` abgeändert werden.

Benutzt der Intranet-Server z.B. Apache, können mit Virtual Hosts diese Webserver in ein Verzeichnis weitergeleitet werden.