"use client";

import Link from "next/link";

import { Card, EmptyState, IconArrow, IconCheck, IconQuestion, SectionHead } from "@/components/ui";
import { motherById } from "@/lib/fixtures";
import { completedCount, formatDate, relativeDays } from "@/lib/schedule";
import { useDemo } from "@/lib/store";
import type { SavedQuestion } from "@/lib/types";

/**
 * The question bank.
 *
 * Two claims live on this screen. The first is a product one: a question saved
 * during the week and handed to the health worker before the visit is worth
 * more than an improvised answer at midnight. The second is a safety one: every
 * question here is a thing Nnneva declined to answer, because the corpus did
 * not cover it. The pile is the refusals, made useful.
 */
export default function QuestionsPage() {
  const { savedQuestions } = useDemo();

  const open = savedQuestions.filter((question) => !question.answered);

  // Grouped by mother, and mothers with the most saved first — that is the
  // order a health worker preparing for a clinic reads them in.
  const grouped = Object.values(
    open.reduce<Record<string, { motherId: string; questions: SavedQuestion[] }>>((acc, question) => {
      acc[question.motherId] ??= { motherId: question.motherId, questions: [] };
      acc[question.motherId].questions.push(question);
      return acc;
    }, {}),
  ).sort((a, b) => b.questions.length - a.questions.length);

  return (
    <div className="mx-auto max-w-(--container-app) px-5 py-8 lg:px-10 lg:py-10">
      <SectionHead
        eyebrow="Question bank"
        title={`${open.length} questions saved for the next contact`}
        note="Everything on this page is something Nnneva did not answer. When the curated corpus does not cover a question, it is saved rather than guessed at — which is the safer behaviour and, as it turns out, the more useful one."
      />

      {grouped.length === 0 ? (
        <Card className="mt-8">
          <EmptyState
            title="Nothing waiting."
            body="Every question the cohort has asked this week was covered by the corpus and answered with its source shown."
            icon={<IconCheck className="mx-auto size-10 text-mint" />}
          />
        </Card>
      ) : (
        <ul className="mt-8 grid items-start gap-4 lg:grid-cols-2">
          {grouped.map(({ motherId, questions }) => {
            const mother = motherById(motherId);
            if (!mother) return null;

            return (
              <li key={motherId}>
                <Card className="flex h-full flex-col overflow-hidden">
                  <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-6">
                    <div className="min-w-0">
                      <h2 className="truncate text-h3">{mother.name}</h2>
                      <p className="mt-1.5 text-caption text-text-3">
                        {mother.gestationalWeek} weeks · contact {completedCount(mother.ancContacts)}{" "}
                        of 8 · {mother.village}
                      </p>
                    </div>
                    <span className="pill bg-aqua/15 text-aqua">
                      <IconQuestion className="size-3.5" />
                      {questions.length} saved
                    </span>
                  </header>

                  <ol className="flex flex-1 flex-col gap-2.5 p-6">
                    {questions.map((question, index) => (
                      <li key={question.id} className="well flex gap-3.5 p-4">
                        <span className="rank shrink-0 pt-0.5">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <p className="text-small leading-relaxed text-text">“{question.text}”</p>
                          <p className="mt-2 text-caption text-text-3">
                            Saved {relativeDays(question.at)} · {formatDate(question.at)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>

                  <footer className="flex flex-wrap items-center gap-3 border-t border-line bg-surface-2/40 px-6 py-4">
                    <p className="min-w-0 flex-1 text-caption text-text-3">
                      She has {questions.length} {questions.length === 1 ? "question" : "questions"}{" "}
                      ready for you.
                    </p>
                    <Link href={`/mothers/${mother.id}`} className="btn btn-quiet">
                      Open her profile
                      <IconArrow className="size-3.5" />
                    </Link>
                  </footer>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
