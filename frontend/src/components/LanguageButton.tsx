import "./styles/General.css";
import { useState } from "react";
import { useLanguage, type Language } from "../context/LanguageContext";
import usFlag from "../assets/flags/us.png";
import noFlag from "../assets/flags/no.png";
import esFlag from "../assets/flags/es.png";
import frFlag from "../assets/flags/fr.png";
import itFlag from "../assets/flags/it.png";
import cnFlag from "../assets/flags/cn.png";
import jpFlag from "../assets/flags/jp.png";
import deFlag from "../assets/flags/de.png";

const LANGUAGES: { code: Language; flag: string; label: string }[] = [
  { code: "en", flag: usFlag, label: "English" },
  { code: "no", flag: noFlag, label: "Norsk" },
  { code: "de", flag: deFlag, label: "Deutsch" },
  { code: "es", flag: esFlag, label: "Español" },
  { code: "fr", flag: frFlag, label: "Français" },
  { code: "it", flag: itFlag, label: "Italiano" },
  { code: "cn", flag: cnFlag, label: "中文" },
  { code: "jp", flag: jpFlag, label: "日本語" },
];

type Props = {
  variant?: "host" | "player";
};

function LanguageButton({ variant = "host" }: Props) {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);

  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  const handleSelect = (code: Language) => {
    setLanguage(code);
    setOpen(false);
  };

  const button =
    variant === "host" ? (
      <div
        className="start-game-container"
        style={{ width: "100px", borderColor: "black", marginTop: "30px" }}
      >
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="start-game-button"
          style={{
            borderRadius: "40%",
            backgroundColor: "rgba(211, 196, 196, 0.95)",
            border: "3px solid black",
            height: "95px",
          }}
        >
          <img
            src={current.flag}
            alt={current.label}
            style={{ width: "95%", borderRadius: "20%" }}
          />
        </button>
      </div>
    ) : (
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="language-toggle-button"
      >
        <img src={current.flag} alt={current.label} className="flag-img" />
      </button>
    );

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {button}

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 99 }}
          />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              ...(variant === "player" ? { left: 0 } : { right: 0 }),
              backgroundColor: "rgba(30, 30, 30, 0.95)",
              border: "2px solid black",
              borderRadius: "10px",
              padding: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              zIndex: 100,
              minWidth: "120px",
            }}
          >
            {LANGUAGES.map(({ code, flag, label }) => (
              <button
                key={code}
                onClick={() => handleSelect(code)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background:
                    code === language ? "rgba(255,255,255,0.2)" : "transparent",
                  border: "none",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  cursor: "pointer",
                  color: "white",
                  fontSize: "0.95rem",
                  fontWeight: code === language ? "bold" : "normal",
                }}
              >
                <img
                  src={flag}
                  alt={label}
                  style={{
                    width: "32px",
                    height: "22px",
                    objectFit: "cover",
                    borderRadius: "3px",
                  }}
                />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default LanguageButton;
