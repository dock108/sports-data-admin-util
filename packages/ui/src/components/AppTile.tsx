import type { ReactNode } from "react";

import { Card } from "./Card";

type AppTileProps = {
  title: string;
  description: string;
  href: string;
  icon?: ReactNode;
};

export function AppTile({ title, description, href, icon }: AppTileProps) {
  return (
    <Card className="dock-app-tile" title="">
      <div className="dock-app-tile__icon">{icon ?? <span className="dock-app-tile__dot" />}</div>
      <div className="dock-app-tile__body">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <a className="dock-btn dock-btn--ghost" href={href} aria-label={`Open ${title}`}>
        Open
      </a>
    </Card>
  );
}

