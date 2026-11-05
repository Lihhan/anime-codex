import React from "react";
import { actions } from "../shared/character-images.mjs";
export function CharacterSettings({
  t,
  character,
  library,
  profileName,
  setProfileName,
  loading,
  busy,
  onSelect,
  onImport,
  onRemove,
  onSave,
  preview,
  setPreview,
}) {
  return (
    <section className="character-settings">
      <h2>{t("Character library")}</h2>
      <label>
        {t("Character library")}
        <select
          data-testid="character-select"
          value={character?.id || ""}
          disabled={loading || !library.length}
          onChange={(e) => onSelect(e.target.value)}
        >
          <option value="" disabled>
            {t("Choose a character")}
          </option>
          {library.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <button
        data-testid="new-image-character"
        disabled={loading}
        onClick={() => onImport("idle", null)}
      >
        {t("New character from idle image")}
      </button>
      <p>
        {t(
          "Only an idle image is required. Any missing action uses the idle image automatically.",
        )}
      </p>
      <p>
        {t(
          "Local images stay on this computer. Transparent PNG is recommended.",
        )}
      </p>
      <label>
        {t("Character name")}
        <input
          data-testid="character-name"
          maxLength="80"
          value={profileName}
          disabled={!character}
          onChange={(e) => setProfileName(e.target.value)}
        />
      </label>
      <button
        data-testid="save-character"
        disabled={loading || !character}
        onClick={onSave}
      >
        {t("Save character")}
      </button>
      <h3>{t("Action images")}</h3>
      <p>
        {t(
          "Upload separate images for the actions you want. Use the same canvas and alignment for smooth transitions.",
        )}
      </p>
      <div className="action-grid">
        {actions.map((action) => (
          <section
            className="action-slot"
            key={action}
            data-testid={"slot-" + action}
          >
            <button
              className={
                "action-preview " + (preview === action ? "selected" : "")
              }
              disabled={!character || busy}
              onClick={() => setPreview(preview === action ? null : action)}
              aria-label={t("Preview") + " · " + t("action." + action)}
            >
              {character?.images?.[action] ? (
                <img
                  src={character.images[action].src}
                  alt={t("action." + action)}
                  draggable="false"
                />
              ) : (
                <span>{t("Uses idle image")}</span>
              )}
            </button>
            <strong>
              {t("action." + action)}
              {action === "idle" ? " *" : ""}
            </strong>
            <button
              data-testid={"upload-" + action}
              disabled={loading || (!character && action !== "idle")}
              onClick={() => onImport(action, character?.id || null)}
            >
              {character?.images?.[action]
                ? t("Replace image")
                : t("Upload image")}
            </button>
            {action !== "idle" && character?.images?.[action] && (
              <button
                data-testid={"remove-" + action}
                disabled={loading}
                onClick={() => onRemove(action)}
              >
                {t("Use idle instead")}
              </button>
            )}
          </section>
        ))}
      </div>
      {preview && (
        <button data-testid="stop-preview" onClick={() => setPreview(null)}>
          {t("Stop preview")}
        </button>
      )}
      <p>
        {t(
          "Changes apply to new or resumed conversations. Existing messages and tool output are not translated.",
        )}
      </p>
    </section>
  );
}
