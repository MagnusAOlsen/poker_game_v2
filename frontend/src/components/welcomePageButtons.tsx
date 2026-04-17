import { useT } from "../i18n/translations";
import { useNavigate } from "react-router-dom";
import "./styles/welcomePageButtons.css";
import Aces from "../assets/aces.png";
import Chips from "../assets/poker_chips.png";

function welcomePageButtons() {
  const navigate = useNavigate();
  const t = useT();

  return (
    <div className="welcome-page-buttons">
      <button
        onClick={() => navigate("/HostWaiting")}
        className="welcome-button"
      >
        {t.createGame}
        <img className="avatarAces" src={Aces} />
      </button>
      <button onClick={() => navigate("/JoinGame")} className="welcome-button">
        {t.joinGame}
        <img className="avatarChips" src={Chips} />
      </button>
    </div>
  );
}
export default welcomePageButtons;
