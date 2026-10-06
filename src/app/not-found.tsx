import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-4 font-sans">
      <h2 className="text-xl font-bold font-mono">404 - Page Not Found</h2>
      <p className="text-xs text-slate-400 mt-2">
        The requested resource could not be found.
      </p>
      <Link
        href="/"
        className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
