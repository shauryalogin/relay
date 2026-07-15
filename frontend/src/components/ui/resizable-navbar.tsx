"use client";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "motion/react";
import React, { useRef, useState } from "react";

export const Navbar = ({ children, className }) => {
  const ref = useRef(null);
  const { scrollY } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const [visible, setVisible] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setVisible(latest > 40);
  });

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        width: "100%",
      }}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child, { visible })
          : child
      )}
    </motion.div>
  );
};

export const NavBody = ({ children, visible, className }) => {
  return (
    <motion.div
      animate={{
        backdropFilter: visible ? "blur(16px)" : "none",
        boxShadow: visible
          ? "0 0 0 1px rgba(34,211,238,0.15), 0 8px 32px rgba(0,0,0,0.4)"
          : "0 1px 0 rgba(34,211,238,0.08)",
        background: visible ? "rgba(10,14,23,0.92)" : "rgba(10,14,23,0.85)",
        borderRadius: visible ? "12px" : "0px",
      }}
      transition={{ type: "spring", stiffness: 220, damping: 50 }}
      style={{
        position: "relative",
        zIndex: 60,
        margin: visible ? "8px auto 0" : "0 auto",
        width: visible ? "92%" : "100%",
        maxWidth: "1400px",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 24px",
      }}
      className={`relay-nav-desktop ${className || ""}`}
    >
      {children}
    </motion.div>
  );
};

export const NavItems = ({ items }) => {
  const [hovered, setHovered] = useState(null);

  return (
    <div
      onMouseLeave={() => setHovered(null)}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px",
        pointerEvents: "none",
      }}
    >
      {items.map((item, idx) => (
        <a
          key={`nav-${idx}`}
          href={item.link}
          onClick={item.onClick}
          onMouseEnter={() => setHovered(idx)}
          style={{
            position: "relative",
            padding: "8px 16px",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.14em",
            color: item.active ? "var(--teal)" : "var(--text-dim)",
            textDecoration: "none",
            pointerEvents: "auto",
            transition: "color 0.15s ease",
            cursor: "pointer",
          }}
        >
          {hovered === idx && (
            <motion.div
              layoutId="relay-nav-hover"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: "6px",
                background: "rgba(34,211,238,0.07)",
                border: "1px solid rgba(34,211,238,0.15)",
              }}
            />
          )}
          {item.active && (
            <motion.div
              layoutId="relay-nav-active"
              style={{
                position: "absolute",
                bottom: 0,
                left: "50%",
                transform: "translateX(-50%)",
                height: "2px",
                width: "16px",
                borderRadius: "999px",
                background: "var(--teal)",
                boxShadow: "0 0 8px var(--teal)",
              }}
            />
          )}
          <span style={{ position: "relative", zIndex: 2 }}>{item.name}</span>
        </a>
      ))}
    </div>
  );
};

export const MobileNav = ({ children, visible, className }) => {
  return (
    <motion.div
      animate={{
        backdropFilter: visible ? "blur(16px)" : "none",
        background: visible ? "rgba(10,14,23,0.92)" : "rgba(10,14,23,0.85)",
        boxShadow: visible
          ? "0 0 0 1px rgba(34,211,238,0.15), 0 8px 32px rgba(0,0,0,0.4)"
          : "0 1px 0 rgba(34,211,238,0.08)",
        borderRadius: visible ? "8px" : "0px",
      }}
      transition={{ type: "spring", stiffness: 220, damping: 50 }}
      style={{
        position: "relative",
        zIndex: 50,
        margin: visible ? "8px auto 0" : "0 auto",
        width: visible ? "calc(100% - 2rem)" : "100%",
        display: "none",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 16px",
      }}
      className={`relay-nav-mobile ${className || ""}`}
    >
      {children}
    </motion.div>
  );
};

export const MobileNavHeader = ({ children }) => {
  return (
    <div style={{ display: "flex", width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      {children}
    </div>
  );
};

export const MobileNavMenu = ({ children, isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          style={{
            position: "absolute",
            top: "56px",
            left: 0,
            right: 0,
            zIndex: 50,
            display: "flex",
            width: "100%",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "12px",
            borderRadius: "8px",
            border: "1px solid rgba(34,211,238,0.15)",
            background: "rgba(10,14,23,0.97)",
            padding: "20px 16px",
            boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
            backdropFilter: "blur(20px)",
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const MobileNavToggle = ({ isOpen, onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        width: "36px",
        height: "36px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: isOpen ? "var(--teal)" : "var(--text-dim)",
      }}
      aria-label={isOpen ? "Close menu" : "Open menu"}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        {isOpen ? (
          <>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </>
        ) : (
          <>
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </>
        )}
      </svg>
    </button>
  );
};

export const NavbarLogo = ({ username, connected }) => {
  return (
    <div style={{ position: "relative", zIndex: 20, display: "flex", alignItems: "center", gap: "10px", userSelect: "none" }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="3" fill="var(--violet)" style={{ filter: "drop-shadow(0 0 4px var(--violet))" }} />
        <circle cx="12" cy="12" r="7" stroke="var(--violet)" strokeWidth="1" strokeOpacity="0.5" fill="none" />
        <circle cx="12" cy="12" r="11" stroke="var(--violet)" strokeWidth="0.6" strokeOpacity="0.2" fill="none" />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
        <span style={{
          fontFamily: "var(--font-display)", fontWeight: 900, letterSpacing: "0.16em",
          fontSize: "15px", color: "var(--violet)", textShadow: "var(--glow-violet)",
        }}>
          RELAY
        </span>
        {username && (
          <span style={{ fontSize: "9px", letterSpacing: "0.14em", fontFamily: "var(--font-mono)", color: "var(--text-faint)" }}>
            {connected ? "●" : "○"} {username}
          </span>
        )}
      </div>
    </div>
  );
};

export const NavbarButton = ({ as: Tag = "button", children, variant = "primary", className, ...props }) => {
  const variants = {
    primary: { background: "var(--teal)", color: "var(--bg)", fontWeight: "bold", boxShadow: "var(--glow-teal)" },
    secondary: { background: "transparent", border: "1px solid var(--border)", color: "var(--text-dim)" },
    danger: { background: "var(--red)", color: "white", fontWeight: "bold", boxShadow: "var(--glow-red)" },
    ghost: { background: "transparent", color: "var(--text-dim)" },
  };

  return (
    <Tag
      className={className}
      style={{
        padding: "6px 14px",
        borderRadius: "6px",
        fontSize: "11px",
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.1em",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        border: "none",
        transition: "opacity 0.15s ease",
        ...variants[variant],
      }}
      {...props}
    >
      {children}
    </Tag>
  );
};
