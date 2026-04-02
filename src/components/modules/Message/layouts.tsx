import { FC } from "react";
import { MessageLayoutProps } from "@/types";

export const DialogueLayout: FC<MessageLayoutProps> = ({ characterName, children, showArrowIcon, isAutoPlay }) => (
  <div
    className="absolute bottom-0 left-0 w-full"
    style={{
      height: 248,
      background: "linear-gradient(360deg, rgba(0, 18, 28, 0.70) 0.0%, rgba(0, 84, 130, 0) 100%)",
    }}
  >
    <div
      className="absolute bottom-0 left-0 w-full px-[133px] pb-8 flex flex-col gap-2"
      style={{ fontFamily: "'Rounded Mplus 1c', sans-serif" }}
    >
      {characterName && (
        <>
          <div
            style={{
              fontFamily: "'Rounded Mplus 1c Bold', sans-serif",
              fontWeight: 700,
              fontSize: 36,
              lineHeight: "53px",
              color: "#FFFFFF",
            }}
          >
            {characterName}
          </div>
          <hr
            data-testid="dialogue-separator"
            className="border-0"
            style={{ height: 1, background: "#FFFFFF", margin: 0 }}
          />
        </>
      )}
      <div
        style={{
          fontWeight: 400,
          fontSize: 24,
          lineHeight: "36px",
          color: "#FFFFFF",
        }}
      >
        {children}&nbsp;
      </div>
    </div>

    {showArrowIcon && !isAutoPlay && (
      <div
        data-testid="dialogue-diamond"
        className="absolute"
        style={{
          width: 22,
          height: 22,
          right: 110,
          bottom: 16,
          background: "#59F0FE",
          border: "4px solid #244B6E",
          transform: "rotate(45deg)",
        }}
      />
    )}
  </div>
);

// ナレーション表示レイアウト（変更なし）
export const NarrationLayout: FC<MessageLayoutProps> = ({ children, showArrowIcon, isAutoPlay }) => (
  <div className="absolute bottom-0 left-0 p-4 w-full text-center">
    <div
      className="relative flex flex-col justify-center items-center gap-4 text-white md:text-lg w-full bg-black bg-opacity-80 min-h-24 py-6 px-4 drop-shadow-md"
      style={{
        textShadow: "1px 1px 0 rgba(0,0,0,.5)",
      }}
    >
      <div className="leading-relaxed">{children}</div>
      {showArrowIcon && !isAutoPlay && (
        <div
          data-testid="dialogue-diamond"
          className="absolute bottom-2 right-2"
          style={{
            width: 22,
            height: 22,
            background: "#59F0FE",
            border: "4px solid #244B6E",
            transform: "rotate(45deg)",
          }}
        />
      )}
    </div>
  </div>
);
