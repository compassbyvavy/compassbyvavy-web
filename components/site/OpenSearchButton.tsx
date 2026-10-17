"use client";

export function OpenSearchButton() {
  return (
    <button
      type="button"
      className="nav-link"
      onClick={() =>
        window.dispatchEvent(new Event("compass:open-command-palette"))
      }
    >
      Search
    </button>
  );
}
