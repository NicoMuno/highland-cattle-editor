
//! Translation layer from technical backend errors to user-friendly messages.
//!
//! These messages are intentionally phrased for non-technical users and are
//! shown in the UI when Git, preview, or setup operations fail.


/// Converts a technical error message into a simpler user-facing message.
///
/// The mapping is based on substring matching for common failure cases such as
/// authentication problems, merge conflicts, missing files, or an already
/// running preview server.
pub(crate) fn translate_error_for_farmer(technical_error: &str) -> String {
    let err_lower = technical_error.to_lowercase();

    if err_lower.contains("merge conflict") {
        return "Es gab eine kleine Überschneidung mit Änderungen im Internet. Bitte lade die Seite neu, um fortzufahren.".to_string();
    }
    if err_lower.contains("401") || err_lower.contains("authentication") || err_lower.contains("could not read username") {
        return "Der Zugangsschlüssel (GitHub Token) scheint ungültig zu sein. Bitte prüfe deine Eingabe in den Einstellungen.".to_string();
    }
    if err_lower.contains("eaddrinuse") {
        return "Die Vorschau läuft bereits im Hintergrund. Bitte warte einen Moment oder starte die App neu.".to_string();
    }
    if err_lower.contains("not found") {
        return "Ein benötigter Ordner oder eine Datei konnte nicht gefunden werden. Bitte stelle sicher, dass du mit dem Internet verbunden bist.".to_string();
    }
    
    "Ein unerwartetes Problem ist aufgetreten. Keine Sorge, deine Daten sind sicher. Bitte versuche es in ein paar Minuten noch einmal.".to_string()
}