import React, { useCallback, useEffect, useRef } from "react";
import { useNavigationStore } from "@/states/navigationStore";
import { useKAGScenarioStore } from "@/states/kagScenarioStore";
import { XMarkIcon } from "@heroicons/react/24/solid";

export const Log: React.FC = () => {
  const { navigation, setNavigation } = useNavigationStore();
  const logs = useKAGScenarioStore(s => s.logs);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    setNavigation({
      ...navigation,
      isLogOpen: false,
    });
  }, [navigation, setNavigation]);

  // ログが開かれたときに最下部までスクロール
  useEffect(() => {
    if (navigation.isLogOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [navigation.isLogOpen]);

  if (!navigation.isLogOpen) {
    return null;
  }

  return (
    <div className="absolute top-0 left-0 z-[100] flex items-center justify-center w-full h-full bg-black bg-opacity-80 backdrop-blur-sm p-8">
      <div className="relative flex flex-col w-full max-w-4xl h-full bg-black bg-opacity-60 border border-white border-opacity-20 rounded-lg shadow-2xl overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-white border-opacity-10 bg-white bg-opacity-5">
          <h2 className="text-white text-lg font-bold tracking-widest">LOG</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-white hover:bg-opacity-10 rounded-full transition-colors"
          >
            <XMarkIcon className="size-6 text-white" />
          </button>
        </div>

        {/* ログ一覧 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white">
          {logs.map((log, i) => (
            <div key={i} className="flex flex-col gap-1 border-l-2 border-white border-opacity-10 pl-4 py-1">
              {log.speakerName && (
                <span className="text-white text-xs font-bold opacity-60 tracking-wider">
                  {log.speakerName.toUpperCase()}
                </span>
              )}
              <p className={`text-white text-sm leading-relaxed ${!log.speakerName ? "italic opacity-80" : ""}`}>
                {log.text}
              </p>
            </div>
          ))}

          {logs.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-white text-opacity-40 text-sm tracking-widest italic">NO LOGS AVAILABLE</p>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-4 bg-white bg-opacity-5 border-t border-white border-opacity-10 text-right">
          <button onClick={handleClose} className="text-white text-xs opacity-60 hover:opacity-100 transition-opacity">
            CLOSE [ESC]
          </button>
        </div>
      </div>
    </div>
  );
};
