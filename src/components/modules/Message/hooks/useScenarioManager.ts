import { useCallback, useEffect, useRef, useState } from "react";
import { useScenarioStore } from "@/states/scenarioStore";
import { useNavigationStore } from "@/states/navigationStore";
import { resolveJumpTo } from "@/utils/jumpToResolver";
import { loadScenario } from "@/utils/scenarioLoader";
import { CharacterInfo, DisplayLine, FlagLine, JumpLine, ScenarioChoice, ScenarioCondition, ScenarioLogEntry } from "@/types";

function isDisplayLine(line: unknown): line is DisplayLine {
  const t = (line as { type?: unknown }).type;
  return t === 0 || t === 1 || t === 2;
}

export const useScenarioManager = (isLoaded: boolean) => {
  const { scenario, setScenario } = useScenarioStore();
  const { navigation, setNavigation } = useNavigationStore();
  const [isShowingChoices, setIsShowingChoices] = useState(false);

  // キャラクター情報を更新する関数
  const updateCharacterInfo = useCallback((nextLine: DisplayLine, characters: NonNullable<typeof scenario.characters>) => {
    if (nextLine.type === 2 || !nextLine.character || nextLine.character.index === undefined) {
      return characters;
    }

    // 新しいキャラクターオブジェクトを作成
    const updatedCharacter = { ...characters[nextLine.character.index] };

    // 名前が指定されている場合は更新
    if (nextLine.character?.name) {
      updatedCharacter.name = nextLine.character.name;
    }

    // 画像ファイルが指定されている場合は更新
    if (nextLine.character?.imageFile) {
      updatedCharacter.imageFile = nextLine.character.imageFile;
    }

    // アニメーションが指定されている場合は更新
    if (nextLine.character?.animation) {
      updatedCharacter.animation = nextLine.character.animation;
    }

    // 更新されたキャラクター情報で配列を更新
    const newCharacters = [...characters];
    newCharacters[nextLine.character.index] = updatedCharacter;
    return newCharacters;
  }, []);

  // キャラクター情報をログ用に取得
  const getCharacterInfoForLog = useCallback(
    (currentLine: DisplayLine): CharacterInfo | undefined => {
      if (currentLine.type !== 2 && currentLine.character && currentLine.character.index !== undefined && scenario.characters) {
        const character = scenario.characters[currentLine.character.index];
        if (character) {
          return {
            index: currentLine.character.index,
            name: character.name,
            imageFile: character.imageFile,
          };
        }
      }
      return undefined;
    },
    [scenario.characters]
  );

  // 現在の行をログに追加
  const addCurrentLineToLogs = useCallback((): ScenarioLogEntry[] => {
    // ScenarioLogEntry型として扱うために明示的にキャストする
    const updatedLogs = [...scenario.logs] as ScenarioLogEntry[];
    const currentLine = scenario.currentLine;

    if (currentLine) {
      // 重複チェック
      const isAlreadyLogged = updatedLogs.some((log) => log.text === currentLine.text);

      if (!isAlreadyLogged) {
        // 現在の行に関連するキャラクター情報を取得
        const characterInfo = getCharacterInfoForLog(currentLine);

        // キャラクター情報を含めてログに追加
        updatedLogs.push({
          ...currentLine,
          character: characterInfo,
        } as ScenarioLogEntry);
      }
    }

    return updatedLogs;
  }, [scenario.logs, scenario.currentLine, getCharacterInfoForLog]);

  const evaluateCondition = useCallback(
    (condition: ScenarioCondition): string | null => {
      const value = scenario.flags[condition.flag];
      let matched = false;

      if ('equals' in condition && condition.equals !== undefined) {
        matched = value === condition.equals;
      } else if ('gt' in condition && condition.gt !== undefined) {
        matched = typeof value === 'number' && value > condition.gt;
      } else if ('lt' in condition && condition.lt !== undefined) {
        matched = typeof value === 'number' && value < condition.lt;
      }

      if (matched) return condition.then;
      return condition.else ?? null;
    },
    [scenario.flags]
  );

  const performJumpRef = useRef<(jumpTo: string, keepState?: boolean) => Promise<void>>(
    async () => {}
  );

  const advanceToDisplayLine = useCallback(
    async (
      startIndex: number,
      lines: typeof scenario.lines,
      characters: typeof scenario.characters,
      flags: typeof scenario.flags,
      overrides?: {
        id?: string;
        backgroundFile?: string;
        bgmFile?: string;
        currentFilePath?: string;
      }
    ) => {
      let index = startIndex;
      let currentFlags = { ...flags };
      let currentChars = characters ? [...characters] : [];

      while (index < lines.length) {
        const line = lines[index];

        if (line.type === 'flag') {
          currentFlags = { ...currentFlags, ...(line as FlagLine).set };
          index++;
          continue;
        }

        if (line.type === 'jump') {
          const jumpLine = line as JumpLine;
          setScenario((prev) => ({ ...prev, flags: currentFlags }));
          await performJumpRef.current(jumpLine.to, jumpLine.keepState ?? false);
          return;
        }

        if (!isDisplayLine(line)) {
          index++;
          continue;
        }

        const updatedChars = updateCharacterInfo(line, currentChars);
        const charIndex = (line.type !== 2 && line.character !== undefined) ? line.character.index : -1;
        setScenario((prev) => ({
          ...prev,
          ...overrides,
          lines,
          currentLineIndex: index,
          currentLine: line,
          currentCharacterIndex: charIndex,
          characters: updatedChars,
          flags: currentFlags,
        }));
        return;
      }

      setNavigation({ isAutoPlay: false });
    },
    [updateCharacterInfo, setScenario, setNavigation]
  );

  const performJump = useCallback(
    async (jumpTo: string, keepState: boolean = false) => {
      const { filePath, labelId } = resolveJumpTo(jumpTo, scenario.currentFilePath);
      const isSameFile = filePath === scenario.currentFilePath;

      if (isSameFile) {
        const targetIndex = scenario.lines.findIndex((l) => l.id === labelId);
        if (targetIndex === -1) {
          console.error(`[Exia] Label '${labelId}' not found in ${filePath}.json`);
          return;
        }
        await advanceToDisplayLine(targetIndex, scenario.lines, scenario.characters ?? [], scenario.flags);
      } else {
        let loaded;
        try {
          loaded = await loadScenario(filePath);
        } catch (e) {
          console.error(e);
          return;
        }

        const targetIndex = loaded.lines.findIndex((l) => l.id === labelId);
        if (targetIndex === -1) {
          console.error(`[Exia] Label '${labelId}' not found in ${filePath}.json`);
          return;
        }

        const baseCharacters = keepState ? scenario.characters ?? [] : loaded.characters ?? [];
        const baseBackground = keepState ? scenario.backgroundFile : loaded.backgroundFile;
        const baseBgm = keepState ? scenario.bgmFile : loaded.bgmFile;

        await advanceToDisplayLine(
          targetIndex,
          loaded.lines,
          baseCharacters,
          scenario.flags,
          {
            id: loaded.id,
            backgroundFile: baseBackground,
            bgmFile: baseBgm,
            currentFilePath: filePath,
          }
        );
      }
    },
    [scenario, advanceToDisplayLine]
  );

  useEffect(() => {
    performJumpRef.current = performJump;
  }, [performJump]);

  // 次のセリフに進む
  const goToNextLine = useCallback(async () => {
    // 選択肢表示中は、選択されるまで次には進まない
    if (isShowingChoices) return false;

    const currentLine = scenario.currentLine;
    if (!currentLine) return false;

    if (currentLine.type !== 2 && currentLine.jumpTo) {
      const updatedLogs = addCurrentLineToLogs();
      setScenario((prev) => ({ ...prev, logs: updatedLogs }));
      await performJump(currentLine.jumpTo);
      return true;
    }

    if (currentLine.type !== 2 && currentLine.if) {
      const jumpTarget = evaluateCondition(currentLine.if);
      if (jumpTarget) {
        const updatedLogs = addCurrentLineToLogs();
        setScenario((prev) => ({ ...prev, logs: updatedLogs }));
        await performJump(jumpTarget);
        return true;
      }
    }

    const nextLineIndex = scenario.currentLineIndex + 1;
    if (nextLineIndex > scenario.lines.length - 1) {
      setNavigation({ isAutoPlay: false });
      return false;
    }

    const nextLine = scenario.lines[nextLineIndex];

    if (nextLine.type === 'flag' || nextLine.type === 'jump') {
      const updatedLogs = addCurrentLineToLogs();
      setScenario((prev) => ({ ...prev, logs: updatedLogs }));
      await advanceToDisplayLine(nextLineIndex, scenario.lines, scenario.characters ?? [], scenario.flags);
      return true;
    }

    if (!isDisplayLine(nextLine)) return false;

    if (nextLine.type === 2) {
      setIsShowingChoices(true);
    } else {
      setIsShowingChoices(false);
    }

    const updatedCharacters = updateCharacterInfo(nextLine, scenario.characters ? [...scenario.characters] : []);
    const updatedLogs = addCurrentLineToLogs();

    const nextCharIndex = (nextLine.type !== 2 && nextLine.character !== undefined) ? nextLine.character.index : -1;
    setScenario({
      currentLineIndex: nextLineIndex,
      currentLine: nextLine,
      currentCharacterIndex: nextCharIndex,
      characters: updatedCharacters,
      logs: updatedLogs,
    });

    return true;
  }, [
    scenario,
    isShowingChoices,
    performJump,
    evaluateCondition,
    setNavigation,
    addCurrentLineToLogs,
    advanceToDisplayLine,
    updateCharacterInfo,
    setScenario,
  ]);

  // 選択肢が選ばれたときの処理
  const handleChoiceSelect = useCallback(
    async (choice: ScenarioChoice) => {
      setIsShowingChoices(false);
      const updatedLogs = addCurrentLineToLogs();
      updatedLogs.push({ type: 0, text: `選択: ${choice.text}` } as ScenarioLogEntry);
      setScenario((prev) => ({ ...prev, logs: updatedLogs }));
      await performJump(choice.jumpTo);
    },
    [addCurrentLineToLogs, performJump, setScenario]
  );

  // 現在のキャラクターの名前を取得
  const getCurrentCharacterName = useCallback(() => {
    if (scenario.currentCharacterIndex !== -1 && scenario.characters && scenario.characters[scenario.currentCharacterIndex]) {
      return scenario.characters[scenario.currentCharacterIndex].name;
    }
    return undefined;
  }, [scenario.currentCharacterIndex, scenario.characters]);

  // シナリオが終了しているかをチェック
  const isScenarioEnd = useCallback(() => {
    const remaining = scenario.lines.slice(scenario.currentLineIndex + 1);
    return !remaining.some((line) => isDisplayLine(line) || line.type === 'jump');
  }, [scenario.currentLineIndex, scenario.lines]);

  // シナリオをスキップする関数
  const skipToNextChoice = useCallback(() => {
    let updatedLogs = addCurrentLineToLogs();
    let index = scenario.currentLineIndex + 1;
    while (index < scenario.lines.length) {
      const line = scenario.lines[index];
      if (isDisplayLine(line) && line.type === 2) break;
      index++;
    }
    const targetIndex = Math.min(index, scenario.lines.length - 1);
    const nextLine = scenario.lines[targetIndex];

    if (!isDisplayLine(nextLine)) {
      setNavigation({ isAutoPlay: false });
      return undefined;
    }

    for (let i = scenario.currentLineIndex + 1; i < targetIndex; i++) {
      const skipped = scenario.lines[i];
      if (!isDisplayLine(skipped)) continue;
      const isAlreadyLogged = updatedLogs.some((log) => log.text === skipped.text);
      if (!isAlreadyLogged) {
        updatedLogs.push({ ...skipped, character: getCharacterInfoForLog(skipped) } as ScenarioLogEntry);
      }
    }

    if (nextLine.type === 2) setIsShowingChoices(true);

    const updatedCharacters = updateCharacterInfo(nextLine, scenario.characters ? [...scenario.characters] : []);
    const skipCharIndex = (nextLine.type !== 2 && nextLine.character !== undefined) ? nextLine.character.index : -1;
    setScenario({
      currentLineIndex: targetIndex,
      currentLine: nextLine,
      currentCharacterIndex: skipCharIndex,
      characters: updatedCharacters,
      logs: updatedLogs,
    });
    setNavigation({ isAutoPlay: false });
    return nextLine;
  }, [
    scenario,
    addCurrentLineToLogs,
    updateCharacterInfo,
    getCharacterInfoForLog,
    setScenario,
    setNavigation,
  ]);

  // 初期のシナリオをログに追加（一度だけ実行される）
  useEffect(() => {
    if (scenario.currentLine && scenario.logs.length === 0 && isLoaded) {
      const characterInfo = getCharacterInfoForLog(scenario.currentLine);

      setScenario({
        logs: [
          {
            ...scenario.currentLine,
            character: characterInfo,
          } as ScenarioLogEntry,
        ],
      });
    }
  }, [scenario.currentLine, scenario.logs.length, isLoaded, setScenario, getCharacterInfoForLog]);

  return {
    scenario,
    navigation,
    setNavigation,
    updateCharacterInfo,
    goToNextLine,
    getCurrentCharacterName,
    isScenarioEnd,
    addCurrentLineToLogs,
    isShowingChoices,
    handleChoiceSelect,
    skipToNextChoice,
  };
};
