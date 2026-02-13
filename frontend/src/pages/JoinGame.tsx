import LanguageButton from "../components/LanguageButton";
import MusicButton from "../components/MusicButton";
import PokerBackground from "../components/PokerBackground";
import JoinCode from "../components/JoinCode";

function JoinGame() {
  return (
    <>
      <div
        className="welcome-page"
        style={{
          position: "relative",
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
          // Add these 4 lines to center the content:
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
        }}
      >
        <PokerBackground />
        <JoinCode />
      </div>
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
    </>
  );
}

export default JoinGame;
