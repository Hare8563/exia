import React from "react";
import { useCallback, useMemo } from "react";
import { useNavigationStore } from "@/states/navigationStore";
import { useSkipActionStore } from "@/states/skipActionStore";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import { SkipModal } from "../Modal/SkipModal";

type NavigationItem = {
  label: string;
  action?: () => void;
};

export const Navigation: React.FC = () => {
  const { navigation, setNavigation } = useNavigationStore();
  const { skipAction } = useSkipActionStore();
  const { skipToNextChoice } = skipAction;

  const handleAutoPlay = useCallback(() => {
    setNavigation({
      ...navigation,
      isAutoPlay: !navigation.isAutoPlay,
    });
  }, [navigation, setNavigation]);

  const handleLogOpen = useCallback(() => {
    setNavigation({
      ...navigation,
      isLogOpen: true,
    });
  }, [navigation, setNavigation]);

  const handleSkipOpen = useCallback(() => {
    setNavigation({
      ...navigation,
      isSkipModalOpen: true,
    });
  }, [navigation, setNavigation]);

  const handleSkipClose = useCallback(() => {
    setNavigation({
      ...navigation,
      isSkipModalOpen: false,
    });
  }, [navigation, setNavigation]);

  const handleSkipConfirm = useCallback(() => {
    // スキップを実行
    skipToNextChoice();
    // モーダルを閉じる
    handleSkipClose();
  }, [skipToNextChoice, handleSkipClose]);

  // ナビゲーションアイテムをメモ化
  const items = useMemo<NavigationItem[]>(
    () => [
      { label: "SAVE" },
      { label: "LOAD" },
      { label: "AUTO", action: handleAutoPlay },
      { label: "SKIP", action: handleSkipOpen },
      { label: "LOG", action: handleLogOpen },
      { label: "GITHUB", action: () => window.open("https://github.com/kokushin/exia") },
      // { label: "CONFIG" },
    ],
    [handleAutoPlay, handleLogOpen, handleSkipOpen]
  );

  return (
    <>
      <nav className="absolute top-0 right-0 z-50 flex items-center gap-4 text-white text-sm p-4">
        {items.map((item, i) => (
          <button
            onClick={() => {
              if (item.action) {
                item.action();
              } else {
                window.alert("まだ未実装です😭");
              }
            }}
            key={i}
            className="relative"
            style={{
              textShadow: "1px 1px 0 rgba(0,0,0,.5)",
            }}
          >
            {item.label === "AUTO" && navigation.isAutoPlay && (
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <ArrowPathIcon className="size-4 text-white animate-spin" />
              </span>
            )}
            <span className={item.label === "AUTO" && navigation.isAutoPlay ? "opacity-30" : ""}>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* スキップ確認モーダル */}
      <SkipModal isOpen={navigation.isSkipModalOpen} onClose={handleSkipClose} onConfirm={handleSkipConfirm} />
    </>
  );
};
