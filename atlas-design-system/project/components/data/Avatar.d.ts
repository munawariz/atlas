import * as React from "react";

/** Round portrait, falling back to initials on a sage ground. */
export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string;
  /** Used for alt text and the initials fallback. */
  name?: string;
  size?: number;
  ring?: "none" | "white" | "lime" | "forest";
}
export declare function Avatar(props: AvatarProps): JSX.Element;
