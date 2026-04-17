import "../components/styles/General.css";
import "../components/styles/PlayerLogin.css";
import Aces from "../components/Aces.tsx";
import UserNameField from "../components/UsernameField.tsx";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AnimatedEllipsis from "../components/animatedEllipsis.tsx";
import { useT } from "../i18n/translations";
import LanguageButton from "../components/LanguageButton.tsx";

function PlayerLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [playerName, setPlayerName] = useState(() => {
    return sessionStorage.getItem("currentPlayer") || "";
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [avatar, setAvatar] = useState(() => {
    return sessionStorage.getItem("avatar") || "";
  });

  const t = useT();
  const [gameCode, setGameCode] = useState(() => {
    const urlCode = searchParams.get("code");
    const storedCode = sessionStorage.getItem("gameCode");
    return urlCode || storedCode || "...";
  });

  const listOfAvatars: string[] = [
    "batman_logo",
    "lion",
    "lsk",
    "messi",
    "pizza",
    "professor",
    "red_bull",
    "spiderman",
  ];

  const [isReady, setIsReady] = useState(() => {
    return sessionStorage.getItem("ready") === "true";
  });
  const [avatarPath, setAvatarPath] = useState(() => {
    const storedAvatar = sessionStorage.getItem("avatarPath");
    return storedAvatar || `../avatars/${listOfAvatars.at(currentIndex)}.png`;
  });
  const [waitingMessage, setWaitingMessage] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const urlCode = searchParams.get("code");
    if (urlCode) {
      sessionStorage.setItem("gameCode", urlCode);
      setGameCode(urlCode);
    } else {
      const storedCode = sessionStorage.getItem("gameCode");
      if (storedCode) {
        setGameCode(storedCode);
      }
    }

    sessionStorage.setItem("ready", isReady.toString());
    sessionStorage.setItem("currentPlayer", playerName);

    const socket = new WebSocket(
      import.meta.env.VITE_WS_URL || "ws://localhost:3000"
    );
    socketRef.current = socket;

    socket.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.type === "gameStarted") {
        navigate("/PlayerPlaying");
      } else if (data.type === "stillWaiting") {
        setWaitingMessage(true);
      }
    };

    return () => socket.close();
  }, []);

  const handleSubmit = (name: string) => {
    if (!socketRef.current || !name) {
      return;
    }
    sessionStorage.setItem("currentPlayer", name);
    setPlayerName(name);
    sessionStorage.setItem("ready", "true");
    setIsReady(true);
    socketRef.current.send(
      JSON.stringify({ type: "join", name, gameCode: gameCode })
    );
  };

  const chooseAvatar = () => {
    if (!socketRef.current || !playerName) return;
    sessionStorage.setItem(
      "avatar",
      JSON.stringify(listOfAvatars.at(currentIndex) || "")
    );
    setAvatar(listOfAvatars.at(currentIndex) || "");
    socketRef.current.send(
      JSON.stringify({
        type: "chooseAvatar",
        avatar: listOfAvatars.at(currentIndex) || "",
        playerName: playerName,
      })
    );
  };

  const viewAvatar = (index: number): void => {
    let index2: number;
    if (currentIndex + index < 0) {
      index2 = listOfAvatars.length - 1;
    } else {
      index2 = (currentIndex + index) % listOfAvatars.length;
    }
    setAvatarPath(`../avatars/${listOfAvatars[index2]}.png`);
    setCurrentIndex(index2);
  };

  return (
    <div className="player-login-container">
      <div className="aces-wrapper">
        <Aces />
      </div>

      <div className="languageButton">
        <LanguageButton variant="player" />
      </div>

      {!isReady ? (
        <div className="username-form-wrapper">
          <UserNameField onSubmit={handleSubmit} />
        </div>
      ) : (
        <div className="player-ready-wrapper">
          <h2 className="player-ready-title">
            {t.readyToPlay(playerName)}
          </h2>

          {avatar === "" ? (
            <div>
              <p>{t.chooseAvatar}</p>
              <div className="avatar-controls">
                <button
                  onClick={() => viewAvatar(-1)}
                  className="avatar-button"
                >
                  ◀
                </button>
                <img
                  src={avatarPath}
                  alt="avatar preview"
                  className="avatar-image"
                />
                <button onClick={() => viewAvatar(1)} className="avatar-button">
                  ▶
                </button>
              </div>
              <button onClick={chooseAvatar} className="choose-avatar-button">
                {t.choose}
              </button>
            </div>
          ) : (
            <div>
              <img
                src={avatarPath}
                className="avatar-image"
                alt="Selected avatar"
              />
            </div>
          )}

          {!waitingMessage && avatar !== "" && (
            <p className="waiting-text">
              {t.waitingForHost}
              <AnimatedEllipsis />
            </p>
          )}
          {waitingMessage && avatar !== "" && (
            <p className="waiting-text">
              {t.gameFull}
              <AnimatedEllipsis />
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default PlayerLogin;
