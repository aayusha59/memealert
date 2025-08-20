import React from "react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  className?: string;
}

export default function FeatureCard({
  title,
  description,
  icon,
  className,
}: FeatureCardProps) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-border/40 bg-background/60 dark:bg-default-100/50 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-background/80 to-muted/20 transition-all duration-300 group-hover:from-primary/5 group-hover:to-primary/10" />
      
      <div className="relative p-6 h-full flex flex-col">
        {/* Icon Section */}
        <div className="flex items-center justify-between mb-4">
          <div className="relative">
            <div className="size-12 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
              {icon}
            </div>
            {/* Glow effect */}
            <div className="absolute inset-0 size-12 rounded-full bg-primary/20 blur-md opacity-0 transition-all duration-300 group-hover:opacity-100" />
          </div>
          
          {/* Interactive element (optional dot indicator) */}
          <div className="size-2 rounded-full bg-muted-foreground/30 transition-all duration-300 group-hover:bg-primary group-hover:scale-150" />
        </div>

        {/* Content Section */}
        <div className="flex-1 space-y-3">
          <h3 className="text-xl font-semibold text-foreground/90 transition-colors duration-300 group-hover:text-foreground">
            {title}
          </h3>
          <p className="text-sm text-foreground/70 leading-relaxed transition-colors duration-300 group-hover:text-foreground/80">
            {description}
          </p>
        </div>

        {/* Bottom accent line */}
        <div className="mt-6 h-0.5 w-full bg-gradient-to-r from-transparent via-border/40 to-transparent transition-all duration-300 group-hover:via-primary/40" />
      </div>
    </Card>
  );
}
