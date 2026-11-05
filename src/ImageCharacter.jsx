import React from "react";
import { resolveAction } from "../shared/character-images.mjs";
export function ImageCharacter({ character, phase, name, t }) {
  const selected = resolveAction(character?.images, phase);
  return (
    <div
      className="image-stack"
      data-testid="character-images"
      data-active-action={selected || ""}
    >
      {Object.entries(character?.images || {}).map(([action, image]) => (
        <img
          key={action}
          src={image.src}
          alt={name + " · " + t("action." + action)}
          draggable="false"
          aria-hidden={selected !== action}
          className={"state-image " + (selected === action ? "visible" : "")}
          data-action={action}
        />
      ))}
    </div>
  );
}
