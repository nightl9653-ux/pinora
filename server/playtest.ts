import { placeById } from "./data/places";
import { puzzleFor } from "./select";

const base = "http://127.0.0.1:8787";
let cookie = "";

async function call(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(base + path, { ...init, headers });
  const set = response.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0] ?? "";
  const text = await response.text();
  return { status: response.status, text, json: text ? (JSON.parse(text) as Record<string, unknown>) : {} };
}

const health = await call("/api/health");
if (health.json.ok !== true) throw new Error("health");
const today = String(health.json.today);
const puzzle = await call(`/api/puzzle?lang=zh-Hans&date=${today}`);
const secret = JSON.stringify(puzzle.json).match(/"(lat|lng|story|placeId)"/);
if (secret) throw new Error(`puzzle leaked ${secret[0]}`);
const questions = puzzle.json.questions as { clue: string; category: string; stake: number }[];
if (questions.length !== 5) throw new Error("count");

const answers = puzzleFor(today);
let total = 0;
for (let index = 0; index < 5; index += 1) {
  const place = placeById(answers[index].placeId);
  const guess = await call("/api/guess", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      date: today,
      index,
      lat: place.lat,
      lng: place.lng,
      lang: "zh-Hans",
    }),
  });
  if (guess.status !== 200) throw new Error(`guess ${index} ${guess.text}`);
  const reveal = guess.json.reveal as { accuracy: number; placeName: string; story: string };
  if (reveal.accuracy !== 100 || !reveal.placeName || !reveal.story) throw new Error("bad reveal");
  total = Number(guess.json.total);
}
if (total !== 1000) throw new Error(`total ${total}`);

const again = await call("/api/guess", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ date: today, index: 0, lat: 0, lng: 0, lang: "en" }),
});
if (again.status !== 409) throw new Error(`replay ${again.status}`);

const board = await call(`/api/board?date=${today}`);
const you = board.json.you as { total: number };
if (Number(board.json.count) < 1 || you.total !== 1000) throw new Error("board");

const english = await call(`/api/puzzle?lang=en&date=${today}`);
const englishClue = (english.json.questions as { clue: string }[])[0]?.clue;
if (!englishClue || englishClue === questions[0]?.clue) throw new Error("language did not change");

console.log("ok", today, questions.map((item) => `${item.category}:${item.stake}`).join(" "));
console.log(questions[0]?.clue);
console.log(englishClue);
