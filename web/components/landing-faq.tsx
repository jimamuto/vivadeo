'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { ScrollAnimation } from '@/components/ui/scroll-animation';

const questions = [
  {
    question: 'What can I search for in Vivadeo?',
    answer: 'Ask natural-language questions about the videos in your workspace. Vivadeo returns an answer grounded in relevant transcript moments, with timestamps so you can review the footage yourself.',
  },
  {
    question: 'How do videos get into my workspace?',
    answer: 'Upload a video file or index a permitted video URL. You can follow processing progress from the jobs view and search the video when it is ready.',
  },
  {
    question: 'Can my team verify an answer?',
    answer: 'Yes. Search answers keep the source filename, source context, and timestamp range attached, making it easy to open the cited moment before using the footage.',
  },
  {
    question: 'Who can access our video archive?',
    answer: 'Vivadeo uses workspace access controls with owner, admin, editor, and viewer roles. Your team decides who can manage content and who has read-only access.',
  },
  {
    question: 'Can I start without choosing a paid plan?',
    answer: 'Yes. The Free plan includes video ingest, transcript-grounded search, and timestamp citations. You can move to Pro when your team needs premium answers and workspace controls.',
  },
];

export function LandingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="landing-faq" id="faq" aria-labelledby="landing-faq-title">
      <ScrollAnimation className="landing-faq-heading">
        <p>FAQ</p>
        <h2 id="landing-faq-title">Questions, answered.</h2>
        <span>Everything you need to begin searching your archive.</span>
      </ScrollAnimation>
      <div className="landing-faq-list">
        {questions.map((item, index) => {
          const isOpen = openIndex === index;
          const answerId = `faq-answer-${index}`;

          return (
            <ScrollAnimation className="landing-faq-item" delay={index * 70} key={item.question}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={answerId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
              >
                <span>{item.question}</span>
                <span className="landing-faq-icon" aria-hidden="true">+</span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    id={answerId}
                    className="landing-faq-answer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <p>{item.answer}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </ScrollAnimation>
          );
        })}
      </div>
    </section>
  );
}
