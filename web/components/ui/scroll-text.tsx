'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { HTMLMotionProps, Variants } from 'motion/react';
import type React from 'react';

type Direction = 'up' | 'down' | 'left' | 'right';
type TextTag = 'h1' | 'h2' | 'h3' | 'p' | 'span';

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

function directionVariants(direction: Direction): Variants {
  const distance = direction === 'right' || direction === 'down' ? 20 : -20;
  const transition = { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] };
  return direction === 'left' || direction === 'right'
    ? { hidden: { filter: 'blur(10px)', opacity: 0, x: distance }, visible: { filter: 'blur(0px)', opacity: 1, x: 0, transition } }
    : { hidden: { filter: 'blur(10px)', opacity: 0, y: distance }, visible: { filter: 'blur(0px)', opacity: 1, y: 0, transition } };
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
  const reduceMotion = useReducedMotion();
  const MotionComponent = motion[as] as React.ComponentType<HTMLMotionProps<TextTag>>;
  const units = lineAnime ? text.split('\n') : letterAnime ? Array.from(text) : text.split(' ');

  return (
    <MotionComponent
      className={classname}
      aria-label={text.replace(/\n/g, ' ')}
      initial={reduceMotion ? false : 'hidden'}
      animate={reduceMotion ? { opacity: 1, filter: 'blur(0px)', x: 0, y: 0 } : undefined}
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
          animate={reduceMotion ? { opacity: 1, filter: 'blur(0px)', x: 0, y: 0 } : undefined}
          variants={reduceMotion ? undefined : variants || directionVariants(direction)}
          style={{ display: lineAnime ? 'block' : 'inline-block', whiteSpace: lineAnime ? 'normal' : 'pre' }}
        >
          {unit}{!letterAnime && !lineAnime && index < units.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </MotionComponent>
  );
}
