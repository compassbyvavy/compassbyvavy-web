"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CampProgram, CampSession, Provider } from "@/data/camps/types";
import {
  SCHOOL_BOARDS,
  type SchoolBoardId,
  type SchoolPanel,
} from "@/config/boardDates";
import {
  breaksOn,
  singleDayCampsOnBreak,
  upcomingBreaks,
} from "@/lib/calendar/breaks";
import { buildCampDetailHref } from "@/lib/camps/campDetail";

const BOARD_KEY = "compass.schoolBoard.v1";
const AGES_KEY = "compass.family.ages.v1";

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function readAges(): { ages: number[]; asOfDate: string | null } {
  try {
    const raw = window.localStorage.getItem(AGES_KEY);
    if (!raw) return { ages: [], asOfDate: null };
    const parsed = JSON.parse(raw) as { ages?: unknown; asOfDate?: unknown };
    const ages = Array.isArray(parsed.ages)
      ? parsed.ages.filter((age): age is number => Number.isInteger(age) && age >= 0)
      : [];
    const asOfDate =
      typeof parsed.asOfDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.asOfDate)
        ? parsed.asOfDate
        : null;
    return { ages, asOfDate };
  } catch {
    return { ages: [], asOfDate: null };
  }
}

export type BoardCalendarProps = {
  programs: CampProgram[];
  providers: Provider[];
  sessions: CampSession[];
};

export function BoardCalendar({
  programs,
  providers,
  sessions,
}: BoardCalendarProps) {
  const [boardId, setBoardId] = useState<SchoolBoardId>("tdsb");
  const [panel, setPanel] = useState<SchoolPanel>("elementary");
  const [isoDate, setIsoDate] = useState(todayIso);
  const [ages, setAges] = useState<number[]>([]);
  const [asOfDate, setAsOfDate] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(BOARD_KEY);
    if (SCHOOL_BOARDS.some((board) => board.id === stored)) {
      setBoardId(stored as SchoolBoardId);
    }
    const family = readAges();
    setAges(family.ages);
    setAsOfDate(family.asOfDate);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(BOARD_KEY, boardId);
  }, [boardId, hydrated]);

  const board = SCHOOL_BOARDS.find((item) => item.id === boardId) ?? SCHOOL_BOARDS[0];
  const todayBreaks = breaksOn(board, isoDate, panel);
  const coming = useMemo(
    () => upcomingBreaks(board, isoDate, panel),
    [board, isoDate, panel],
  );
  const camps = useMemo(
    () =>
      singleDayCampsOnBreak({
        board,
        isoDate,
        panel,
        sessions,
        programs,
        providers,
        ages,
        asOfDate,
      }),
    [board, isoDate, panel, sessions, programs, providers, ages, asOfDate],
  );

  return (
    <div className="board-cal">
      <header>
        <p className="board-kicker">School calendar</p>
        <h1>PA days and breaks</h1>
        <p>
          Pick a board. On a day students are out, Compass lists single-day
          camps already in the catalog that fall on that date. This page is
          not the Plan saved list.
        </p>
      </header>

      <div className="board-controls">
        <label>
          <span>Board</span>
          <select
            value={board.id}
            onChange={(event) => setBoardId(event.target.value as SchoolBoardId)}
          >
            {SCHOOL_BOARDS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Panel</span>
          <select
            value={panel}
            onChange={(event) => setPanel(event.target.value as SchoolPanel)}
          >
            <option value="elementary">Elementary</option>
            <option value="secondary">Secondary</option>
          </select>
        </label>
        <label>
          <span>Date</span>
          <input
            type="date"
            value={isoDate}
            onChange={(event) => setIsoDate(event.target.value)}
          />
        </label>
      </div>

      <p className="board-note">
        Last verified {board.lastVerifiedOn}. Source:{" "}
        <a href={board.sourceUrl}>{board.name} calendar</a>. {board.note}
      </p>

      {todayBreaks.length > 0 ? (
        <div className="board-alert" role="status">
          <p>
            {board.name} — {panel} students are out on {isoDate} (
            {todayBreaks.map((item) => item.label).join(", ")}).
          </p>
          {camps.matches.length === 0 ? (
            <p>No single-day camp in the catalog matches this date and the ages on this device.</p>
          ) : (
            <ul>
              {camps.matches.map((match) => (
                <li key={match.session.id}>
                  <Link
                    href={buildCampDetailHref(match.program.slug, {
                      sessionId: match.session.id,
                    })}
                  >
                    {match.program.name}
                  </Link>
                  <span>
                    {" "}
                    · {match.provider.name}
                    {match.session.sourceCheckedDate
                      ? ` · Last verified ${match.session.sourceCheckedDate}`
                      : " · Last verified date unknown"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {camps.skippedForAge > 0 ? (
            <p>
              {camps.skippedForAge} single-day session
              {camps.skippedForAge === 1 ? "" : "s"} on this date did not fit
              every saved age, or the age-as-of date was missing.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="board-note" role="status">
          {isoDate} is not a {panel} break on this calendar.
        </p>
      )}

      <h2>Coming up</h2>
      <ul className="board-upcoming">
        {coming.map((item) => (
          <li key={`${item.date}-${item.label}`}>
            <button type="button" onClick={() => setIsoDate(item.date)}>
              {item.date}
            </button>
            <span>
              {item.label}
              {item.panels.length === 1 ? ` · ${item.panels[0]} only` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
