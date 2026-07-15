"use client";
import { cn } from "@/lib/utils";
import { IconMenu2, IconX } from "@tabler/icons-react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "motion/react";
import React, { useRef, useState } from "react";

interface NavbarProps {
  children: React.ReactNode;
  className?: string;
}

interface NavBodyProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

interface NavItemsProps {
  items: {
    name: string;
    link: string;
    onClick?: () => void;
    active?: boolean;
  }[];
  className?: string;
}

interface MobileNavProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

interface MobileNavHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface MobileNavMenuProps {
  children: React.ReactNode;
  className?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const Navbar = ({ children, className }: NavbarProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const [visible, setVisible] = useState<boolean>(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setVisible(latest > 40);
  });

  return (
    <motion.div
      ref={ref}
      className={cn("fixed inset-x-0 top-0 z-50 w-full", className)}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(
              child as React.ReactElement<{ visible?: boolean }>,
              { visible }
            )
          : child
      )}
    </motion.div>
  );
};

export const NavBody = ({ children, className, visible }: NavBodyProps) => {
  return (
    <motion.div
      animate={{
        backdropFilter: visible ? "blur(16px)" : "none",
        boxShadow: visible
          ? "0 0 0 1px rgba(34,211,238,0.15), 0 8px 32px rgba(0,0,0,0.4)"
          : "none",
        background: visible
          ? "rgba(10,14,23,0.88)"
          : "transparent",
        width: visible ? "92%" : "100%",
        y: visible ? 8 : 0,
        borderRadius: visible ? "12px" : "0px",
      }}
      transition={{ type: "spring", stiffness: 220, damping: 50 }}
      style={{ minWidth: "600px" }}
      className={cn(
        "relative z-[60] mx-auto hidden w-full max-w-7xl flex-row items-center justify-between self-start px-6 py-3 lg:flex",
        !visible && "border-b border-[rgba(34,211,238,0.08)]",
        className
      )}
    >
      {children}
    </motion.div>
  );
};

export const NavItems = ({ items, className }: NavItemsProps) => {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <motion.div
      onMouseLeave={() => setHovered(null)}
      className={cn(
        "absolute inset-0 hidden flex-1 flex-row items-center justify-center space-x-1 lg:flex",
        className
      )}
    >
      {items.map((item, idx) => (
        <a
          key={`link-${idx}`}
          href={item.link}
          onClick={item.onClick}
          onMouseEnter={() => setHovered(idx)}
          className={cn(
            "relative px-4 py-2 text-sm font-medium font-mono tracking-widest transition-colors duration-150",
            item.active
              ? "text-[var(--teal)]"
              : "text-[var(--text-dim)] hover:text-[var(--text)]"
          )}
        >
          {hovered === idx && (
            <motion.div
              layoutId="relay-nav-hover"
              className="absolute inset-0 h-full w-full rounded-md bg-[rgba(34,211,238,0.07)] border border-[rgba(34,211,238,0.15)]"
            />
          )}
          {item.active && (
            <motion.div
              layoutId="relay-nav-active"
              className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-[var(--teal)]"
              style={{ boxShadow: "0 0 6px var(--teal)" }}
            />
          )}
          <span className="relative z-20">{item.name}</span>
        </a>
      ))}
    </motion.div>
  );
};

export const MobileNav = ({ children, className, visible }: MobileNavProps) => {
  return (
    <motion.div
      animate={{
        backdropFilter: visible ? "blur(16px)" : "none",
        background: visible ? "rgba(10,14,23,0.9)" : "rgba(10,14,23,0.7)",
        boxShadow: visible
          ? "0 0 0 1px rgba(34,211,238,0.15), 0 8px 32px rgba(0,0,0,0.4)"
          : "none",
        borderRadius: visible ? "8px" : "0px",
        width: visible ? "calc(100% - 2rem)" : "100%",
        y: visible ? 8 : 0,
      }}
      transition={{ type: "spring", stiffness: 220, damping: 50 }}
      className={cn(
        "relative z-50 mx-auto flex w-full flex-col items-center justify-between px-4 py-2 lg:hidden",
        className
      )}
    >
      {children}
    </motion.div>
  );
};

export const MobileNavHeader = ({
  children,
  className,
}: MobileNavHeaderProps) => {
  return (
    <div
      className={cn(
        "flex w-full flex-row items-center justify-between",
        className
      )}
    >
      {children}
    </div>
  );
};

export const MobileNavMenu = ({
  children,
  className,
  isOpen,
  onClose,
}: MobileNavMenuProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className={cn(
            "absolute inset-x-0 top-14 z-50 flex w-full flex-col items-start gap-3 rounded-lg border border-[rgba(34,211,238,0.15)] bg-[rgba(10,14,23,0.96)] px-4 py-6 shadow-2xl backdrop-blur-xl",
            className
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const MobileNavToggle = ({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) => {
  return isOpen ? (
    <IconX
      className="text-[var(--teal)] cursor-pointer"
      size={22}
      onClick={onClick}
    />
  ) : (
    <IconMenu2
      className="text-[var(--text-dim)] cursor-pointer"
      size={22}
      onClick={onClick}
    />
  );
};

export const NavbarLogo = ({
  username,
  connected,
}: {
  username?: string;
  connected?: boolean;
}) => {
  return (
    <a
      href="#"
      className="relative z-20 mr-4 flex items-center gap-3 px-2 py-1 select-none"
    >
      {/* Animated signal icon */}
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="3"
          fill="var(--violet)"
          style={{ filter: "drop-shadow(0 0 4px var(--violet))" }}
        />
        <circle
          cx="12"
          cy="12"
          r="7"
          stroke="var(--violet)"
          strokeWidth="1"
          strokeOpacity="0.5"
          fill="none"
        />
        <circle
          cx="12"
          cy="12"
          r="11"
          stroke="var(--violet)"
          strokeWidth="0.6"
          strokeOpacity="0.2"
          fill="none"
        />
      </svg>
      <div className="flex flex-col leading-tight">
        <span
          className="font-black tracking-widest text-base"
          style={{ color: "var(--violet)", textShadow: "var(--glow-violet)", fontFamily: "var(--font-display)" }}
        >
          RELAY
        </span>
        {username && (
          <span
            className="text-[9px] tracking-widest font-mono"
            style={{ color: "var(--text-faint)" }}
          >
            {connected ? "● " : "○ "}{username}
          </span>
        )}
      </div>
    </a>
  );
};

export const NavbarButton = ({
  href,
  as: Tag = "a",
  children,
  className,
  variant = "primary",
  ...props
}: {
  href?: string;
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
} & (
  | React.ComponentPropsWithoutRef<"a">
  | React.ComponentPropsWithoutRef<"button">
)) => {
  const variants = {
    primary:
      "bg-[var(--teal)] text-[var(--bg)] font-bold shadow-[var(--glow-teal)] hover:opacity-90",
    secondary:
      "bg-transparent border border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--teal)] hover:text-[var(--teal)]",
    danger:
      "bg-[var(--red)] text-white font-bold shadow-[var(--glow-red)] hover:opacity-90",
    ghost:
      "bg-transparent text-[var(--text-dim)] hover:text-[var(--teal)] hover:bg-[rgba(34,211,238,0.06)]",
  };

  return (
    <Tag
      href={href || undefined}
      className={cn(
        "px-4 py-1.5 rounded-md text-xs font-mono tracking-widest cursor-pointer transition-all duration-150 inline-flex items-center gap-2",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
};
