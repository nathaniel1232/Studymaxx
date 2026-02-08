"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getFlashcardSetByShareId, copySharedSet, FlashcardSet } from "../../utils/storage";
import StudyView from "../../components/StudyView";

// Custom SVG Icons
const LinkIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);

const CopyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12"/>
  </svg>
);

export default function SharePage() {
  const params = useParams();
  const router = useRouter();
  const shareId = params?.shareId as string;
  
  const [flashcardSet, setFlashcardSet] = useState<FlashcardSet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const loadSharedSet = async () => {
      if (!shareId) {
        setError("Invalid share link");
        setIsLoading(false);
        return;
      }

      try {
        const set = await getFlashcardSetByShareId(shareId);
        if (!set) {
          setError("This study set doesn't exist or is no longer shared");
          setIsLoading(false);
          return;
        }

        setFlashcardSet(set);
      } catch (error) {
        setError("Failed to load study set");
      } finally {
        setIsLoading(false);
      }
    };

    loadSharedSet();
  }, [shareId]);

  const handleCopyToMyCollection = async () => {
    if (!shareId) return;

    const copiedSet = await copySharedSet(shareId);
    if (copiedSet) {
      setIsCopied(true);
      setTimeout(() => {
        router.push("/");
      }, 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-cyan-200 dark:border-cyan-800 border-t-cyan-600 dark:border-t-cyan-400 rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-gray-600 dark:text-gray-400 text-lg font-semibold">Loading study set...</p>
        </div>
      </div>
    );
  }

  if (error || !flashcardSet) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="max-w-md w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-md shadow-2xl p-10 border border-gray-100 dark:border-gray-700 text-center">
          <div className="text-6xl mb-6">😕</div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-3">
            Study Set Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
            {error || "This study set doesn't exist or is no longer available. The share link may have expired."}
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black text-lg rounded-md hover:shadow-lg transition-all transform hover:scale-105"
          >
            🏠 Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header with share info */}
      <div className="bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-950/30 dark:to-teal-950/30 backdrop-blur-sm border-b-2 border-cyan-200 dark:border-cyan-800">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-cyan-500 dark:text-cyan-400"><LinkIcon /></span>
                <span className="px-4 py-2 bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 text-sm font-black rounded-full">
                  Shared Study Set
                </span>
              </div>
              <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
                {flashcardSet.name}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                {flashcardSet.flashcards.length} flashcards • Created {new Date(flashcardSet.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={handleCopyToMyCollection}
              disabled={isCopied}
              className={`px-8 py-4 font-black text-lg rounded-md transition-all transform hover:scale-105 flex items-center gap-2 ${
                isCopied
                  ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                  : "bg-gradient-to-r from-cyan-500 to-teal-600 text-white hover:shadow-xl hover:shadow-cyan-400/50"
              }`}
            >
              {isCopied ? <><CheckIcon /> Copied!</> : <><CopyIcon /> Copy to Collection</>}
            </button>
          </div>
        </div>
      </div>

      {/* Study interface */}
      <StudyView
        flashcards={flashcardSet.flashcards}
        currentSetId={null}
        onBack={() => router.push("/")}
      />
    </div>
  );
}
