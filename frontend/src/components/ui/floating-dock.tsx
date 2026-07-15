"use client";
/**
 * FloatingDock — vertical variant for Relay's left-side navigation.
 * Renders as a vertical pill on desktop, floating bottom-right FAB on mobile.
 */

import { cn } from "@/lib/utils";
import { IconLayoutNavbarCollapse } from "@tabler/icons-react";
import {
  AnimatePresence,
  MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import { useRef, useState } from "react";

export interface DockItem {
  title: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  badge?: number;
}

export const FloatingDock = ({
  items,
  desktopClassName,
  mobileClassName,
}: {
  items: DockItem[];
  desktopClassName?: string;
  mobileClassName?: string;
}) => {
  return (
    <>
      <FloatingDockDesktop items={items} className={desktopClassName} />
      <FloatingDockMobile items={items} className={mobileClassName} />
    </>
  );
};

// ── Mobile: FAB that expands vertically ──────────────────────────
const FloatingDockMobile = ({
  items,
  className,
}: {
  items: DockItem[];
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn(
        "fixed bottom-20 right-4 z-50 flex flex-col-reverse items-end gap-2 md:hidden",
        className
      )}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            className="flex flex-col-reverse gap-2 mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {items.map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10, transition: { delay: idx * 0.03 } }}
                transition={{ delay: (items.length - 1 - idx) * 0.04 }}
              >
                <DockItemButton item={item} size={40} iconSize={18} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--border)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}
      >
        <IconLayoutNavbarCollapse
          size={22}
          style={{ color: "var(--text-dim)" }}
        />
      </button>
    </div>
  );
};

// ── Desktop: vertical pill on the left ───────────────────────────
const FloatingDockDesktop = ({
  items,
  className,
}: {
  items: DockItem[];
  className?: string;
}) => {
  let mouseY = useMotionValue(Infinity);
  return (
    <motion.div
      onMouseMove={(e) => mouseY.set(e.pageY)}
      onMouseLeave={() => mouseY.set(Infinity)}
      className={cn(
        "fixed left-4 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col items-center gap-3 rounded-2xl px-2 py-3",
        className
      )}
      style={{
        background: "rgba(16,22,34,0.85)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(34,211,238,0.12)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,211,238,0.06)",
      }}
    >
      {items.map((item) => (
        <IconContainer mouseY={mouseY} key={item.title} {...item} />
      ))}
    </motion.div>
  );
};

// ── Shared button for mobile ──────────────────────────────────────
function DockItemButton({
  item,
  size,
  iconSize,
}: {
  item: DockItem;
  size: number;
  iconSize: number;
}) {
  const Tag = item.href ? "a" : "button";
  return (
    <Tag
      href={item.href}
      onClick={item.onClick}
      title={item.title}
      style={{
        width: size,
        height: size,
        background: item.active ? "rgba(34,211,238,0.15)" : "var(--bg-panel)",
        border: `1px solid ${item.active ? "rgba(34,211,238,0.4)" : "var(--border)"}`,
        boxShadow: item.active ? "var(--glow-teal)" : "none",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: item.active ? "var(--teal)" : "var(--text-dim)",
        flexShrink: 0,
      }}
    >
      <div style={{ width: iconSize, height: iconSize }}>{item.icon}</div>
    </Tag>
  );
}

// ── Desktop magnifying icon container ────────────────────────────
function IconContainer({
  mouseY,
  title,
  icon,
  href,
  onClick,
  active,
  badge,
}: DockItem & { mouseY: MotionValue }) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseY, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { y: 0, height: 0 };
    return val - bounds.y - bounds.height / 2;
  });

  const sizeTransform = useTransform(distance, [-120, 0, 120], [40, 58, 40]);
  const iconSizeTransform = useTransform(distance, [-120, 0, 120], [18, 28, 18]);

  const size = useSpring(sizeTransform, { mass: 0.1, stiffness: 160, damping: 12 });
  const iconSize = useSpring(iconSizeTransform, { mass: 0.1, stiffness: 160, damping: 12 });

  const [hovered, setHovered] = useState(false);

  const Tag = href ? "a" : "button";

  return (
    <Tag href={href} onClick={onClick}>
      <motion.div
        ref={ref}
        style={{ width: size, height: size }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative flex items-center justify-center rounded-full cursor-pointer"
        animate={{
          background: active
            ? "rgba(34,211,238,0.15)"
            : "rgba(255,255,255,0.04)",
          borderColor: active ? "rgba(34,211,238,0.5)" : "rgba(255,255,255,0.07)",
          boxShadow: active ? "0 0 10px rgba(34,211,238,0.3)" : "none",
        }}
        style={{
          width: size,
          height: size,
          border: "1px solid",
          borderRadius: "50%",
        }}
      >
        {/* Tooltip */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              className="absolute left-full ml-3 whitespace-pre rounded-md px-2 py-1 text-xs font-mono tracking-widest pointer-events-none"
              style={{
                background: "var(--bg-panel)",
                border: "1px solid var(--border)",
                color: active ? "var(--teal)" : "var(--text-dim)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
              }}
            >
              {title}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Badge */}
        {badge != null && badge > 0 && (
          <span
            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold"
            style={{ background: "var(--teal)", color: "var(--bg)" }}
          >
            {badge > 9 ? "9+" : badge}
          </span>
        )}

        {/* Icon */}
        <motion.div
          style={{
            width: iconSize,
            height: iconSize,
            color: active ? "var(--teal)" : "var(--text-dim)",
          }}
          className="flex items-center justify-center"
        >
          {icon}
        </motion.div>
      </motion.div>
    </Tag>
  );
}
