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
  Menu,
  X,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { useDialogAccessibility } from '@/hooks/useDialogAccessibility';

interface SidebarProps {
  businessPlan?: string;
  userRole?: string;
}

export function Sidebar({ businessPlan = 'lite', userRole = 'staff' }: SidebarProps) {
  const pathname = usePathname();
  const isStandard = businessPlan === 'standard';
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileNavRef = useDialogAccessibility<HTMLElement>(mobileOpen, () => setMobileOpen(false));
  const showLabels = mobileOpen || !collapsed;

  useEffect(() => {
    const stored = localStorage.getItem('woodex_sidebar_collapsed');
    if (stored !== null) {
      setCollapsed(stored === 'true');
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('woodex_sidebar_collapsed', String(next));
  };

  const mainNav = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, managementOnly: true },
    { name: 'Counter', href: '/counter', icon: Store, highlight: true },
    { name: 'Orders', href: '/orders', icon: ShoppingBag },
    { name: 'Billing', href: '/invoices', icon: Receipt },
    { name: 'Quotations', href: '/quotations', icon: FileText },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Payments', href: '/payments', icon: CreditCard },
    { name: 'Delivery', href: '/delivery', icon: Truck },
    { name: 'Expenses', href: '/expenses', icon: CreditCard, managementOnly: true },
    { name: 'Reports', href: '/reports', icon: BarChart3, managementOnly: true },
  ].filter((item) => !item.managementOnly || userRole === 'owner' || userRole === 'manager');

  const standardNav = [
    { name: 'Purchases', href: '/purchases', icon: ShoppingBag, standardOnly: true },
    { name: 'Suppliers', href: '/suppliers', icon: Building2, standardOnly: true },
    { name: 'Inventory', href: '/inventory', icon: Boxes, standardOnly: true },
    { name: 'Staff', href: '/staff', icon: UserCheck, standardOnly: true, ownerOnly: true },
  ].filter((item) => userRole !== 'staff' && (!item.ownerOnly || userRole === 'owner'));

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
        aria-controls="primary-navigation"
        className="md:hidden fixed left-3 top-3 z-40 p-2.5 rounded-xl bg-black text-white shadow-xl no-print"
      >
        <Menu className="w-5 h-5" />
      </button>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/50 no-print"
        />
      )}
      <aside
        ref={mobileNavRef}
        id="primary-navigation"
        role={mobileOpen ? 'dialog' : undefined}
        aria-modal={mobileOpen ? 'true' : undefined}
        aria-label="Primary navigation"
        tabIndex={-1}
        className={`${
          collapsed ? 'md:w-20' : 'md:w-64'
        } w-64 bg-black text-zinc-300 flex flex-col h-screen fixed md:sticky top-0 left-0 border-r border-zinc-900 shadow-2xl transition-all duration-300 ease-in-out no-print shrink-0 z-50 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
      {/* Brand Header & Toggle Button */}
      <div className={`p-4 border-b border-zinc-900 flex items-center ${showLabels ? 'justify-between' : 'justify-center'} gap-3`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center shadow-sm shrink-0 font-black tracking-tighter">
            <span className="text-base font-black">WX</span>
          </div>
          {showLabels && (
            <div className="overflow-hidden whitespace-nowrap">
              <h1 className="font-black text-lg tracking-wider text-white">WOODEX</h1>
              <p className="text-[10px] text-zinc-400 font-bold tracking-widest uppercase">Luxury Atelier & Timber</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? 'Enlarge screen / Expand sidebar' : 'Minimize sidebar (Enlarge screen)'}
          aria-label={collapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'}
          className="hidden md:block p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer shrink-0"
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4 text-white" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
          data-autofocus
          className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          {showLabels && (
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
                    showLabels ? 'gap-3 px-3' : 'justify-center px-0'
                  } py-2.5 rounded-xl text-sm transition group relative ${
                    isActive
                      ? 'bg-white text-black font-bold shadow-sm'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-white font-medium'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {showLabels && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.name}</span>}

                  {/* Floating tooltip in collapsed mode */}
                  {!showLabels && (
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
          {showLabels && (
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Standard Modules
              </span>
              {!isStandard && (
                <span className="text-[10px] bg-zinc-900 text-zinc-300 font-bold px-2 py-0.5 rounded border border-zinc-800 tracking-wider">
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
                    showLabels ? 'justify-between px-3' : 'justify-center px-0'
                  } py-2.5 rounded-xl text-sm transition group relative ${
                    isActive
                      ? 'bg-white text-black font-bold shadow-sm'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-white font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    {showLabels && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.name}</span>}
                  </div>
                  {showLabels && !isStandard && <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />}

                  {/* Floating tooltip in collapsed mode */}
                  {!showLabels && (
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
            showLabels ? 'gap-3 px-3' : 'justify-center px-0'
          } py-2 rounded-xl text-sm font-medium transition ${
            pathname === '/settings'
              ? 'bg-white text-black font-bold'
              : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4 shrink-0" />
          {showLabels && <span>Settings</span>}
        </Link>
        
        {showLabels && (
          <div className="pt-2 border-t border-zinc-900 flex items-center justify-between">
            <StatusBadge status={businessPlan} type="plan" />
          </div>
        )}
      </div>
    </aside>
    </>
  );
}
