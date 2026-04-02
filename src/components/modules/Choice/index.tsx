import React from "react";
import { ScenarioChoice } from "@/types";

type ChoiceProps = {
  choices: ScenarioChoice[];
  onSelect: (choice: ScenarioChoice) => void;
};

export const Choice: React.FC<ChoiceProps> = ({ choices, onSelect }) => {
  return (
    <div className="fixed inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-auto"
      style={{ gap: 25 }}>
      {choices.map((choice, index) => (
        <button
          key={index}
          onClick={() => onSelect(choice)}
          className="w-full pointer-events-auto"
          style={{
            maxWidth: 656,
            height: 63,
            background: "#F2F3F5",
            borderRadius: 2,
            border: "none",
            filter: "drop-shadow(0px 4px 4px rgba(0,0,0,0.25)) drop-shadow(0px 4px 4px rgba(0,0,0,0.25))",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: "'Rounded Mplus 1c', sans-serif",
              fontWeight: 500,
              fontSize: 24,
              color: "#364A63",
              textAlign: "center",
            }}
          >
            {choice.text}
          </span>
        </button>
      ))}
    </div>
  );
};

export default Choice;
