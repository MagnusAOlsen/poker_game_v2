import "../components/styles/PlayerPlaying.css";
import "../components/styles/General.css";
import type { Player } from "../types/Player";
import SliderInput from "../components/SliderInput";
import { useState, useEffect, useRef } from "react";
import type { Card } from "../types/Card";
import { useT } from "../i18n/translations";
import LanguageButton from "../components/LanguageButton";
import handRanking from "../assets/hand_ranking.png";

function PlayerPlaying() {
  const socketRef = useRef<WebSocket | null>(null);
  const playerNameRef = useRef<string | null>(null);
  const t = useT();

  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const [isMyTurnMessage, setIsMyTurnMessage] = useState(false);
  const [isRaiseActive, setIsRaiseActive] = useState(false);
  const [showFoldedCards, setShowFoldedCards] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isLastStanding, setIsLastStanding] = useState(false);
  const [minRaise, setMinRaise] = useState(0);

  const canAct =
    isMyTurnMessage &&
    myPlayer !== null &&
    !myPlayer.hasFolded &&
    !isRaiseActive;

  const buyInorLeave =
    !isMyTurnMessage && myPlayer !== null && !isRaiseActive && !showFoldedCards;

  useEffect(() => {
    const socket = new WebSocket(
      import.meta.env.VITE_WS_URL || "ws://localhost:3000"
    );
    socketRef.current = socket;

    socket.onopen = () => {
      const playerName = sessionStorage.getItem("currentPlayer");
      playerNameRef.current = playerName;
      const gameCode = sessionStorage.getItem("gameCode");
      if (playerName) {
        socket.send(
          JSON.stringify({
            type: "reconnect",
            name: playerName,
            gameCode: gameCode,
          })
        );
      }
    };

    socket.onmessage = (msg) => {
      const data = JSON.parse(msg.data);

      if (data.type === "player") {
        setMyPlayer(data.player);
        sessionStorage.setItem("myPlayer", JSON.stringify(data.player));
        if (data.isMyTurn) {
          setIsMyTurnMessage(true);
          sessionStorage.setItem("isMyTurn", "true");
        }
      } else if (data.type === "players") {
        if (data.minRaise !== undefined) {
          setMinRaise(data.minRaise);
        }
      } else if (data.type === "yourTurn") {
        setIsRaiseActive(false);
        setShowFoldedCards(false);
        setIsMyTurnMessage(true);
        setMinRaise(data.minRaise);
        sessionStorage.setItem("isMyTurn", "true");
      } else if (data.type === "showFoldedCards") {
        setIsLastStanding(data.isLastStanding);
        setShowFoldedCards(true);
      }
    };

    return () => socket.close();
  }, []);

  const sendMove = (action: string, amount?: number, minRaise?: number) => {
    if (socketRef.current && myPlayer) {
      socketRef.current.send(
        JSON.stringify({ type: action, amount: amount, minRaise: minRaise })
      );
    }
    setIsMyTurnMessage(false);
    sessionStorage.setItem("isMyTurn", "false");
  };

  const sendShownCards = (action: string) => {
    if (socketRef.current && myPlayer) {
      socketRef.current.send(JSON.stringify({ type: action }));
    }
    setShowFoldedCards(false);
  };

  const getCardImage = (card: Card): string => {
    return `../cards/${card.suit[0].toUpperCase()}${card.rank}.png`;
  };

  return (
    <div className="player-playing-container">
      <div className="top-bar">
        <LanguageButton variant="player" />
        <img
          src={`../avatars/${myPlayer?.avatar}.png`}
          alt="Avatar"
          className="avatar-img"
        />
        <h1 className="player-name">
          {myPlayer?.name}: {myPlayer?.chips} kr
        </h1>
      </div>
      <div className={`card-row`}>
        {myPlayer?.hand?.map((card: Card, i: number) => (
          <img
            key={i}
            src={getCardImage(card)}
            className="card-img"
            alt={`Card ${i}`}
          />
        ))}

        {myPlayer?.hasFolded && <div className="fold-overlay" />}
      </div>
      {showInfo && (
        <div
          className="info-modal"
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 9999,
            padding: "2px",
            borderRadius: "8px",
          }}
        >
          <img
            src={handRanking}
            alt="Hand Ranking"
            style={{ maxWidth: "90vw", maxHeight: "90vh" }}
          />
        </div>
      )}
      {canAct && (
        <div className="action-buttons">
          <button onClick={() => sendMove("call")} className="action-button">
            {t.call}
          </button>
          <button
            onClick={() => setIsRaiseActive(true)}
            className="action-button"
          >
            {t.raise}
          </button>
          <button
            onClick={() => sendMove("fold")}
            className="fold-leave-button"
          >
            {t.fold}
          </button>
        </div>
      )}
      {buyInorLeave && (
        <div className="buyin-leave-buttons">
          {myPlayer.chips < 150 && (
            <button onClick={() => sendMove("addOn")} className="action-button">
              {myPlayer?.chips === 0 ? t.rebuy : t.addOn}
            </button>
          )}
          <button
            onClick={() => sendMove("leave")}
            className="fold-leave-button"
          >
            {t.leaveGame}
          </button>
        </div>
      )}
      {!isRaiseActive && (
        <div className="info-button">
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="action-button"
          >
            {t.handRanking}
          </button>
        </div>
      )}

      {showFoldedCards && (
        <div className="folded-cards-buttons">
          <button
            onClick={() => sendShownCards("showBothCards")}
            className="action-button"
          >
            {t.showBothCards}
          </button>
          <button
            onClick={() => sendShownCards("showLeftCard")}
            className={isLastStanding ? "action-button" : "fold-leave-button"}
          >
            {t.showLeftCard}
          </button>
          <button
            onClick={() => sendShownCards("showRightCard")}
            className={isLastStanding ? "action-button" : "fold-leave-button"}
          >
            {t.showRightCard}
          </button>

          <button
            onClick={() => sendShownCards("showNone")}
            className={isLastStanding ? "action-button" : "fold-leave-button"}
          >
            {t.showNone}
          </button>
        </div>
      )}
      {isRaiseActive && (
        <div className="raise-slider-wrapper">
          <SliderInput
            min={minRaise}
            max={(myPlayer?.chips || 0) + (myPlayer?.currentBet || 0)}
            initialValue={minRaise}
            onConfirm={(value) => {
              sendMove("raise", value, minRaise);
              setIsRaiseActive(false);
            }}
            onReject={() => {
              setIsRaiseActive(false);
              setIsMyTurnMessage(true);
              sessionStorage.setItem("isMyTurn", "true");
            }}
          />
        </div>
      )}
    </div>
  );
}

export default PlayerPlaying;
