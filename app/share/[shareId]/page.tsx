"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getFlashcardSetByShareId, copySharedSet, FlashcardSet } from "../../utils/storage";
import StudyView from "../../components/StudyView";

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
          <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading study set...</p>
        </div>
      </div>
    );
  }

  if (error || !flashcardSet) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="max-w-md w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-gray-100 dark:border-gray-700 text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Study Set Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || "This study set doesn't exist or is no longer available."}
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header with share info */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🔗</span>
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium rounded-full">
                  Shared Study Set
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {flashcardSet.name}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {flashcardSet.flashcards.length} flashcards • Created {new Date(flashcardSet.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={handleCopyToMyCollection}
              disabled={isCopied}
              className={`px-6 py-3 font-bold rounded-xl transition-all ${
                isCopied
                  ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                  : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg hover:scale-105"
              }`}
            >
              {isCopied ? "✓ Copied!" : "Copy to My Collection"}
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
