import React, { useState } from "react";
import { ScenarioChoice } from "@/types";

type ChoiceProps = {
  choices: ScenarioChoice[];
  onSelect: (choice: ScenarioChoice) => void;
};

const BTN: React.CSSProperties = {
  width: 621,
  height: 63,
  borderRadius: 5,
  border: "1px solid #364A63",
  boxShadow: "0px 8px 4px rgba(0, 0, 0, 0.25)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  transform: "skewX(-22deg)",
  flexShrink: 0,
};

const SPAN: React.CSSProperties = {
  fontFamily: "'Rounded Mplus 1c', sans-serif",
  fontWeight: 500,
  fontSize: 24,
  lineHeight: "36px",
  transform: "skewX(22deg)",
  display: "inline-block",
};

export const Choice: React.FC<ChoiceProps> = ({ choices, onSelect }) => {
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);

  return (
    <div
      className="fixed inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-auto"
      style={{ gap: 16 }}
    >
      {choices.map((choice, index) => {
        const pressed = pressedIndex === index;
        return (
          <button
            key={index}
            onClick={() => onSelect(choice)}
            onMouseDown={() => setPressedIndex(index)}
            onMouseUp={() => setPressedIndex(null)}
            onMouseLeave={() => setPressedIndex(null)}
            style={{
              ...BTN,
              background: pressed
                ? "linear-gradient(90deg, #75DCFF 0%, #AAE1F6 50.48%, #75DCFF 100%)"
                : "linear-gradient(90deg, #F3F5F7 0%, #D6EAF1 83%, #CADDE6 85%, #C8DEE8 100%)",
            }}
          >
            <span style={{ ...SPAN, color: pressed ? "#2E4B73" : "#364A63" }}>
              {choice.text}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default Choice;
