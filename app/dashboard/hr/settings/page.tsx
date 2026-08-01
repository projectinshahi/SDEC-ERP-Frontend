import { PayrollSettingsCard } from '@/components/hr/settings/PayrollSettingsCard';

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-950 dark:text-white">HR Settings</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">Configure policies, department lists, work shifts, and HR rules.</p>
      </div>
      <PayrollSettingsCard />
    </div>
  );
}
