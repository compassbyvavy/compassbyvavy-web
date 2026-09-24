import Link from "next/link";

export default function NotFound() {
  return <div className="play-shell play-empty"><p className="play-kicker">Play & Entertainment</p><h1>We could not find that venue.</h1><p>It may still be in review or no longer operating.</p><Link className="play-button play-button-primary" href="/play">Browse verified venues</Link></div>;
}
