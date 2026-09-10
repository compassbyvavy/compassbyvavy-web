import Link from "next/link";

export default function CampDetailNotFound() {
  return (
    <div className="container camp-detail-page">
      <div className="camps-empty" role="status">
        <h1>Camp not found</h1>
        <p>
          This program is not in the current catalog. The link may be wrong, or
          published program data is not loaded in this environment yet — no
          substitute camp is shown.
        </p>
        <p>
          <Link href="/camps">Back to camps</Link>
        </p>
      </div>
    </div>
  );
}
