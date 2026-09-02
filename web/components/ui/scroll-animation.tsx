'use client';

import { motion } from 'motion/react';
import type { Variants } from 'motion/react';
import type React from 'react';

type Direction = 'up' | 'down' | 'left' | 'right';
type AsTag = 'div' | 'span' | 'h1' | 'h2' | 'h3' | 'a' | 'p' | 'section' | 'figure' | 'button' | 'article';

type ScrollAnimationProps = {
  children: React.ReactNode;
  className?: string;
  viewport?: { amount?: number; margin?: string; once?: boolean };
  delay?: number;
  direction?: Direction;
  as?: AsTag;
  [key: string]: unknown;
};

const defaultViewport = { amount: 0.3, margin: '0px 0px -120px 0px', once: true };

export function ScrollAnimation({
  children,
  className,
  viewport = defaultViewport,
  delay = 0,
  direction = 'down',
  as: Component = 'div',
  ...props
}: ScrollAnimationProps) {
  const axis = direction === 'left' || direction === 'right' ? 'x' : 'y';
  const distance = direction === 'right' || direction === 'down' ? 24 : -24;
  const MotionComponent = motion[Component] as typeof motion.div;
  const variants: Variants = {
    hidden: axis === 'x' ? { opacity: 0, x: distance } : { opacity: 0, y: distance },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration: 0.7, delay: delay / 1000, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <MotionComponent
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      variants={variants}
      className={className}
      {...props}
    >
      {children}
    </MotionComponent>
  );
}
