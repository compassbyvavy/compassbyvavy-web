"use client";

import { useEffect, useState } from "react";
import { LAUNCH_BOARDS } from "@/lib/shell/questions";

const KEY = "compass.school-board";

export function BoardPicker() {
  const [board, setBoard] = useState("");

  useEffect(() => {
    setBoard(window.localStorage.getItem(KEY) ?? "");
  }, []);

  return (
    <div className="board-picker">
      <h2>Your school board</h2>
      <p>
        Pick your board and we&apos;ll match PA days to it. The dates themselves are not on this page yet.
        The choice stays on this device.
      </p>
      <label htmlFor="school-board">School board</label>
      <select
        id="school-board"
        value={board}
        onChange={(event) => {
          setBoard(event.target.value);
          window.localStorage.setItem(KEY, event.target.value);
        }}
      >
        <option value="">Choose a board</option>
        {LAUNCH_BOARDS.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}
