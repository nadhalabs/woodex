'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Receipt,
  FileText,
  Package,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  Truck,
  Building2,
  Boxes,
  UserCheck,
  Lock,
  Layers,
  Store,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface SidebarProps {
  businessPlan?: string;
}

export function Sidebar({ businessPlan = 'lite' }: SidebarProps) {
  const pathname = usePathname();
  const isStandard = businessPlan === 'standard';
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('woodex_sidebar_collapsed');
    if (stored !== null) {
      setCollapsed(stored === 'true');
    }
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('woodex_sidebar_collapsed', String(next));
  };

  const mainNav = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Counter', href: '/counter', icon: Store, highlight: true },
    { name: 'Orders', href: '/orders', icon: ShoppingBag },
    { name: 'Billing', href: '/invoices', icon: Receipt },
    { name: 'Quotations', href: '/quotations', icon: FileText },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Payments', href: '/payments', icon: CreditCard },
    { name: 'Delivery', href: '/delivery', icon: Truck },
    { name: 'Expenses', href: '/expenses', icon: CreditCard },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
  ];

  const standardNav = [
    { name: 'Purchases', href: '/purchases', icon: ShoppingBag, standardOnly: true },
    { name: 'Suppliers', href: '/suppliers', icon: Building2, standardOnly: true },
    { name: 'Inventory', href: '/inventory', icon: Boxes, standardOnly: true },
    { name: 'Staff', href: '/staff', icon: UserCheck, standardOnly: true },
  ];

  return (
    <aside
      className={`${
        collapsed ? 'w-20' : 'w-64'
      } bg-black text-zinc-300 flex flex-col h-screen sticky top-0 border-r border-zinc-900 shadow-2xl transition-all duration-300 ease-in-out no-print shrink-0 z-40`}
    >
      {/* Brand Header & Toggle Button */}
      <div className={`p-4 border-b border-zinc-900 flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-3`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center shadow-sm shrink-0 font-black tracking-tighter">
            <span className="text-base font-black">WX</span>
          </div>
          {!collapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <h1 className="font-black text-lg tracking-wider text-white">WOODEX</h1>
              <p className="text-[9px] text-zinc-400 font-bold tracking-widest uppercase">Luxury Atelier & Timber</p>
            </div>
          )}
        </div>

        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Enlarge screen / Expand sidebar' : 'Minimize sidebar (Enlarge screen)'}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer shrink-0"
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4 text-white" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          {!collapsed && (
            <div className="px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
              Core Business
            </div>
          )}
          <nav className="space-y-1">
            {mainNav.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'));
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={collapsed ? item.name : undefined}
                  className={`flex items-center ${
                    collapsed ? 'justify-center px-0' : 'gap-3 px-3'
                  } py-2.5 rounded-xl text-sm transition group relative ${
                    isActive
                      ? 'bg-white text-black font-bold shadow-sm'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-white font-medium'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.name}</span>}

                  {/* Floating tooltip in collapsed mode */}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition z-50">
                      {item.name}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          {!collapsed && (
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Standard Modules
              </span>
              {!isStandard && (
                <span className="text-[9px] bg-zinc-900 text-zinc-300 font-bold px-2 py-0.5 rounded border border-zinc-800 tracking-wider">
                  PRO
                </span>
              )}
            </div>
          )}
          <nav className="space-y-1">
            {standardNav.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'));
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={collapsed ? item.name : undefined}
                  className={`flex items-center ${
                    collapsed ? 'justify-center px-0' : 'justify-between px-3'
                  } py-2.5 rounded-xl text-sm transition group relative ${
                    isActive
                      ? 'bg-white text-black font-bold shadow-sm'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-white font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    {!collapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.name}</span>}
                  </div>
                  {!collapsed && !isStandard && <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />}

                  {/* Floating tooltip in collapsed mode */}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition z-50 flex items-center gap-1.5">
                      <span>{item.name}</span>
                      {!isStandard && <Lock className="w-3 h-3 text-zinc-400" />}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Settings & Store info */}
      <div className="p-3 border-t border-zinc-900 bg-black space-y-2">
        <Link
          href="/settings"
          title={collapsed ? 'Settings' : undefined}
          className={`flex items-center ${
            collapsed ? 'justify-center px-0' : 'gap-3 px-3'
          } py-2 rounded-xl text-sm font-medium transition ${
            pathname === '/settings'
              ? 'bg-white text-black font-bold'
              : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
        
        {!collapsed && (
          <div className="pt-2 border-t border-zinc-900 flex items-center justify-between">
            <StatusBadge status={businessPlan} type="plan" />
          </div>
        )}
      </div>
    </aside>
  );
}
