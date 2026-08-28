import React from 'react';

interface BadgeProps {
  status: string;
  type?: 'order' | 'payment' | 'delivery' | 'quotation' | 'plan';
}

export function StatusBadge({ status, type = 'order' }: BadgeProps) {
  const normalized = (status || '').toLowerCase();

  let colorClasses = 'bg-zinc-100 text-zinc-800 border-zinc-200';
  let label = status;

  if (type === 'order') {
    switch (normalized) {
      case 'new':
        colorClasses = 'bg-zinc-50 text-zinc-700 border-zinc-200 font-medium';
        label = 'New';
        break;
      case 'confirmed':
        colorClasses = 'bg-zinc-100 text-zinc-900 border-zinc-300 font-semibold';
        label = 'Confirmed';
        break;
      case 'in_progress':
        colorClasses = 'bg-zinc-200 text-zinc-900 border-zinc-400 font-semibold';
        label = 'In Progress';
        break;
      case 'ready':
        colorClasses = 'bg-zinc-900 text-white border-zinc-800 font-bold';
        label = 'Ready';
        break;
      case 'out_for_delivery':
        colorClasses = 'bg-zinc-800 text-white border-zinc-700 font-semibold';
        label = 'Out for Delivery';
        break;
      case 'delivered':
        colorClasses = 'bg-black text-white border-black font-bold shadow-2xs';
        label = 'Delivered';
        break;
    }
  } else if (type === 'payment') {
    switch (normalized) {
      case 'paid':
        colorClasses = 'bg-black text-white border-black font-bold shadow-2xs';
        label = 'Paid';
        break;
      case 'partially_paid':
        colorClasses = 'bg-zinc-100 text-zinc-900 border-zinc-300 font-semibold';
        label = 'Partially Paid';
        break;
      case 'unpaid':
        colorClasses = 'bg-zinc-900 text-zinc-100 border-zinc-700 font-semibold';
        label = 'Unpaid';
        break;
    }
  } else if (type === 'delivery') {
    switch (normalized) {
      case 'pending':
        colorClasses = 'bg-zinc-50 text-zinc-600 border-zinc-200 font-medium';
        label = 'Pending';
        break;
      case 'scheduled':
        colorClasses = 'bg-zinc-100 text-zinc-900 border-zinc-300 font-semibold';
        label = 'Scheduled';
        break;
      case 'out_for_delivery':
        colorClasses = 'bg-zinc-800 text-white border-zinc-700 font-semibold';
        label = 'Out for Delivery';
        break;
      case 'delivered':
        colorClasses = 'bg-black text-white border-black font-bold shadow-2xs';
        label = 'Delivered';
        break;
    }
  } else if (type === 'quotation') {
    switch (normalized) {
      case 'draft':
        colorClasses = 'bg-zinc-50 text-zinc-600 border-zinc-200 font-medium';
        label = 'Draft';
        break;
      case 'sent':
        colorClasses = 'bg-zinc-100 text-zinc-900 border-zinc-300 font-semibold';
        label = 'Sent';
        break;
      case 'accepted':
        colorClasses = 'bg-black text-white border-black font-bold shadow-2xs';
        label = 'Accepted';
        break;
      case 'rejected':
        colorClasses = 'bg-zinc-900 text-zinc-100 border-zinc-700 font-semibold line-through';
        label = 'Rejected';
        break;
    }
  } else if (type === 'plan') {
    if (normalized === 'standard') {
      colorClasses = 'bg-black text-white border-zinc-800 font-bold uppercase tracking-widest text-[10px] shadow-xs';
      label = 'WOODEX Standard';
    } else {
      colorClasses = 'bg-white text-zinc-900 border-zinc-300 font-bold uppercase tracking-widest text-[10px] shadow-2xs';
      label = 'WOODEX Lite';
    }
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border tracking-tight ${colorClasses}`}>
      {label}
    </span>
  );
}
