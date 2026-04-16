import "./styles/General.css";
import startIcon from "../assets/play_button.png";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Player } from "../types/Player";
import { useLanguage } from "../context/LanguageContext";

type Props = {
  currentPlayers: Player[];
  onStartGame: (chips: number) => void;
};

function StartGameButton({ currentPlayers, onStartGame }: Props) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  const [startingChips, setStartingChips] = useState(500);

  const handleButtonClick = () => {
    setShowModal(true);
  };

  const handleConfirm = () => {
    setShowModal(false);
    onStartGame(startingChips);
    navigate("/HostPlaying", { state: { currentPlayers } });
  };

  const handleCancel = () => {
    setShowModal(false);
  };

  return (
    <>
      <div
        className="start-game-container"
        style={{ width: "100px", borderColor: "black", marginTop: "30px" }}
      >
        <button
          onClick={handleButtonClick}
          className="start-game-button"
          style={{
            borderRadius: "40%",
            backgroundColor: "rgba(211, 196, 196, 0.95)",
            border: "3px solid black",
          }}
        >
          <img src={startIcon} alt="Start Icon" style={{ width: "100%" }} />
        </button>
      </div>

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(30, 60, 30, 0.97)",
              border: "3px solid black",
              borderRadius: "16px",
              padding: "32px 40px",
              minWidth: "320px",
              color: "white",
              textAlign: "center",
              fontFamily: "inherit",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: "20px" }}>
              {language === "en" ? "Game Settings" : "Spillinnstillinger"}
            </h2>

            <div
              style={{
                backgroundColor: "rgba(255,255,255,0.1)",
                borderRadius: "10px",
                padding: "12px 20px",
                marginBottom: "24px",
                fontSize: "1rem",
              }}
            >
              <p style={{ margin: "4px 0" }}>
                {language === "en" ? "Small blind:" : "Liten blind:"}{" "}
                <strong>1 chip</strong>
              </p>
              <p style={{ margin: "4px 0" }}>
                {language === "en" ? "Big blind:" : "Stor blind:"}{" "}
                <strong>2 chips</strong>
              </p>
            </div>

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "1rem",
              }}
            >
              {language === "en" ? "Starting stack:" : "Startstack:"}{" "}
              <strong>{startingChips} chips</strong>
            </label>
            <input
              type="range"
              min={100}
              max={1500}
              step={50}
              value={startingChips}
              onChange={(e) => setStartingChips(Number(e.target.value))}
              style={{ width: "100%", marginBottom: "24px" }}
            />

            <div
              style={{ display: "flex", gap: "12px", justifyContent: "center" }}
            >
              <button
                onClick={handleCancel}
                className="fold-leave-button"
                style={{ width: "120px", margin: 0 }}
              >
                {language === "en" ? "Cancel" : "Avbryt"}
              </button>
              <button
                onClick={handleConfirm}
                className="action-button"
                style={{ width: "120px", margin: 0 }}
              >
                {language === "en" ? "Start" : "Start"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default StartGameButton;
