import Link from "next/link";

export default function NotFound() {
  return (
    <section className="band">
      <div className="shell-wrap prose">
        <h1>That page is not here</h1>
        <p>
          <Link href="/">Go to the home page</Link>
        </p>
      </div>
    </section>
  );
}
