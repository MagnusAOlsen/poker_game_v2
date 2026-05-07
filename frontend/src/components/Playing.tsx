import PokerBackground from "./PokerBackground";
import deck_of_cards from "../assets/deck_of_cards.png";
import PlayerOnBoard from "./PlayerOnBoard";
import type { Player } from "../types/Player";
import type { Card } from "../types/Card";
import thePot from "../assets/poker_chips.png";
import ShuffleAnimation from "./ShuffleAnimation.tsx";
import { useT } from "../i18n/translations";
import { useEffect, useState } from "react";

const STAGE_WIDTH = 1600;
const STAGE_HEIGHT = 900;

type PlayingProps = {
  playersPlaying: Player[];
  communityCards?: Card[];
  potSize: number;
  shuffling: boolean;
  gameCode: string;
  currentTurnName?: string | null;
};

function Playing({
  playersPlaying,
  communityCards,
  potSize,
  shuffling,
  gameCode,
  currentTurnName,
}: PlayingProps) {
  const centerX = 800;
  const centerY = 440;
  const t = useT();
  const curveRadiusX = 150;
  const curveRadiusY = 190;
  const bottomPlayerSpacing = 320;

  const seatPositions: { x: number; y: number }[] = [];

  //Seat 1-2
  for (let i = 0; i < 2; i++) {
    const angle = 1.5 * Math.PI + (i / 1) * (Math.PI / 2); // 270° to 360°
    let x = centerX + 475 + curveRadiusX * Math.cos(angle);
    let y = centerY + curveRadiusY * Math.sin(angle);
    if (i === 0) {
      x -= 140;
      y -= 40;
    } else {
      x -= 38;
      y += 20;
    }
    seatPositions.push({ x, y });
  }

  // Bottom line (seats 3-5)
  for (let i = 0; i < 3; i++) {
    let x = centerX + 1.25 * bottomPlayerSpacing - i * bottomPlayerSpacing;
    let y = centerY + 120 + curveRadiusY;
    x -= 70;
    y -= 15;
    seatPositions.push({ x, y });
  }

  // Left curve last (seats 6–7)
  for (let i = 0; i < 2; i++) {
    const angle = Math.PI + (i / 1) * (Math.PI / 2); // 180° to 270°
    let x = centerX - 350 + curveRadiusX * Math.cos(angle);
    let y = centerY + curveRadiusY * Math.sin(angle);
    if (i !== 0) {
      x += 50;
      y -= 50;
    } else {
      x -= 70;
      y += 30;
    }
    seatPositions.push({ x, y });
  }

  const players = playersPlaying.map((player, i) => {
    const { x, y } = seatPositions[i];
    return (
      <PlayerOnBoard
        key={i}
        x={x}
        y={y}
        player={player}
        isCurrentTurn={!!currentTurnName && player.name === currentTurnName}
      />
    );
  });

  const getCardImage = (card: Card): string => {
    return `../cards/${card.suit[0].toUpperCase()}${card.rank}.png`;
  };

  const [scale, setScale] = useState(1);
  useEffect(() => {
    const updateScale = () => {
      setScale(
        Math.min(
          window.innerWidth / STAGE_WIDTH,
          window.innerHeight / STAGE_HEIGHT
        )
      );
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "rgb(0, 69, 0)", // Example: green background
      }}
    >
      <div
        style={{
          position: "absolute",
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        <PokerBackground />
        {shuffling && <ShuffleAnimation />}
        {!shuffling && (
          <>
            <img
              src={deck_of_cards}
              alt="Deck"
              style={{
                position: "absolute",
                width: "70px",
                top: "20px",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 5,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "20px",
                left: "55%",
                transform: "translateX(50px)", // Positioned to the right of the deck
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                color: "white",
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "bold",
                fontFamily: "monospace",
                zIndex: 5,
                border: "2px solid #FFD700",
              }}
            >
              {t.gameCodeLabel} {gameCode}
            </div>
          </>
        )}

        <div
          className="communityCards"
          style={{
            display: "flex",
            flexDirection: "row",
            position: "absolute",
            top: "30%",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 5,
            marginTop: "90px",
            marginLeft: "20px",
          }}
        >
          {communityCards?.map((card, i) => (
            <img
              key={i}
              src={getCardImage(card)}
              style={{ width: "130px", marginRight: "10px" }}
            />
          ))}
          {potSize > 0 && (
            <div
              style={{
                textAlign: "center",
                marginTop: "10px",
                marginLeft: "20px",
              }}
            >
              <img src={thePot} style={{ width: "75px" }} alt="Pot" />
              <div
                style={{ color: "white", fontWeight: "bold", fontSize: "45px" }}
              >
                {potSize}
              </div>
            </div>
          )}
        </div>
        {players}
      </div>
    </div>
  );
}

export default Playing;
