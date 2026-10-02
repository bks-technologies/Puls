import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { company as c } from "@/lib/legal";

export const metadata: Metadata = { title: "Datenschutz" };

/**
 * ENTWURF, von Sami zu prüfen. Aufbau nach Art. 13 DSGVO.
 * Die Demo hat keine Konten und keine Datenbank: was Besucher einstellen, bleibt in ihrem Browser.
 * Hosting: Vercel, Region Frankfurt.
 */
export default function Page() {
  return (
    <LegalPage title="Datenschutz">
      <p className="rounded-lg bg-warn-soft px-4 py-3 text-sm text-warn-ink">Entwurf, noch nicht rechtlich geprüft.</p>

      <h2>1. Verantwortlicher</h2>
      <p>
        {c.legalName}, {c.street}, {c.zip} {c.city}, vertreten durch {c.representative}. E-Mail:{" "}
        <a href={`mailto:${c.email}`}>{c.email}</a>, Telefon: {c.phone}.
      </p>

      <h2>2. Was diese Anwendung ist</h2>
      <p>
        „Puls“ ist eine Vorführung von {c.name}: ein Monitor für APIs und Webhooks. Es gibt keine Registrierung, keine
        Konten und keine Datenbank. Wir erheben keine Angaben über Sie, setzen keine Cookies und verwenden keine
        Analyse- oder Werbedienste. Schriften werden von unserem eigenen Server geladen.
      </p>

      <h2>3. Speicherung in Ihrem Browser</h2>
      <p>
        Die Endpunkte, Prüfergebnisse, Vorfälle, Zustellungen und Benachrichtigungs-Einstellungen, die Sie anlegen,
        speichert die Anwendung im lokalen Speicher (localStorage) Ihres Browsers. Diese Daten verlassen Ihr Gerät nur
        für die unten beschriebenen Prüfungen und Nachrichten und werden bei uns nicht gespeichert. Sie löschen sie mit
        „Demo zurücksetzen“ oder über die Einstellungen Ihres Browsers. Rechtsgrundlage: § 25 Abs. 2 Nr. 2 TDDDG, weil
        die Speicherung für die von Ihnen genutzte Funktion unbedingt erforderlich ist.
      </p>

      <h2>4. Prüfungen von Adressen</h2>
      <p>
        Für jede Prüfung sendet Ihr Browser die eingetragene Adresse an unseren Server, der sie aufruft und Statuscode,
        Antwortzeit, ausgewählte Antwort-Header und die ersten 4 KB der Antwort zurückgibt. Der Betreiber der geprüften
        Adresse sieht dabei eine Anfrage von unserem Hosting-Anbieter mit der Kennung „Puls-Monitor“, nicht Ihre
        IP-Adresse. Tragen Sie nur Adressen ein, die Sie prüfen dürfen. Interne Netzadressen werden aus
        Sicherheitsgründen nicht aufgerufen.
      </p>

      <h2>5. Webhook-Simulator</h2>
      <p>
        Test-Nachrichten aus dem Simulator gehen an unseren Server, werden dort geprüft und beantwortet und danach
        verworfen. Verwenden Sie nur Beispieldaten.
      </p>

      <h2>6. Nachrichten an Slack</h2>
      <p>
        Wenn Sie Slack aktivieren, leitet unser Server Testnachrichten und Meldungen zu Ausfällen an die von Ihnen
        angegebene Slack-Adresse weiter. Die Nachricht enthält den Namen und die Adresse des Endpunkts, Statuscode,
        Antwortzeit und Fehlermeldung. Slack wird von Slack Technologies betrieben; Daten können dabei in die USA
        übertragen werden. Die Weiterleitung geschieht nur auf Ihre Veranlassung (Art. 6 Abs. 1 lit. a DSGVO). E-Mails
        verschickt die Vorführung nicht.
      </p>

      <h2>7. Hosting und Schutz vor Missbrauch</h2>
      <p>
        Die Anwendung läuft bei Vercel Inc. in der Region Frankfurt am Main; mit Vercel besteht ein
        Auftragsverarbeitungsvertrag nach Art. 28 DSGVO. Beim Aufruf verarbeitet Vercel technisch notwendige
        Verbindungsdaten (IP-Adresse, Zeitpunkt, aufgerufene Adresse) zur Auslieferung und Absicherung. Um Missbrauch zu
        verhindern, zählt unser Server Anfragen je IP-Adresse; dieser Zähler liegt nur im Arbeitsspeicher und verfällt
        nach einer Minute. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.
      </p>

      <h2>8. Ihre Rechte</h2>
      <p>
        Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch nach Art.
        15 bis 21 DSGVO. Anfragen an <a href={`mailto:${c.email}`}>{c.email}</a>. Beschwerden nimmt die zuständige
        Aufsichtsbehörde entgegen: {c.authority.name}, {c.authority.street}, {c.authority.city},{" "}
        <a href={c.authority.url}>{c.authority.url}</a>.
      </p>
    </LegalPage>
  );
}
