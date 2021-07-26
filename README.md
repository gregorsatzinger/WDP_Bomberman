# WDP Projekt von Satzinger Gregor (S1910307088)

* Projekt-Name: Bomberman
* Projekt-Typ: Game
* Externe JS/CSS Bibliotheken: 
  ExpressJS, Socket.io
* Zeitaufwand (h): 42

* Getting started: 
1) npm install
2) node index.js
3) In einem beliebigen Browser localhost:3000 starten

Hinweis: Es wird wie in der Vorlesung besprochen, import anstelle von require verwendet. Unter Verwendung einer aktuellen node Version macht das keine Probleme, bei älteren Versionen muss das Projekt unter Umständen mit der experimental-modules flag gestartet werden (node --experimental-modules index.js).

## Beschreibung
Implementierung einer Multiplayer-Version von Bomberman:
Dabei sollen jeweils zwei Spieler einem Spiel beitreten können. Sie treten gegen einander an und versuchen mit Hilfe von Bomben den Gegner zu zerstören. Mit Hilfe der Pfeiltasten sollen sich die Spieler innerhalb des Spielfelds bewegen können.

![image](https://user-images.githubusercontent.com/34024341/126959743-8d2ba3f7-9e41-48c0-8e19-757e0f21e0f0.png)
