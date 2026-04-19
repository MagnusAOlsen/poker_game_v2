interface Props {
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function GetMoreChips({ text, confirmLabel, cancelLabel, onConfirm, onCancel }: Props) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        background: "rgba(0,0,0,0.5)",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: "24px 32px",
          maxWidth: 340,
          textAlign: "center",
          boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
        }}
      >
        <p style={{ marginBottom: 20, color: "#000" }}>{text}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={onConfirm}
            className="action-button"
            style={{ border: "2px solid #22c55e" }}
          >
            {confirmLabel}
          </button>
          <button onClick={onCancel} className="fold-leave-button">
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default GetMoreChips;
