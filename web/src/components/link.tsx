import { Link as RouterLink } from "@tanstack/react-router";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof RouterLink>, "to"> & {
  to?: string;
  href?: string;
};

export function Link({ to, href, ...props }: Props) {
  return <RouterLink to={(to ?? href ?? "/") as any} {...props} />;
}
