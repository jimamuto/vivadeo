'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { Variants } from 'motion/react';
import type React from 'react';

type Direction = 'up' | 'down' | 'left' | 'right';
type AsTag = 'div' | 'span' | 'h1' | 'h2' | 'h3' | 'a' | 'p' | 'section' | 'figure' | 'button' | 'article';

type ScrollAnimationProps = {
  children: React.ReactNode;
  className?: string;
  viewport?: { amount?: number; margin?: string; once?: boolean };
  variants?: Variants;
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
  variants: customVariants,
  delay = 0,
  direction = 'down',
  as: Component = 'div',
  ...props
}: ScrollAnimationProps) {
  const reduceMotion = useReducedMotion();
  const axis = direction === 'left' || direction === 'right' ? 'x' : 'y';
  const distance = direction === 'right' || direction === 'down' ? 24 : -24;
  const MotionComponent = motion[Component] as typeof motion.div;
  const baseVariants: Variants = customVariants || {
    hidden: axis === 'x' ? { filter: 'blur(10px)', opacity: 0, x: distance } : { filter: 'blur(10px)', opacity: 0, y: distance },
    visible: { filter: 'blur(0px)', opacity: 1, x: 0, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
  };
  const visible = baseVariants.visible;
  const variants: Variants = {
    ...baseVariants,
    visible: typeof visible === 'object' ? { ...visible, transition: { ...(visible.transition as object), delay: delay / 1000 } } : visible,
  };

  return (
    <MotionComponent
      initial={reduceMotion ? false : "hidden"}
      animate={reduceMotion ? { opacity: 1, filter: 'blur(0px)', x: 0, y: 0 } : undefined}
      whileInView={reduceMotion ? undefined : "visible"}
      viewport={viewport}
      variants={reduceMotion ? undefined : variants}
      className={className}
      {...props}
    >
      {children}
    </MotionComponent>
  );
}
