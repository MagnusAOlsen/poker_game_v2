import "./styles/ShowdownResults.css";
import type { Card } from "../types/Card";
import { useT } from "../i18n/translations";

export type ShowdownResult = {
  name: string;
  cards: Card[];
  handRank: number;
  place: number;
};

type ShowdownResultsProps = {
  results: ShowdownResult[];
};

const getCardImage = (card: Card): string => {
  return `../cards/${card.suit[0].toUpperCase()}${card.rank}.png`;
};

const placeLabel = (place: number): string => {
  const j = place % 10;
  const k = place % 100;
  if (j === 1 && k !== 11) return `${place}st`;
  if (j === 2 && k !== 12) return `${place}nd`;
  if (j === 3 && k !== 13) return `${place}rd`;
  return `${place}th`;
};

function ShowdownResults({ results }: ShowdownResultsProps) {
  const t = useT();
  return (
    <div className="showdown-results-overlay">
      <div className="showdown-results-box">
        {results.map((row, i) => (
          <div className="showdown-row" key={i}>
            <div className="showdown-place">{placeLabel(row.place)}</div>
            <div className="showdown-cards">
              {row.cards.map((card, j) => (
                <img
                  key={j}
                  src={getCardImage(card)}
                  alt={`${card.rank} of ${card.suit}`}
                  className="showdown-card"
                />
              ))}
            </div>
            <div className="showdown-name">
              {row.name} - {t.handRanks[row.handRank] ?? ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ShowdownResults;
