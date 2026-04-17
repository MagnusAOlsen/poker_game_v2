import "./styles/LoginField.css";
import type { Player } from "../types/Player";
import AnimatedEllipsis from "./animatedEllipsis.tsx";
import { useT } from "../i18n/translations";
import { QRCodeSVG } from "qrcode.react";

type LoginFieldProps = {
  currentPlayers: Player[];
  gameCode: string;
};

function LoginField({ currentPlayers, gameCode }: LoginFieldProps) {
  const t = useT();

  const baseUrl = window.location.origin;
  const joinUrl = `${baseUrl}/PlayerLogin?code=${gameCode}`;

  return (
    <>
      <div className="login-field">
        <h1>{t.scanQr} {gameCode}</h1>
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

        <h2>{t.currentPlayers}</h2>
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
            {t.waitingForPlayers}
            <AnimatedEllipsis />
          </p>
        )}
        {currentPlayers.length === 7 && <p>{t.lobbyFull}</p>}
      </div>
      <button className="startGame" />
    </>
  );
}

export default LoginField;
