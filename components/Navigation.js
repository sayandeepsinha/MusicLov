"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Library, ListMusic } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Library", href: "/library", icon: Library },
];

export default function Navigation() {
    const pathname = usePathname();

    return (
        <div className="fixed top-3 sm:top-4 md:top-6 inset-x-0 flex justify-center z-50 pointer-events-none">
            <motion.nav
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="glass px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-full flex items-center gap-1 sm:gap-2 shadow-2xl border-white/10 bg-black/40 backdrop-blur-xl pointer-events-auto"
            >
                {navItems.map((item) => {
                    const isActive = pathname === item.href && (item.href !== "/" || pathname === "/");
                    const Icon = item.icon;

                    return (
                        <Link key={item.name} href={item.href} className="relative group flex items-center">
                            <div
                                className={cn(
                                    "relative z-10 flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full transition-all duration-300",
                                    isActive ? "text-white" : "text-neutral-400 hover:text-white"
                                )}
                            >
                                <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5", isActive && "fill-current")} />
                                <span className="text-xs sm:text-sm font-medium hidden sm:block">{item.name}</span>
                            </div>

                            {isActive && (
                                <motion.div
                                    layoutId="nav-pill"
                                    className="absolute inset-0 bg-white/10 rounded-full"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                        </Link>
                    );
                })}
            </motion.nav>
        </div>
    );
}
