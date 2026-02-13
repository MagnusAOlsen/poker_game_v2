import { useLanguage } from "../context/LanguageContext";
import { useNavigate } from "react-router-dom";
import "./styles/welcomePageButtons.css";
import Aces from "../assets/aces.png";
import Chips from "../assets/poker_chips.png";

function welcomePageButtons() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  return (
    <div className="welcome-page-buttons">
      <button
        onClick={() => navigate("/HostWaiting")}
        className="welcome-button"
      >
        {language === "en" ? "Create game" : "Nytt spill"}
        <img className="avatarAces" src={Aces} />
      </button>
      <button onClick={() => navigate("/JoinGame")} className="welcome-button">
        {language === "en" ? "Join game" : "Bli med i et spill"}
        <img className="avatarChips" src={Chips} />
      </button>
    </div>
  );
}
export default welcomePageButtons;
