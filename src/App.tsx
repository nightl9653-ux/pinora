"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchBoard, fetchPuzzle, saveName, sendGuess, type Board, type Puzzle } from "./api";
import { addDays } from "./game/dates";
import { RTL, type PickerLocale } from "./game/locale";
import { emojiFor } from "./game/tier";
import { copyFor, detectLocale, fill, formatDay, LANGS, type Copy } from "./i18n";
import { currentStreak, rememberStreak } from "./streak";
import { GlobeView, type Arc, type Marker } from "./ui/GlobeView";

function useLocation() {
  const [href, setHref] = useState(() => window.location.pathname + window.location.search);
  useEffect(() => {
    const onPop = () => setHref(window.location.pathname + window.location.search);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const url = new URL(href, "http://pinora.local");
  function go(next: string) {
    window.history.pushState(null, "", next);
    setHref(next);
  }
  return { path: url.pathname, date: url.searchParams.get("d") ?? "", go };
}

function pathWith(path: string, date: string): string {
  return date ? `${path}?d=${date}` : path;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

function LangSelect({
  locale,
  onChange,
  label,
}: {
  locale: PickerLocale;
  onChange: (locale: PickerLocale) => void;
  label: string;
}) {
  return (
    <select
      className="lang"
      aria-label={label}
      value={locale}
      onChange={(event) => {
        const next = event.target.value as PickerLocale;
        localStorage.setItem("pinora-lang", next);
        onChange(next);
      }}
    >
      {LANGS.map((item) => (
        <option key={item.id} value={item.id}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

function shareText(locale: PickerLocale, puzzle: Puzzle): string {
  const dots = puzzle.solved.map((item) => emojiFor(item.tier)).join("");
  return `Pinora · ${formatDay(locale, puzzle.date)}\n${dots}\n${puzzle.total} / 1,000\n${location.origin}`;
}

export default function App() {
  const [locale, setLocale] = useState<PickerLocale>(() => detectLocale());
  const copy = copyFor(locale);
  const route = useLocation();
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState("");
  const [sheet, setSheet] = useState(false);
  const [pending, setPending] = useState(false);
  const [guessPin, setGuessPin] = useState<{ lat: number; lng: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState("");
  const [clueOpen, setClueOpen] = useState(false);

  const date = route.date;

  useEffect(() => {
    document.documentElement.lang = locale === "zh-Hans" ? "zh-CN" : locale === "zh-Hant" ? "zh-TW" : locale;
    document.documentElement.dir = RTL.has(locale) ? "rtl" : "ltr";
    document.title = "Pinora";
  }, [locale]);

  useEffect(() => {
    setSheet(false);
    setCopied(false);
    setClueOpen(false);
  }, [date, route.path]);

  useEffect(() => {
    let cancel = false;
    setError("");
    fetchPuzzle(locale, date || undefined)
      .then((next) => {
        if (cancel) return;
        setPuzzle(next);
        setName(next.name);
        if (next.finished) rememberStreak(next.today, next.date);
      })
      .catch(() => {
        if (!cancel) setError(copy.error);
      });
    return () => {
      cancel = true;
    };
  }, [date, locale, copy.error]);

  // /results only has a panel after finishing; otherwise land on home instead of a blank globe.
  useEffect(() => {
    if (!puzzle) return;
    if (route.path === "/results" && !puzzle.finished) {
      route.go(date ? `/?d=${date}` : "/");
    }
  }, [puzzle, route.path, date]);

  useEffect(() => {
    if ((route.path !== "/results" && route.path !== "/board") || !puzzle) return;
    let cancel = false;
    fetchBoard(puzzle.date)
      .then((next) => {
        if (!cancel) setBoard(next);
      })
      .catch(() => {
        if (!cancel) setError(copy.error);
      });
    return () => {
      cancel = true;
    };
  }, [route.path, puzzle, copy.error]);

  const markers = useMemo<Marker[]>(() => {
    if (!puzzle) return guessPin ? [{ lat: guessPin.lat, lng: guessPin.lng, kind: "you" as const }] : [];
    const pinned = puzzle.solved.flatMap((item) => [
      { lat: item.guessLat, lng: item.guessLng, kind: "you" as const },
      { lat: item.lat, lng: item.lng, kind: "answer" as const },
    ]);
    if (guessPin && pending) pinned.push({ lat: guessPin.lat, lng: guessPin.lng, kind: "you" });
    return pinned;
  }, [puzzle, guessPin, pending]);

  const arcs = useMemo<Arc[]>(
    () =>
      puzzle?.solved.map((item) => ({
        startLat: item.guessLat,
        startLng: item.guessLng,
        endLat: item.lat,
        endLng: item.lng,
      })) ?? [],
    [puzzle],
  );

  const latest = puzzle && puzzle.solved.length > 0 ? puzzle.solved[puzzle.solved.length - 1] : null;
  const focus = sheet && latest ? { lat: latest.lat, lng: latest.lng } : null;
  const playing = route.path === "/play" && puzzle !== null && !puzzle.finished;
  const question = puzzle?.questions[puzzle.solved.length];
  const showClue = Boolean(playing && question && !sheet);

  useEffect(() => {
    setClueOpen(false);
  }, [question?.index, puzzle?.date]);

  async function onPick(lat: number, lng: number) {
    if (!puzzle || !question || pending || sheet) return;
    setError("");
    setGuessPin({ lat, lng });
    setPending(true);
    try {
      const result = await sendGuess(puzzle.date, question.index, lat, lng, locale);
      const next = {
        ...puzzle,
        solved: [...puzzle.solved, result.reveal],
        total: result.total,
        finished: result.finished,
      };
      setPuzzle(next);
      if (next.finished) rememberStreak(next.today, next.date);
      setSheet(true);
    } catch {
      setError(copy.error);
    } finally {
      setPending(false);
      setGuessPin(null);
    }
  }

  const streak = puzzle ? currentStreak(puzzle.today) : 0;
  const homeFinished = puzzle?.finished && puzzle.date === puzzle.today;

  return (
    <div className={showClue ? "app play-split" : "app"}>
      <header className="top">
        <button className="brand" onClick={() => route.go("/")}>
          Pinora
        </button>
        <div className="top-actions">
          {streak > 0 && <span className="streak">{fill(copy.streak, { n: streak })}</span>}
          <LangSelect locale={locale} label={copy.language} onChange={setLocale} />
        </div>
      </header>

      {error && (
        <div className="banner">
          <span>{error}</span>
          <button onClick={() => window.location.reload()}>{copy.retry}</button>
        </div>
      )}

      {showClue && question && (
        <section className={clueOpen ? "clue-dock is-open" : "clue-dock"}>
          <button
            type="button"
            className="clue-toggle"
            aria-expanded={clueOpen}
            onClick={() => setClueOpen((open) => !open)}
          >
            <span>{copy.categories[question.category]}</span>
            <span className="dot" aria-hidden>
              ·
            </span>
            <span>{fill("{n} / 5", { n: question.index + 1 })}</span>
            <span className="dot" aria-hidden>
              ·
            </span>
            <b>{question.stake}</b>
            <span className="chevron" aria-hidden>
              {clueOpen ? "▴" : "▾"}
            </span>
          </button>
          {clueOpen && (
            <div className="clue-body">
              <p className="clue-text">{question.clue}</p>
              <p className="fine">{pending ? copy.loading : copy.zoom}</p>
            </div>
          )}
        </section>
      )}

      <div className="stage">
        <GlobeView
          interactive={playing && !sheet && !pending}
          rotate={route.path === "/"}
          markers={route.path === "/play" || route.path === "/results" ? markers : []}
          arcs={route.path === "/play" || route.path === "/results" ? arcs : []}
          focus={route.path === "/play" ? focus : null}
          onPick={(lat, lng) => void onPick(lat, lng)}
        />
      </div>

      {route.path === "/" && (
        <section className="panel home">
          <p className="eyebrow">{puzzle ? formatDay(locale, puzzle.today) : copy.loading}</p>
          <h1>{copy.tagline}</h1>
          <button className="primary" onClick={() => route.go("/play")} disabled={!puzzle}>
            {homeFinished ? copy.again : copy.play}
          </button>
          <button className="text" onClick={() => route.go("/how")}>
            {copy.how}
          </button>
          <p className="fine">{copy.reset}</p>
        </section>
      )}

      {route.path === "/how" && (
        <section className="panel sheet-card">
          <h1>{copy.howTitle}</h1>
          <ol>
            {copy.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ol>
          <button className="primary" onClick={() => route.go("/play")}>
            {copy.play}
          </button>
        </section>
      )}

      {route.path === "/play" && puzzle && sheet && latest && (
        <section className="panel reveal">
          <div className={`score tier-${latest.tier}`}>{latest.points}</div>
          <p className="meta">
            <span>{copy.tiers[latest.tier]}</span>
            <span>{latest.distanceKm} km</span>
            <span>
              {latest.points} / {puzzle.stakes[latest.index]}
            </span>
          </p>
          <h2>{latest.placeName}</h2>
          <p>{latest.story}</p>
          {puzzle.finished ? (
            <button className="primary" onClick={() => route.go(pathWith("/results", date))}>
              {copy.results}
            </button>
          ) : (
            <button className="primary" onClick={() => setSheet(false)}>
              {copy.next}
            </button>
          )}
        </section>
      )}

      {route.path === "/play" && puzzle?.finished && !sheet && (
        <section className="panel home">
          <p>{copy.done}</p>
          <button className="primary" onClick={() => route.go(pathWith("/results", date))}>
            {copy.results}
          </button>
        </section>
      )}

      {route.path === "/results" && puzzle?.finished && (
        <Results
          copy={copy}
          locale={locale}
          puzzle={puzzle}
          board={board}
          copied={copied}
          name={name}
          onName={setName}
          onCopy={() => {
            void copyText(shareText(locale, puzzle)).then((ok) => setCopied(ok));
          }}
          onSave={() => {
            void saveName(name).then((saved) => setName(saved.name));
          }}
          onBoard={() => route.go(pathWith("/board", puzzle.date === puzzle.today ? "" : puzzle.date))}
          onShift={(days) => {
            const next = addDays(puzzle.date, days);
            if (next > puzzle.today) return;
            route.go(pathWith("/play", next === puzzle.today ? "" : next));
          }}
        />
      )}

      {route.path === "/board" && (
        <section className="panel board">
          <h1>{copy.board}</h1>
          {board && board.top.length === 0 && <p>{copy.empty}</p>}
          {board?.you && !board.top.some((row) => row.you) && (
            <Row copy={copy} rank={board.you.rank} name={board.you.name} total={board.you.total} tiers={board.you.tiers} pinned />
          )}
          <ol>
            {board?.top.map((row) => (
              <li key={row.rank}>
                <Row copy={copy} rank={row.rank} name={row.name} total={row.total} tiers={row.tiers} pinned={row.you} />
              </li>
            ))}
          </ol>
          <button className="text" onClick={() => route.go(pathWith("/results", date))}>
            {copy.back}
          </button>
        </section>
      )}

      <footer>{copy.nasa}</footer>
    </div>
  );
}

function Row({
  copy,
  rank,
  name,
  total,
  tiers,
  pinned,
}: {
  copy: Copy;
  rank: number;
  name: string;
  total: number;
  tiers: Puzzle["solved"][number]["tier"][];
  pinned: boolean;
}) {
  return (
    <div className={pinned ? "row you" : "row"}>
      <span>{rank}</span>
      <span>
        {name}
        {pinned ? ` · ${copy.you}` : ""}
      </span>
      <span>{tiers.map((tier) => emojiFor(tier)).join("")}</span>
      <b>{total}</b>
    </div>
  );
}

function Results({
  copy,
  locale,
  puzzle,
  board,
  copied,
  name,
  onName,
  onCopy,
  onSave,
  onBoard,
  onShift,
}: {
  copy: Copy;
  locale: PickerLocale;
  puzzle: Puzzle;
  board: Board | null;
  copied: boolean;
  name: string;
  onName: (name: string) => void;
  onCopy: () => void;
  onSave: () => void;
  onBoard: () => void;
  onShift: (days: number) => void;
}) {
  const dots = puzzle.solved.map((item) => emojiFor(item.tier)).join("");
  return (
    <section className="panel results">
      <p className="eyebrow">{formatDay(locale, puzzle.date)}</p>
      <div className="total">{puzzle.total}</div>
      <p className="out-of">/ 1,000</p>
      <p className="dots">{dots}</p>
      <button className="primary" onClick={onCopy}>
        {copied ? copy.copied : copy.share}
      </button>
      {puzzle.date === puzzle.today && <p>{fill(copy.streak, { n: currentStreak(puzzle.today) })}</p>}
      {puzzle.date !== puzzle.today && <p className="fine">{copy.practice}</p>}
      {board && board.average !== null && (
        <p>
          {fill(copy.average, { score: board.average })} · {fill(copy.players, { n: board.count })}
        </p>
      )}
      {board?.hardest && (
        <p>
          {fill(copy.hardest, {
            n: board.hardest.index + 1,
            category: copy.categories[board.hardest.category],
            score: board.hardest.average,
          })}
        </p>
      )}
      <button className="text" onClick={onBoard}>
        {copy.board}
      </button>
      <form
        className="name"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <label>
          {copy.name}
          <input value={name} maxLength={16} onChange={(event) => onName(event.target.value)} />
        </label>
        <button type="submit">{copy.save}</button>
      </form>
      <div className="days">
        <button onClick={() => onShift(-1)}>{copy.prev}</button>
        <button onClick={() => onShift(1)} disabled={puzzle.date >= puzzle.today}>
          {copy.nextDay}
        </button>
      </div>
    </section>
  );
}
