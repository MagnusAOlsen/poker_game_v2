import "./styles/LoginField.css";
import type { Player } from "../types/Player";
import AnimatedEllipsis from "./animatedEllipsis.tsx";
import { useLanguage } from "../context/LanguageContext";
import { QRCodeSVG } from "qrcode.react";

type LoginFieldProps = {
  currentPlayers: Player[];
  gameCode: string;
};

function LoginField({ currentPlayers, gameCode }: LoginFieldProps) {
  const { language } = useLanguage();

  const baseUrl = window.location.origin;
  const joinUrl = `${baseUrl}/PlayerLogin?code=${gameCode}`;

  return (
    <>
      <div className="login-field">
        {language === "en" ? (
          <h1>
            Scan QR-code to join or use the game code! Game code: {gameCode}
          </h1>
        ) : (
          <h1>
            Skann QR-koden for å bli med eller bruk spillkoden! Spillkode:{" "}
            {gameCode}
          </h1>
        )}
        {gameCode !== "..." && (
          <div
            style={{
              background: "white",
              padding: "12px",
              borderRadius: "12px",
              display: "inline-block",
            }}
          >
            <QRCodeSVG value={joinUrl} size={220} />
          </div>
        )}

        {language === "en" ? <h2>Current Players:</h2> : <h2>Spillere:</h2>}
        <ul>
          {currentPlayers.map((player, index) => (
            <li key={index} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              {player.avatar && (
                <img
                  src={`../avatars/${player.avatar}.png`}
                  alt={player.avatar}
                  style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }}
                />
              )}
              {player.name}
            </li>
          ))}
        </ul>
        {currentPlayers.length < 7 && (
          <p>
            {language === "en"
              ? "Waiting for players to join"
              : "Venter på at spillere skal bli med"}
            <AnimatedEllipsis />
          </p>
        )}
        {currentPlayers.length === 7 &&
          (language === "en" ? (
            <p>Lobby full! Let's start</p>
          ) : (
            <p>Lobby er full! La oss starte</p>
          ))}
      </div>
      <button className="startGame" />
    </>
  );
}

export default LoginField;
