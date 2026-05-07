import "../components/styles/General.css";
import Playing from "../components/Playing";
import { useLocation } from "react-router-dom";
import type { Player } from "../types/Player";
import { useState, useEffect, useRef } from "react";
import type { Card } from "../types/Card";
import MusicButton from "../components/MusicButton.tsx";
import LanguageButton from "../components/LanguageButton.tsx";
import ShowdownResults, {
  type ShowdownResult,
} from "../components/ShowdownResults";
import { getWsUrl } from "../wsUrl";

function HostPlaying() {
  const location = useLocation();
  const socketRef = useRef<WebSocket | null>(null);
  const [currentPlayers, setCurrentPlayers] = useState<Player[]>(() => {
    return (
      (location.state as { currentPlayers?: Player[] })?.currentPlayers ||
      (JSON.parse(sessionStorage.getItem("currentPlayers") || "[]") as Player[])
    );
  });
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [potSize, setPotSize] = useState<number>(() => {
    return JSON.parse(sessionStorage.getItem("potSize") || "0") as number;
  });
  const [shuffling, setShuffling] = useState<boolean>(false);
  const [currentTurnName, setCurrentTurnName] = useState<string | null>(null);
  const [showdownResults, setShowdownResults] = useState<ShowdownResult[] | null>(
    null
  );

  useEffect(() => {
    sessionStorage.setItem("currentPlayers", JSON.stringify(currentPlayers));
    const socket = new WebSocket(getWsUrl());
    socketRef.current = socket;
    setShuffling(false);

    socket.onopen = () => {
      const gameCode = sessionStorage.getItem("gameCode");
      if (gameCode) {
        socket.send(JSON.stringify({ type: "reconnectHost", code: gameCode }));
      }
    };

    socket.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.type === "players") {
        setCurrentPlayers(data.players);
        sessionStorage.setItem("currentPlayers", JSON.stringify(data.players));
      } else if (data.type === "communityCards") {
        setShuffling(false);
        setCommunityCards(data.cards);
        sessionStorage.setItem("communityCards", JSON.stringify(data.cards));
        setPotSize(data.potSize || 0);
        sessionStorage.setItem("potSize", JSON.stringify(data.potSize || 0));
      } else if (data.type === "shuffling") {
        setShuffling(true);
        setShowdownResults(null);
      } else if (data.type === "currentTurn") {
        setCurrentTurnName(data.name ?? null);
      } else if (data.type === "showdownResults") {
        setShowdownResults(data.results as ShowdownResult[]);
      } else if (data.type === "players") {
        setShuffling(false);
        setCurrentPlayers(data.players);
        sessionStorage.setItem("currentPlayers", JSON.stringify(data.players));
        setCommunityCards(
          sessionStorage.getItem("communityCards")
            ? JSON.parse(sessionStorage.getItem("communityCards") || "[]")
            : []
        );
      }
    };

    return () => socket.close();
  }, []);

  return (
    <div>
      <Playing
        playersPlaying={currentPlayers}
        communityCards={communityCards}
        potSize={potSize}
        shuffling={shuffling}
        gameCode={sessionStorage.getItem("gameCode") || ""}
        currentTurnName={currentTurnName}
      />
      {showdownResults && showdownResults.length > 0 && (
        <ShowdownResults results={showdownResults} />
      )}
      <div
        style={{
          position: "absolute",
          top: "0",
          right: "0",
          display: "flex",
          gap: "10px",
          padding: "10px 15px",
          zIndex: 10,
          borderBottomLeftRadius: "12px",
        }}
      >
        <LanguageButton />
        <MusicButton />
      </div>
      <p style={{ position: "absolute", bottom: 8, left: 10, zIndex: 10, fontSize: 11, color: "#000", margin: 0 }}>
        Image by Freepik
      </p>
    </div>
  );
}

export default HostPlaying;
