import React from "react";
import i18n from "../i18n";

export default function AutoText({ children }) {
  if (!children) return null;

  const text = String(children).trim();
  const translated = i18n.autoTranslate(text);
  return <>{translated}</>;
}
