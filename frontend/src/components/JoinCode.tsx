import { useLanguage } from "../context/LanguageContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

function JoinCode() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [code, setCode] = useState("");
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column" /* Stacks text above input group */,
        alignItems: "center",
        justifyContent: "center",
        height: "35vh",
        zIndex: 1,
        position: "relative",
        backgroundColor: "rgb(137, 100, 100)",
        borderRadius: "20%",
        border: "1px solid black",
      }}
    >
      <h1
        style={{
          marginBottom: "20px",
          color: "white",
          textShadow: "2px 2px 4px #000",
          marginRight: "10px",
          marginLeft: "10px",
        }}
      >
        {language === "en"
          ? "Enter the join code or scan QR code:"
          : "Skriv inn kode eller skann QR-kode:"}
      </h1>

      {/* Inner container for side-by-side Input and Button */}
      <div style={{ display: "flex", flexDirection: "row", gap: "10px" }}>
        <input
          type="text"
          placeholder={language === "en" ? "Join Code" : "Kode"}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{
            padding: "10px",
            fontSize: "16px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            marginLeft: "10px",
            textTransform: "uppercase",
          }}
        />
        <button
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            cursor: "pointer",
            borderRadius: "4px",
            border: "none",
            backgroundColor: "rgb(195, 190, 190)",
            fontWeight: "bold",
            marginRight: "10px",
          }}
          onClick={() => {
            // 3. Save to Session Storage
            if (code.trim()) {
              sessionStorage.setItem("gameCode", code.toUpperCase());
              console.log(code);
              navigate("/PlayerLogin");
            } else {
              alert("Please enter a code");
            }
          }}
        >
          {language === "en" ? "Join" : "Bli med"}
        </button>
      </div>
    </div>
  );
}

export default JoinCode;
