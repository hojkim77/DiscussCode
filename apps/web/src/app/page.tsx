import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="text-center py-16 space-y-4">
        <h1 className="text-4xl font-bold">What's hot in dev?</h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Trending repositories, hot open-source issues, and developer discussions — curated and summarised with AI.
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Link href="/trending" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-colors">
            See Trending
          </Link>
          <Link href="/discussions" className="px-5 py-2 border border-gray-700 hover:border-gray-500 rounded-lg font-medium transition-colors">
            Join Discussions
          </Link>
        </div>
      </section>
    </div>
  );
}
