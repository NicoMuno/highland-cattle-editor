// import React from "react";
import DashboardCard, { DashboardCardProps } from "./DashboardCard";

export default function DashboardCardsGrid(props: {
  cards: DashboardCardProps[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {props.cards.map((c) => (
        <DashboardCard key={c.title} {...c} />
      ))}
    </div>
  );
}
