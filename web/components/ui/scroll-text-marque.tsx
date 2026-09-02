'use client';

import { wrap } from '@motionone/utils';
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'motion/react';
import { useEffect, useRef, useState } from 'react';

type ScrollBaseAnimationProps = {
  children: string;
  baseVelocity?: number;
  clasname?: string;
  scrollDependent?: boolean;
};

export default function ScrollBaseAnimation({
  children,
  baseVelocity = -5,
  clasname = '',
  scrollDependent = false,
}: ScrollBaseAnimationProps) {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 2], { clamp: false });
  const x = useTransform(baseX, (value) => `${wrap(-20, -45, value)}%`);
  const direction = useRef(1);
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useAnimationFrame((_, delta) => {
    if (!mounted || reduceMotion) return;

    if (scrollDependent) {
      if (velocityFactor.get() < 0) direction.current = -1;
      else if (velocityFactor.get() > 0) direction.current = 1;
    }

    const moveBy = direction.current * baseVelocity * (delta / 1000);
    baseX.set(baseX.get() + moveBy + direction.current * moveBy * velocityFactor.get());
  });

  return (
    <div className="landing-marquee-viewport">
      <motion.div className="landing-marquee-track" style={mounted ? { x: reduceMotion ? '0%' : x } : undefined}>
        {[0, 1, 2, 3].map((copy) => (
          <span aria-hidden={copy > 0} className={clasname} key={copy}>{children}</span>
        ))}
      </motion.div>
    </div>
  );
}
