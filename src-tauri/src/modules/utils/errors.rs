//! Translation layer from technical backend errors to user-friendly messages.

pub(crate) fn translate_error_for_farmer(technical_error: &str) -> String {
    let err = technical_error.trim();
    let err_lower = err.to_lowercase();

    if err_lower.contains("author identity unknown")
        || err_lower.contains("please tell me who you are")
        || err_lower.contains("unable to auto-detect email address")
        || err_lower.contains("fatal: unable to auto-detect email address")
    {
        return "Git ist auf diesem Computer noch nicht vollständig vorbereitet. Bitte richte den Arbeitsbereich erneut ein oder kontaktiere den Support.".to_string();
    }

    if err_lower.contains("401")
        || err_lower.contains("403")
        || err_lower.contains("authentication failed")
        || err_lower.contains("could not read username")
        || err_lower.contains("invalid username or token")
        || err_lower.contains("access denied")
    {
        return "Der Zugangsschlüssel für GitHub scheint ungültig zu sein oder hat nicht genug Rechte. Bitte prüfe den Token in den Einstellungen.".to_string();
    }

    if err_lower.contains("repository not found")
        || err_lower.contains("not found")
        || err_lower.contains("could not find repository")
    {
        return "Die angegebene GitHub-Repository-Adresse konnte nicht gefunden werden. Bitte prüfe die Adresse im Setup.".to_string();
    }

    if err_lower.contains("src refspec main does not match any")
        || err_lower.contains("remote ref does not exist")
        || err_lower.contains("failed to push some refs")
    {
        return "Die Website konnte nicht hochgeladen werden, weil der Ziel-Branch nicht wie erwartet verfügbar ist. Bitte prüfe die Repository-Einstellungen.".to_string();
    }

    if err_lower.contains("merge conflict")
        || err_lower.contains("conflict")
        || err_lower.contains("would be overwritten by merge")
    {
        return "Es gibt einen Konflikt mit bereits vorhandenen Änderungen. Bitte aktualisiere den Arbeitsstand zuerst.".to_string();
    }

    if err_lower.contains("nothing to commit")
        || err_lower.contains("working tree clean")
    {
        return "Es gibt keine neuen Änderungen zum Speichern.".to_string();
    }

    if err_lower.contains("index.lock")
        || err_lower.contains("another git process")
    {
        return "Git ist gerade noch beschäftigt oder wurde unterbrochen. Bitte schließe andere Vorgänge und versuche es erneut.".to_string();
    }

    if err_lower.contains("could not resolve host")
        || err_lower.contains("failed to connect")
        || err_lower.contains("connection timed out")
        || err_lower.contains("network is unreachable")
        || err_lower.contains("schannel")
        || err_lower.contains("ssl")
        || err_lower.contains("tls")
    {
        return "Die Verbindung zum Internet oder zu GitHub konnte nicht hergestellt werden. Bitte prüfe deine Netzwerkverbindung.".to_string();
    }

    if err_lower.contains("eaddrinuse") {
        return "Die Vorschau läuft bereits im Hintergrund. Bitte warte einen Moment oder starte die App neu.".to_string();
    }

    if err_lower.contains("package.json") {
        return "Die heruntergeladene Website scheint unvollständig zu sein. Bitte prüfe, ob das richtige Entwicklungs-Repository verwendet wurde.".to_string();
    }

    if err_lower.contains("permission denied")
        || err_lower.contains("access is denied")
    {
        return "Auf eine benötigte Datei oder einen Ordner konnte nicht zugegriffen werden. Bitte prüfe die Berechtigungen oder wähle einen anderen Speicherort.".to_string();
    }

    "Ein unerwartetes Problem ist aufgetreten. Keine Sorge, deine Daten sind sicher. Bitte versuche es noch einmal.".to_string()
}