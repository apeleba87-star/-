import { ReactNode } from "react";

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  href?: string;
}

export default function Card({ title, children, className = "", href }: CardProps) {
  const content = (
    <div className={`card ${className}`}>
      {title && <h3 className="mb-3 text-lg font-semibold text-slate-800">{title}</h3>}
      {children}
    </div>
  );
  if (href) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    );
  }
  return content;
}
