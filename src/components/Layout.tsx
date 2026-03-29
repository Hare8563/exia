import React from "react";

type Props = {
  children: React.ReactNode;
};

export const Layout: React.FC<Props> = ({ children }) => {
  return <div className="relative h-[100svh] max-h-[100svh] overflow-hidden select-none">{children}</div>;
};
