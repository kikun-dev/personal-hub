type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-border-subtle bg-background p-4 ${className}`}
    >
      {children}
    </div>
  );
}
