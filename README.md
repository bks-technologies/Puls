# Puls · API- & Webhook-Monitor

Überwacht APIs und Webhooks: Live-Status je Endpunkt, Latenzverlauf, Vorfall-Protokoll mit
Statuscode, Antwortzeit und Fehler-Body, Webhook-Simulator und Benachrichtigungen über Slack.
Eine Demo von BKS Technologies.

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Recharts, Lucide.

## Was echt ist und was simuliert

| Teil | Stand |
| --- | --- |
| Prüfungen | **echt.** `/api/check` ruft jede URL serverseitig auf und misst die Zeit bis zur Antwort (Header). |
| Beispiel-Endpunkte | eingebaute Mocks unter `/api/mock/<szenario>` (stabil, langsam, wackelig, 500, 404, hängt) plus die öffentliche GitHub-API. |
| Webhook-Empfänger | **echt**, `/api/hooks/<id>` antwortet mit 202, 400, 401, 404, 413 oder 500, speichert aber nichts. |
| Slack | **echt**, über Incoming Webhooks. Die Nachricht wird auf dem Server aus festen Feldern gebaut. |
| E-Mail | nur Konfiguration. In der öffentlichen Demo wird nichts verschickt (kein offener Mailversand). |
| Speicher | keine Datenbank. Endpunkte, Verlauf, Vorfälle und Einstellungen liegen im `localStorage` des Besuchers. |

## Sicherheit

Der Prüfdienst ruft URLs im Auftrag anonymer Besucher auf und darf deshalb kein Tor ins interne Netz sein (SSRF):

- nur `http`/`https`, keine Zugangsdaten in der URL, relative Pfade nur für `/api/mock/…`
- DNS wird vorab aufgelöst; private, Loopback-, Link-Local-, CGNAT- und Metadaten-Adressen (IPv4 und IPv6) sind gesperrt
- beim Verbindungsaufbau wird **noch einmal** aufgelöst und geprüft (undici-Agent mit eigenem Lookup), damit DNS-Rebinding nicht greift
- keine Weiterleitungen folgen (`redirect: manual`), Timeout höchstens 10 s, Antwort-Body höchstens 4 KB
- Begrenzung je IP und Instanz: 30 Prüfläufe, 60 Webhooks, 10 Slack-Meldungen pro Minute
- Slack-Ziel nur `https://hooks.slack.com/services/…`

## Entwicklung

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # Vitest: SSRF-Sperre, Statuslogik, Vorfälle, Kennzahlen
npm run lint
npm run build
```

Keine Umgebungsvariablen nötig. Vercel: Region Frankfurt (`fra1`) wählen, sonst nichts einzustellen.

## Aufbau

```
app/                      Seiten (Übersicht, Vorfälle, Simulator, Benachrichtigungen) und API-Routen
components/<bereich>/     UI je Bereich, components/ui/ für Grundbausteine
lib/status.ts             Klassifizierung grün/gelb/rot
lib/incidents.ts          Vorfall-Logik als reine Funktion (öffnen, wiederholen, eskalieren, beheben)
lib/store.ts              Client-Speicher (useSyncExternalStore + localStorage), Prüf-Takt, Alarmversand
lib/server/               Prüfung, SSRF-Schutz, Ratenbegrenzung
```
