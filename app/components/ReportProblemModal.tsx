"use client";

import { useState } from "react";
import { useTranslation } from "../contexts/SettingsContext";

interface ReportProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportProblemModal({ isOpen, onClose }: ReportProblemModalProps) {
  const t = useTranslation();
  const [email, setEmail] = useState("");
  const [problemType, setProblemType] = useState("bug");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      const response = await fetch("/api/report-problem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim() || "anonymous",
          problemType,
          description: description.trim(),
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        }),
      });

      if (response.ok) {
        setSubmitStatus("success");
        setTimeout(() => {
          onClose();
          // Reset form
          setEmail("");
          setProblemType("bug");
          setDescription("");
          setSubmitStatus("idle");
        }, 2000);
      } else {
        setSubmitStatus("error");
      }
    } catch (error) {
      console.error("Error submitting report:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Gradient Background */}
        <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 p-8 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-black text-white flex items-center gap-3">
                <span className="text-4xl">🐛</span>
                Report a Problem
              </h2>
              <p className="text-base text-orange-100 mt-2 font-medium">
                Help us improve StudyMaxx by reporting issues and feedback
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-orange-100 text-3xl font-light hover:scale-110 transition-transform"
            >
              ×
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Email (optional) */}
          <div>
            <label className="block text-base font-bold text-gray-900 dark:text-white mb-3">
              Email (optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="w-full px-5 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-3 focus:ring-orange-500 focus:border-orange-500 text-base font-medium transition-all"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Leave blank to submit anonymously
            </p>
          </div>

          {/* Problem Type */}
          <div>
            <label className="block text-base font-bold text-gray-900 dark:text-white mb-3">
              Problem Type
            </label>
            <select
              value={problemType}
              onChange={(e) => setProblemType(e.target.value)}
              className="w-full px-5 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-3 focus:ring-orange-500 focus:border-orange-500 text-base font-medium transition-all"
            >
              <option value="bug">🐛 Bug / Error</option>
              <option value="feature">💡 Feature Request</option>
              <option value="quality">📝 Content Quality Issue</option>
              <option value="performance">⚡ Performance Issue</option>
              <option value="other">💬 Other</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-base font-bold text-gray-900 dark:text-white mb-3">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe the problem in detail..."
              rows={7}
              required
              className="w-full px-5 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-3 focus:ring-orange-500 focus:border-orange-500 text-base font-medium resize-none transition-all"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Include steps to reproduce if reporting a bug
            </p>
          </div>

          {/* Status Messages */}
          {submitStatus === "success" && (
            <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/40 dark:to-emerald-900/40 border-2 border-green-300 dark:border-green-700 rounded-2xl">
              <p className="text-green-700 dark:text-green-300 text-base font-bold">
                ✓ Report submitted successfully! Thank you for your feedback.
              </p>
            </div>
          )}

          {submitStatus === "error" && (
            <div className="p-6 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/40 dark:to-pink-900/40 border-2 border-red-300 dark:border-red-700 rounded-2xl">
              <p className="text-red-700 dark:text-red-300 text-base font-bold">
                ✗ Failed to submit report. Please try again or email us at studymaxxer@gmail.com
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-2xl font-bold text-base hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors hover:scale-105 transform"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !description.trim()}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white rounded-2xl font-black text-base hover:shadow-2xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
