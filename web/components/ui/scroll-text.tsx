'use client';

import { motion } from 'motion/react';
import type { HTMLMotionProps, Variants } from 'motion/react';
import type React from 'react';
import { useReducedMotionPreference } from '@/lib/use-reduced-motion-preference';

type Direction = 'up' | 'down' | 'left' | 'right';
type TextTag = 'h1' | 'h2' | 'h3' | 'p' | 'span';

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.045 } },
};

function directionVariants(direction: Direction): Variants {
  const distance = direction === 'right' || direction === 'down' ? 12 : -12;
  const transition = { duration: 0.28, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] };
  return direction === 'left' || direction === 'right'
    ? { hidden: { opacity: 0, x: distance }, visible: { opacity: 1, x: 0, transition } }
    : { hidden: { opacity: 0, y: distance }, visible: { opacity: 1, y: 0, transition } };
}

export default function TextAnimation({
  as = 'h1',
  text,
  classname = '',
  viewport = { amount: 0.3, margin: '0px', once: true },
  variants,
  direction = 'down',
  letterAnime = false,
  lineAnime = false,
  ...props
}: {
  text: string;
  classname?: string;
  as?: TextTag;
  viewport?: { amount?: number; margin?: string; once?: boolean };
  variants?: Variants;
  direction?: Direction;
  letterAnime?: boolean;
  lineAnime?: boolean;
} & Omit<HTMLMotionProps<TextTag>, 'children'>) {
  const reduceMotion = useReducedMotionPreference();
  const MotionComponent = motion[as] as React.ComponentType<HTMLMotionProps<TextTag>>;
  const units = lineAnime ? text.split('\n') : letterAnime ? Array.from(text) : text.split(' ');

  return (
    <MotionComponent
      className={classname}
      aria-label={text.replace(/\n/g, ' ')}
      initial={reduceMotion ? false : 'hidden'}
      animate={reduceMotion ? { opacity: 1, x: 0, y: 0 } : undefined}
      whileInView={reduceMotion ? undefined : 'visible'}
      viewport={viewport}
      variants={reduceMotion ? undefined : containerVariants}
      {...props}
    >
      {units.map((unit, index) => (
        <motion.span
          aria-hidden="true"
          key={`${unit}-${index}`}
          initial={reduceMotion ? false : undefined}
          animate={reduceMotion ? { opacity: 1, x: 0, y: 0 } : undefined}
          variants={reduceMotion ? undefined : variants || directionVariants(direction)}
          style={{ display: lineAnime ? 'block' : 'inline-block', whiteSpace: lineAnime ? 'normal' : 'pre' }}
        >
          {unit}{!letterAnime && !lineAnime && index < units.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </MotionComponent>
  );
}
