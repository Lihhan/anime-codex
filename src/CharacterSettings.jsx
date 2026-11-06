import React from "react";
import { actions } from "../shared/character-images.mjs";
import catalog from "../characters/catalog.json";
import profiles from "../shared/character-presets.json";
import "./character-presets.css";
export function CharacterSettings({
  t,
  character,
  library,
  language,
  onOriginalRin,
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
  backgroundAutomatic,
  onBackgroundAutomatic,
  onRemoveBackground,
  onRestoreOriginal,
}) {
  return (
    <section className="character-settings">
      <h2>{t("Character library")}</h2>
      <h3>{t("preset.title")}</h3>
      <p>{t("preset.help")}</p>
      <div className="preset-gallery" data-testid="preset-gallery">
        {catalog.map(({ id, slug }) => {
          const preset = profiles[slug];
          if (!library.some((c) => c.id === id)) return null;
          return (
            <button
              type="button"
              key={id}
              className={character?.id === id ? "selected" : ""}
              data-testid={"preset-" + slug}
              disabled={loading || busy}
              onClick={() => onSelect(id)}
              aria-pressed={character?.id === id}
            >
              <img
                src={"./characters/" + slug + "/idle.png"}
                alt=""
                loading="lazy"
                draggable="false"
              />
              <strong>
                {preset.localizedNames?.[language] || preset.name}
              </strong>
              <span>{preset.work?.[language] || t("preset.original")}</span>
              <small>
                {preset.summary?.[language] || t("preset.rinSummary")}
              </small>
              {slug !== "rin" && <em>{t("preset.fanart")}</em>}
            </button>
          );
        })}
      </div>
      <button
        data-testid="original-rin"
        disabled={loading}
        onClick={onOriginalRin}
      >
        {t("Use original Rin")}
      </button>
      <p>
        {t(
          "Editing Rin creates a custom copy. Original Rin stays in the library.",
        )}
      </p>
      <label className="checkbox-label">
        <input
          data-testid="auto-background"
          type="checkbox"
          checked={backgroundAutomatic}
          disabled={loading}
          onChange={(e) => onBackgroundAutomatic(e.target.checked)}
        />
        {t("Automatically remove background on import")}
      </label>
      <p>
        {t(
          "Local AI processing. First use downloads about 170 MB; your images are never uploaded.",
        )}
      </p>
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
              {c.builtin ? c.localizedNames?.[language] || c.name : c.name}
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
          disabled={!character || loading || busy}
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
            {character?.images?.[action] && (
              <button
                data-testid={"background-" + action}
                disabled={loading || character.images[action].backgroundRemoved}
                onClick={() => onRemoveBackground(action)}
              >
                {character.images[action].backgroundRemoved
                  ? t("Background removed")
                  : t("Remove background")}
              </button>
            )}
            {character?.images?.[action]?.canRestore && (
              <button
                data-testid={"restore-" + action}
                disabled={loading}
                onClick={() => onRestoreOriginal(action)}
              >
                {t("Restore original")}
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
