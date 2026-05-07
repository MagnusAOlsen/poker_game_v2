import aces from "../assets/aces.png";

//Picture of the Aces at the Login screen in players device
function Aces() {
  return (
    <div>
      <img
        src={aces}
        style={{
          maxWidth: "100%",
          maxHeight: "60vh",
          objectFit: "contain",
        }}
      />
    </div>
  );
}

export default Aces;
